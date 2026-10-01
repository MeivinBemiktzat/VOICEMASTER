import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomUUID, scryptSync, randomBytes, timingSafeEqual } from "node:crypto";
import { getJson, putJson, profileKey } from "./lib/storage.js";

const usersKey = "_system/users.json";
const maxImageBytes = 2_000_000;
type UserIndex = Record<string, { userId: string; salt: string; hash: string }>;
type Profile = { userId: string; username: string; createdAt: string; updatedAt: string; avatarDataUrl?: string };

function send(res: VercelResponse, status: number, body: unknown) { return res.status(status).json(body); }
function hashPassword(password: string, salt: string) { return scryptSync(password, salt, 64).toString("hex"); }
function setAuth(res: VercelResponse, userId: string) {
  res.setHeader("Set-Cookie", "vm_auth=" + Buffer.from(JSON.stringify({ userId })).toString("base64url") + "; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000");
}
function clearAuth(res: VercelResponse) { res.setHeader("Set-Cookie", "vm_auth=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0"); }
function getAuth(req: VercelRequest) {
  const raw = String(req.headers.cookie || "").match(/(?:^|;\s*)vm_auth=([^;]+)/)?.[1];
  if (!raw) return null;
  try { const parsed = JSON.parse(Buffer.from(raw, "base64url").toString()); return typeof parsed.userId === "string" ? parsed.userId : null; } catch { return null; }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const action = String(req.query.action || "");
    const users = (await getJson<UserIndex>(usersKey)) || {};

    if (req.method === "POST" && action === "register") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
      const username = String(body.username || "").trim();
      const password = String(body.password || "");
      if (!/^\S{3,40}$/.test(username)) return send(res, 400, { error: "שם המשתמש חייב להכיל 3–40 תווים ללא רווחים" });
      if (password.length < 6) return send(res, 400, { error: "הסיסמה חייבת להכיל לפחות 6 תווים" });
      const normalized = username.toLocaleLowerCase("he-IL");
      if (users[normalized]) return send(res, 409, { error: "שם המשתמש כבר קיים" });
      const userId = randomUUID();
      const salt = randomBytes(16).toString("hex");
      users[normalized] = { userId, salt, hash: hashPassword(password, salt) };
      await putJson(usersKey, users);
      const { updateStats } = await import("./lib/storage.js");
      await updateStats({ users: 1 });
      await putJson(profileKey(userId), { userId, username, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      setAuth(res, userId);
      return send(res, 201, { user: { userId, username } });
    }

    if (req.method === "POST" && action === "login") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
      const username = String(body.username || "").trim();
      const password = String(body.password || "");
      const account = users[username.toLocaleLowerCase("he-IL")];
      if (!account) return send(res, 401, { error: "שם המשתמש או הסיסמה שגויים" });
      const actual = Buffer.from(hashPassword(password, account.salt), "hex");
      const expected = Buffer.from(account.hash, "hex");
      if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return send(res, 401, { error: "שם המשתמש או הסיסמה שגויים" });
      setAuth(res, account.userId);
      const profile = await getJson<Profile>(profileKey(account.userId));
      return send(res, 200, { user: { userId: account.userId, username: profile?.username || username, avatarDataUrl: profile?.avatarDataUrl } });
    }

    if (req.method === "POST" && action === "logout") { clearAuth(res); return send(res, 200, { ok: true }); }

    const userId = getAuth(req);
    if (!userId) return send(res, 401, { error: "יש להתחבר כדי להמשיך" });
    const profile = (await getJson<Profile>(profileKey(userId))) || { userId, username: "", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };

    if (req.method === "GET" && action === "me") return send(res, 200, { user: { userId, username: profile.username, avatarDataUrl: profile.avatarDataUrl } });

    if (req.method === "POST" && action === "avatar") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
      const avatarDataUrl = String(body.avatarDataUrl || "");
      if (!/^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/.test(avatarDataUrl)) return send(res, 400, { error: "תמונת פרופיל לא תקינה" });
      const base64 = avatarDataUrl.split(",", 2)[1] || "";
      if (Buffer.byteLength(base64, "base64") > maxImageBytes) return send(res, 400, { error: "תמונת הפרופיל גדולה מדי (עד 2MB)" });
      const updated = { ...profile, avatarDataUrl, updatedAt: new Date().toISOString() };
      await putJson(profileKey(userId), updated);
      return send(res, 200, { user: { userId, username: updated.username, avatarDataUrl } });
    }

    return send(res, 405, { error: "Method not allowed" });
  } catch (error: any) {
    console.error("[VoiceMaster][auth][ERROR]", error?.stack || error);
    return send(res, 500, { error: error?.message || "Auth error" });
  }
}