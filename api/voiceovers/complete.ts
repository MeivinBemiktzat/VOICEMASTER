import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSession, getJson, key, objectExists, putJson, updateStats } from "../lib/storage.js";
import { randomUUID } from "node:crypto";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const requestId = randomUUID();
  const startedAt = Date.now();
  const log = (message: string, data: Record<string, unknown> = {}) =>
    console.log("[VoiceMaster][complete]", JSON.stringify({ requestId, method: req.method, message, ...data, elapsedMs: Date.now() - startedAt }));
  log("request_start", { url: req.url });

  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
    const sessionId = getSession(req, res);
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const id = String(body.id || "");
    if (!id) return res.status(400).json({ error: "Missing id" });

    const metadataKey = key(sessionId, `voiceovers/${id}/metadata.json`);
    const metadata = await getJson<any>(metadataKey);
    if (!metadata || metadata.status !== "uploading") return res.status(404).json({ error: "Upload not found" });
    const audioExists = await objectExists(metadata.audioKey);
    log("audio_existence_check", { audioKey: metadata.audioKey, audioExists });
    if (!audioExists) return res.status(400).json({ error: "Audio upload was not found" });

    metadata.status = "ready";
    await putJson(metadataKey, metadata);
    log("voiceover_marked_ready", { id, metadataKey, audioKey: metadata.audioKey });

    const characters = typeof metadata.sourceText === "string" ? metadata.sourceText.length : 0;
    await updateStats({ voiceoversCreated: 1, voiceoversToday: 1, totalCharacters: characters });
    return res.status(200).json({ ok: true });
  } catch (error: any) {
    console.error("[VoiceMaster][complete][ERROR]", JSON.stringify({ requestId, method: req.method, url: req.url, message: error?.message, name: error?.name, stack: error?.stack }));
    return res.status(500).json({ error: error?.message || "Storage error" });
  }
}
