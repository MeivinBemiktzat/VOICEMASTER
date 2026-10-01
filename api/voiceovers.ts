import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomUUID } from "node:crypto";
import { getSession, ensureProfile, getJson, key, listKeys, putJson, signedDownload, signedUpload, updateStats } from "./_storage";

function sendError(res: VercelResponse, status: number, message: string) {
  res.status(status).json({ error: message });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const sessionId = getSession(req, res);
    const created = await ensureProfile(sessionId);
    if (created) await updateStats({ users: 1 });

    if (req.method === "GET") {
      const keys = await listKeys(key(sessionId, "voiceovers/"));
      const tracks = [];
      for (const objectKey of keys.filter((k) => k.endsWith("/metadata.json"))) {
        const meta = await getJson<any>(objectKey);
        if (!meta) continue;
        tracks.push({
          id: meta.id,
          title: meta.title,
          voice: meta.voice,
          style: meta.style,
          createdAt: meta.createdAt,
          kind: meta.kind,
          url: await signedDownload(meta.audioKey),
        });
      }
      tracks.sort((a, b) => b.createdAt - a.createdAt);
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
      await putJson(metadataKey, {
        id, title, voice, style, kind, sourceText,
        createdAt: Date.now(), audioKey,
        status: "uploading",
      });
      const uploadUrl = await signedUpload(audioKey, "audio/wav");
      return res.status(201).json({ id, uploadUrl });
    }

    return sendError(res, 405, "Method not allowed");
  } catch (error: any) {
    console.error(error);
    return sendError(res, 500, error?.message || "Storage error");
  }
}
