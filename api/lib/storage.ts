import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

const endpoint = process.env.HF_S3_ENDPOINT || "https://s3.hf.co";
const namespace = process.env.HF_STORAGE_NAMESPACE;
const bucket = process.env.HF_STORAGE_BUCKET;
const secret = process.env.VOICEMASTER_SESSION_SECRET;
const accessKeyId = process.env.HF_S3_ACCESS_KEY_ID;
const secretAccessKey = process.env.HF_S3_SECRET_ACCESS_KEY;

const missing = [
  ["HF_STORAGE_NAMESPACE", namespace],
  ["HF_STORAGE_BUCKET", bucket],
  ["VOICEMASTER_SESSION_SECRET", secret],
  ["HF_S3_ACCESS_KEY_ID", accessKeyId],
  ["HF_S3_SECRET_ACCESS_KEY", secretAccessKey],
].filter(([, value]) => !value).map(([name]) => name);

if (missing.length) {
  throw new Error(`Missing environment variables: ${missing.join(", ")}`);
}

export const s3 = new S3Client({
  region: process.env.HF_S3_REGION || "us-east-1",
  endpoint: `${endpoint}/${namespace}`,
  forcePathStyle: true,
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
  credentials: { accessKeyId, secretAccessKey },
});

export function signSession(id: string) {
  const sig = createHmac("sha256", secret!).update(id).digest("hex");
  return `${id}.${sig}`;
}

export function verifySession(value: string | undefined) {
  if (!value) return null;
  const [id, sig] = value.split(".");
  if (!id || !sig || !/^[a-f0-9-]{36}$/.test(id) || !/^[a-f0-9]{64}$/.test(sig)) return null;
  const expected = createHmac("sha256", secret!).update(id).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(sig), Buffer.from(expected)) ? id : null;
  } catch {
    return null;
  }
}

export function getSession(req: any, res: any) {
  const cookies = String(req.headers?.cookie || "");
  const match = cookies.match(/(?:^|;\s*)vm_session=([^;]+)/);
  const existing = verifySession(match?.[1]);
  if (existing) return existing;

  const id = randomUUID();
  const token = signSession(id);
  res.setHeader("Set-Cookie", `vm_session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=31536000`);
  return id;
}

export const key = (sessionId: string, suffix: string) => `users/${sessionId}/${suffix}`;
export const statsKey = "_system/stats.json";
export const profileKey = (sessionId: string) => key(sessionId, "profile.json");
export async function requireUser(req: any) {
  const cookies = String(req.headers?.cookie || "");
  const raw = cookies.match(/(?:^|;\\s*)vm_auth=([^;]+)/)?.[1];
  if (!raw) return null;
  try {
    const [payload, sig] = raw.split(".");
    if (!payload || !sig) return null;
    const expected = createHmac("sha256", secret!).update(payload).digest("hex");
    if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (typeof parsed.userId !== "string") return null;
    return await getJson<any>(profileKey(parsed.userId));
  } catch { return null; }
}

export async function putJson(objectKey: string, value: unknown) {
  console.log("[VoiceMaster][storage]", JSON.stringify({ operation: "putJson", key: objectKey }));
  await s3.send(new PutObjectCommand({
    Bucket: bucket!,
    Key: objectKey,
    Body: JSON.stringify(value),
    ContentType: "application/json; charset=utf-8",
  }));
}

export async function getJson<T>(objectKey: string): Promise<T | null> {
  console.log("[VoiceMaster][storage]", JSON.stringify({ operation: "getJson", key: objectKey }));
  try {
    const result = await s3.send(new GetObjectCommand({ Bucket: bucket!, Key: objectKey }));
    const text = await result.Body?.transformToString();
    return text ? JSON.parse(text) as T : null;
  } catch (error: any) {
    if (error?.$metadata?.httpStatusCode === 404 || error?.name === "NoSuchKey" || error?.name === "NotFound") return null;
    throw error;
  }
}

export async function objectExists(objectKey: string) {
  console.log("[VoiceMaster][storage]", JSON.stringify({ operation: "headObject", key: objectKey }));
  try {
    await s3.send(new HeadObjectCommand({ Bucket: bucket!, Key: objectKey }));
    return true;
  } catch {
    return false;
  }
}

export async function signedUpload(objectKey: string, contentType: string) {
  return getSignedUrl(s3, new PutObjectCommand({
    Bucket: bucket!,
    Key: objectKey,
    ContentType: contentType,
  }), { expiresIn: 900 });
}

export async function signedDownload(objectKey: string) {
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket!, Key: objectKey }), { expiresIn: 3600 });
}

export async function removeObject(objectKey: string) {
  console.log("[VoiceMaster][storage]", JSON.stringify({ operation: "deleteObject", key: objectKey }));
  await s3.send(new DeleteObjectCommand({ Bucket: bucket!, Key: objectKey }));
}

export async function listKeys(prefix: string) {
  console.log("[VoiceMaster][storage]", JSON.stringify({ operation: "listObjects", prefix }));
  const result = await s3.send(new ListObjectsV2Command({ Bucket: bucket!, Prefix: prefix }));
  return (result.Contents || []).map((item) => item.Key).filter(Boolean) as string[];
}

export async function ensureProfile(sessionId: string) {
  const existing = await objectExists(profileKey(sessionId));
  if (existing) return false;
  await putJson(profileKey(sessionId), {
    userId: sessionId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  return true;
}

export async function updateStats(delta: Record<string, number>) {
  const current = (await getJson<Record<string, any>>(statsKey)) || {
    users: 0,
    voiceoversCreated: 0,
    voiceoversToday: 0,
    totalCharacters: 0,
    lastUpdated: new Date().toISOString(),
  };
  for (const [name, amount] of Object.entries(delta)) {
    current[name] = Number(current[name] || 0) + amount;
  }
  current.lastUpdated = new Date().toISOString();
  await putJson(statsKey, current);
  return current;
}
