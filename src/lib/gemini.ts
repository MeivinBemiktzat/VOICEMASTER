import type { ApiCallOptions, SpeakerConfig } from "./types";
import { prompts } from "./prompts";

/** מודלים: שנו כאן אם Google מחליפה שמות. הערכים זהים לאתר המקורי. */
export const MODEL_TEXT = "gemini-3.5-flash-lite";
export const MODEL_AUDIO = "gemini-3.1-flash-tts-preview";

const apiKeyCooldowns = new Map<string, number>();

export class ApiCallError extends Error {
  status?: number;
  userMessage: string;
  constructor(message: string, userMessage: string, status?: number) {
    super(message);
    this.userMessage = userMessage;
    this.status = status;
  }
}

export function getHebrewApiError(status?: number, serverMessage = ""): string {
  if (status === 400) return "הבקשה אינה תקינה. בדוק את הטקסט או את הגדרות הקריינות.";
  if (status === 401 || status === 403) return "מפתח ה-API אינו תקין או שאין לו הרשאה.";
  if (status === 404) return "השירות או המודל המבוקש אינם זמינים כרגע.";
  if (status === 429) return "המפתח הגיע למגבלת השימוש. המערכת תנסה מפתח אחר אם קיים.";
  if (status && status >= 500) return "שירות Gemini אינו זמין כרגע. נסה שוב מאוחר יותר.";
  if (!serverMessage) return "אירעה שגיאה בתקשורת עם Gemini.";
  return "אירעה שגיאה בתקשורת עם Gemini. בדוק את המפתח ואת החיבור לאינטרנט.";
}

/** מנקה סימוני Markdown, כוכביות, מספור וכו' מתשובות המודל */
export function cleanGeneratedText(text: string): string {
  return String(text || "")
    .replace(/^[\s`*_#>-]+/gm, "")
    .replace(/[*#`]/g, "")
    .replace(/^\s*\d+[.)]\s*/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function geminiTextCall(prompt: string, opts: ApiCallOptions): Promise<string> {
  const data = await apiCall(MODEL_TEXT, { contents: [{ parts: [{ text: prompt }] }] }, opts);
  const result = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  return cleanGeneratedText(result || "");
}

/** קריינות רגילה: קול אחד */
export async function geminiAudioCall(
  text: string,
  styleInstruction: string,
  voiceName: string,
  opts: ApiCallOptions
): Promise<{ blob: Blob }> {
  const data = await apiCall(
    MODEL_AUDIO,
    {
      contents: [{ parts: [{ text: prompts.narration(styleInstruction, text) }] }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
      },
    },
    opts
  );
  return { blob: extractAudio(data) };
}

/** פודקאסט: שני דוברים, לכל אחד קול משלו. שורות התסריט צריכות להתחיל בשם הדובר. */
export async function geminiPodcastAudioCall(
  script: string,
  styleInstruction: string,
  speakers: [SpeakerConfig, SpeakerConfig],
  opts: ApiCallOptions
): Promise<{ blob: Blob }> {
  const data = await apiCall(
    MODEL_AUDIO,
    {
      contents: [{ parts: [{ text: prompts.podcastNarration(styleInstruction, script) }] }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          multiSpeakerVoiceConfig: {
            speakerVoiceConfigs: speakers.map((s) => ({
              speaker: s.name,
              voiceConfig: { prebuiltVoiceConfig: { voiceName: s.voice } },
            })),
          },
        },
      },
    },
    opts
  );
  return { blob: extractAudio(data) };
}

function extractAudio(data: any): Blob {
  const part = data?.candidates?.[0]?.content?.parts?.[0];
  const pcmData: string | undefined = part?.inlineData?.data;
  const mimeType: string = part?.inlineData?.mimeType || "";
  const sampleRate = parseInt(mimeType.split("rate=")[1] || "", 10) || 24000;
  if (!pcmData) {
    throw new ApiCallError("No audio returned", "לא התקבל קול מהשירות. נסה שוב.");
  }
  return pcmToWav(pcmData, sampleRate);
}

/**
 * קריאה ל-API עם סבב מפתחות: מנסה את המפתח הפעיל, ואם הוא חסום/מוגבל עובר לבא.
 * 429 = המתנה של 30 שניות למפתח, 401/403 = המתנה של 5 דקות.
 */
async function apiCall(
  model: string,
  payload: unknown,
  { currentApiKey, savedApiKeys }: ApiCallOptions
): Promise<any> {
  if (!currentApiKey) {
    throw new ApiCallError("Missing API Key", "לא הוגדר מפתח API.");
  }

  const availableKeys = savedApiKeys.length ? [...savedApiKeys] : [currentApiKey];
  const orderedKeys = [currentApiKey, ...availableKeys.filter((key) => key !== currentApiKey)];
  let lastError: ApiCallError | null = null;

  for (const key of orderedKeys) {
    const cooldownUntil = apiKeyCooldowns.get(key) || 0;
    if (cooldownUntil > Date.now()) continue;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (response.ok) return data;

      const userMessage = getHebrewApiError(response.status, data?.error?.message);
      lastError = new ApiCallError(data?.error?.message || "API request failed", userMessage, response.status);

      if (response.status === 429) {
        apiKeyCooldowns.set(key, Date.now() + 30000);
      } else if (response.status === 401 || response.status === 403) {
        apiKeyCooldowns.set(key, Date.now() + 300000);
      } else {
        throw lastError;
      }
    } catch (error) {
      if (error instanceof ApiCallError) throw error;
      const err = error as Error;
      const userMessage =
        err.name === "TypeError"
          ? "אין חיבור לאינטרנט או שהדפדפן חסם את הבקשה."
          : getHebrewApiError(undefined, err.message);
      lastError = new ApiCallError(err.message, userMessage);
    }
  }

  if (lastError) throw lastError;
  throw new ApiCallError("All API keys are cooling down", "כל מפתחות ה-API בהמתנה זמנית. נסה שוב בעוד חצי דקה.");
}

/** ממיר PCM גולמי (base64) לקובץ WAV שאפשר לנגן ולהוריד */
function pcmToWav(base64: string, rate: number): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  const header = new ArrayBuffer(44);
  const v = new DataView(header);
  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) v.setUint8(offset + i, str.charCodeAt(i));
  };

  writeStr(0, "RIFF");
  v.setUint32(4, 36 + bytes.length, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  writeStr(36, "data");
  v.setUint32(40, bytes.length, true);

  return new Blob([header, bytes], { type: "audio/wav" });
}
