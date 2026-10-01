import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSession, getJson, key, removeObject } from "../lib/storage.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "DELETE") return res.status(405).json({ error: "Method not allowed" });
    const sessionId = getSession(req, res);
    const id = String(req.query.id || "");
    if (!/^[a-f0-9-]{36}$/.test(id)) return res.status(400).json({ error: "Invalid id" });

    const metadataKey = key(sessionId, `voiceovers/${id}/metadata.json`);
    const metadata = await getJson<any>(metadataKey);
    if (!metadata) return res.status(404).json({ error: "Voiceover not found" });

    await removeObject(metadataKey);
    if (metadata.audioKey) await removeObject(metadata.audioKey);
    return res.status(200).json({ ok: true });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: error?.message || "Storage error" });
  }
}
