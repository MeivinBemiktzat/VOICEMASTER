import type { VercelRequest, VercelResponse } from "@vercel/node";
export default function handler(_req: VercelRequest, res: VercelResponse) {
  return res.status(410).json({ error: "Voiceover files are stored locally in the browser. This server endpoint is disabled." });
}