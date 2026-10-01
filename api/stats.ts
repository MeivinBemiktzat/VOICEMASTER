import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getJson, statsKey } from "./_storage";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const stats = await getJson<Record<string, unknown>>(statsKey);
    res.status(200).json(stats || {
      users: 0,
      voiceoversCreated: 0,
      voiceoversToday: 0,
      totalCharacters: 0,
    });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "Storage error" });
  }
}
