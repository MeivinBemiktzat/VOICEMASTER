import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSession, getJson, key, objectExists, putJson, updateStats } from "../lib/storage.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
    const sessionId = getSession(req, res);
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const id = String(body.id || "");
    if (!id) return res.status(400).json({ error: "Missing id" });

    const metadataKey = key(sessionId, `voiceovers/${id}/metadata.json`);
    const metadata = await getJson<any>(metadataKey);
    if (!metadata || metadata.status !== "uploading") return res.status(404).json({ error: "Upload not found" });
    if (!(await objectExists(metadata.audioKey))) return res.status(400).json({ error: "Audio upload was not found" });

    metadata.status = "ready";
    await putJson(metadataKey, metadata);

    const characters = typeof metadata.sourceText === "string" ? metadata.sourceText.length : 0;
    await updateStats({ voiceoversCreated: 1, voiceoversToday: 1, totalCharacters: characters });
    return res.status(200).json({ ok: true });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: error?.message || "Storage error" });
  }
}
