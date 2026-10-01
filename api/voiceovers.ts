import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomUUID } from "node:crypto";
import { requireUser, updateStats } from "./lib/storage.js";

function sendError(res: VercelResponse, status: number, message: string) {
  res.status(status).json({ error: message });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const requestId = randomUUID();
  const startedAt = Date.now();
  const log = (message: string, data: Record<string, unknown> = {}) =>
    console.log("[VoiceMaster][voiceovers]", JSON.stringify({
      requestId, method: req.method, message, ...data, elapsedMs: Date.now() - startedAt
    }));
  log("request_start", { url: req.url });

  try {
    const user = await requireUser(req);
    if (!user) return sendError(res, 401, "יש להתחבר כדי ליצור קריינות");

    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
      const sourceText = typeof body.sourceText === "string" ? body.sourceText : "";
      const chars = sourceText.length;
      log("voiceover_authorized", { userId: user.userId, username: user.username, characters: chars });
      await updateStats({ voiceoversCreated: 1, totalCharacters: chars });
      return res.status(200).json({ ok: true, user: { userId: user.userId, username: user.username } });
    }

    return sendError(res, 405, "Method not allowed");
  } catch (error: any) {
    console.error("[VoiceMaster][voiceovers][ERROR]", JSON.stringify({ requestId, method: req.method, url: req.url, message: error?.message, name: error?.name, stack: error?.stack }));
    return sendError(res, 500, error?.message || "Storage error");
  }
}
