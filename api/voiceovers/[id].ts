import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomUUID } from "node:crypto";
import { getSession, getJson, key, removeObject, s3 } from "../lib/storage.js";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";

export const config = { api: { bodyParser: false } };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const requestId = randomUUID();
  const startedAt = Date.now();
  const log = (message: string, data: Record<string, unknown> = {}) =>
    console.log("[VoiceMaster][voiceover-id]", JSON.stringify({
      requestId, method: req.method, id: req.query.id, message, ...data, elapsedMs: Date.now() - startedAt
    }));
  log("request_start", { url: req.url, contentLength: req.headers["content-length"], contentType: req.headers["content-type"] });

  try {
    if (req.method === "POST" || req.method === "PUT") {
      log("upload_start");
      const sessionId = getSession(req, res);
      const id = String(req.query.id || "");
      if (!/^[a-f0-9-]{36}$/.test(id)) return res.status(400).json({ error: "Invalid id" });
      const metadataKey = key(sessionId, `voiceovers/${id}/metadata.json`);
      const metadata = await getJson<any>(metadataKey);
      if (!metadata || metadata.status !== "uploading") return res.status(404).json({ error: "Upload not found" });

      log("upload_to_storage_start", { audioKey: metadata.audioKey });
      await s3.send(new PutObjectCommand({
        Bucket: process.env.HF_STORAGE_BUCKET!,
        Key: metadata.audioKey,
        Body: req,
        ContentType: String(req.headers["content-type"] || "audio/wav"),
        ...(req.headers["content-length"] ? { ContentLength: Number(req.headers["content-length"]) } : {}),
      }));
      log("upload_to_storage_complete", { audioKey: metadata.audioKey });
      return res.status(200).json({ ok: true });
    }

    if (req.method === "GET") {
      log("playback_start", { download: req.query.download, range: req.headers.range });
      const sessionId = getSession(req, res);
      const id = String(req.query.id || "");
      if (!/^[a-f0-9-]{36}$/.test(id)) return res.status(400).json({ error: "Invalid id" });
      const metadata = await getJson<any>(key(sessionId, `voiceovers/${id}/metadata.json`));
      if (!metadata || metadata.status !== "ready") return res.status(404).json({ error: "Voiceover not found" });

      const range = String(req.headers.range || "");
      const result = await s3.send(new GetObjectCommand({
        Bucket: process.env.HF_STORAGE_BUCKET!,
        Key: metadata.audioKey,
        ...(range ? { Range: range } : {}),
      }));
      if (!result.Body) { log("audio_missing_in_storage", { audioKey: metadata.audioKey }); return res.status(404).json({ error: "Audio not found" }); }

      res.statusCode = range && result.ContentRange ? 206 : 200;
      res.setHeader("Accept-Ranges", "bytes");
      res.setHeader("Content-Type", result.ContentType || "audio/wav");
      if (result.ContentRange) res.setHeader("Content-Range", result.ContentRange);
      if (result.ContentLength != null) res.setHeader("Content-Length", String(result.ContentLength));
      log("playback_stream_start", { audioKey: metadata.audioKey, contentLength: result.ContentLength, contentRange: result.ContentRange });
      return result.Body.pipe(res);
    }

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
    console.error("[VoiceMaster][voiceover-id][ERROR]", JSON.stringify({ requestId, method: req.method, id: req.query.id, url: req.url, message: error?.message, name: error?.name, stack: error?.stack }));
    return res.status(500).json({ error: error?.message || "Storage error" });
  }
}
