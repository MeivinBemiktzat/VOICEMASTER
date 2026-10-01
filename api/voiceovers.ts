import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomUUID } from "node:crypto";
import { getSession, ensureProfile, getJson, key, listKeys, putJson, updateStats } from "./lib/storage.js";

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
    const sessionId = getSession(req, res);
    log("session_resolved", { sessionIdPrefix: sessionId.slice(0, 8) });
    const created = await ensureProfile(sessionId);
    if (created) { log("new_profile_created"); await updateStats({ users: 1 }); }

    if (req.method === "GET") {
      const keys = await listKeys(key(sessionId, "voiceovers/"));
      const tracks = [];
      for (const objectKey of keys.filter((k) => k.endsWith("/metadata.json"))) {
        const meta = await getJson<any>(objectKey);
        if (!meta || meta.status !== "ready") continue;
        tracks.push({
          id: meta.id,
          title: meta.title,
          voice: meta.voice,
          style: meta.style,
          createdAt: meta.createdAt,
          kind: meta.kind,
          url: `/api/voiceovers/${meta.id}`,
        });
      }
      tracks.sort((a, b) => b.createdAt - a.createdAt);
      log("history_loaded", { count: tracks.length });
      return res.status(200).json({ tracks });
    }

    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
      const title = String(body.title || "").trim();
      const voice = String(body.voice || "").trim();
      const style = String(body.style || "").trim();
      const kind = body.kind === "podcast" ? "podcast" : "narration";
      const sourceText = typeof body.sourceText === "string" ? body.sourceText.slice(0, 20000) : undefined;
      if (!title || !voice || !style) return sendError(res, 400, "Missing track metadata");

      const id = randomUUID();
      const audioKey = key(sessionId, `voiceovers/${id}/audio.wav`);
      const metadataKey = key(sessionId, `voiceovers/${id}/metadata.json`);
      log("creating_voiceover", { id, audioKey, metadataKey, title, voice, style, kind, sourceTextLength: sourceText?.length || 0 });
      await putJson(metadataKey, {
        id, title, voice, style, kind, sourceText,
        createdAt: Date.now(), audioKey,
        status: "uploading",
      });
      log("voiceover_initialized", { id, metadataKey });
      return res.status(201).json({ id });
    }

    return sendError(res, 405, "Method not allowed");
  } catch (error: any) {
    console.error("[VoiceMaster][voiceovers][ERROR]", JSON.stringify({ requestId, method: req.method, url: req.url, message: error?.message, name: error?.name, stack: error?.stack }));
    return sendError(res, 500, error?.message || "Storage error");
  }
}
