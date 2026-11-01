import type { ApiCallOptions, SpeakerConfig, VoiceOption } from "./types";
import { prompts } from "./prompts";

/** מודלים: שנו כאן אם Google מחליפה שמות. הערכים זהים לאתר המקורי. */
export const MODEL_TEXT = "gemini-3.5-flash-lite";
export const MODEL_AUDIO = "gemini-3.1-flash-tts-preview";

export function getSelectedTtsModel(): string {
  return selectedModel("voicemaster_tts_model", MODEL_AUDIO);
}

function selectedModel(storageKey: string, fallback: string): string {
  try { return localStorage.getItem(storageKey) || fallback; } catch { return fallback; }
}

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
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function geminiTextCall(prompt: string, opts: ApiCallOptions): Promise<string> {
  const data = await apiCall(selectedModel("voicemaster_text_model", MODEL_TEXT), { contents: [{ parts: [{ text: prompt }] }] }, opts);
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
  const model = getSelectedTtsModel();
  const chunks = splitTextForSpeech(text, 700);
  const segments: Blob[] = [];
  for (const chunk of chunks) {
    const data = await apiCall(
      model,
      {
        contents: [{ parts: [{ text: prompts.narration(styleInstruction, chunk) }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: { voiceConfig: getVoiceConfig(model, voiceName) },
        },
      },
      opts
    );
    segments.push(extractAudio(data));
  }
  return { blob: await joinWavSegments(segments) };
}

/** פודקאסט: שני דוברים, לכל אחד קול משלו. שורות התסריט צריכות להתחיל בשם הדובר. */
export async function geminiPodcastAudioCall(
  script: string,
  styleInstruction: string,
  speakers: [SpeakerConfig, SpeakerConfig],
  opts: ApiCallOptions
): Promise<{ blob: Blob }> {
  const data = await apiCall(
    getSelectedTtsModel(),
    {
      contents: [{ parts: [{ text: prompts.podcastNarration(styleInstruction, script) }] }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          multiSpeakerVoiceConfig: {
            speakerVoiceConfigs: speakers.map((s) => ({
              speaker: s.name,
              voiceConfig: getVoiceConfig(getSelectedTtsModel(), s.voice),
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
  const parts = (data?.candidates || []).flatMap((candidate: any) => candidate?.content?.parts || []);
  const audioParts = parts.filter((part: any) =>
    part?.inlineData?.data && String(part.inlineData.mimeType || "").startsWith("audio/")
  );
  if (!audioParts.length) {
    const reason = data?.candidates?.[0]?.finishReason || "unknown";
    throw new ApiCallError(`No audio returned: ${reason}`, "לא התקבל אודיו מהשירות. נסה שוב.");
  }
  const rate = parseInt(String(audioParts[0].inlineData.mimeType).split("rate=")[1] || "", 10) || 24000;
  const buffers = audioParts.map((part: any) => base64ToBytes(part.inlineData.data));
  const total = buffers.reduce((sum: number, buffer: Uint8Array) => sum + buffer.length, 0);
  const pcm = new Uint8Array(total);
  let offset = 0;
  for (const buffer of buffers) { pcm.set(buffer, offset); offset += buffer.length; }
  return pcmBytesToWav(pcm, rate);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const result = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) result[i] = binary.charCodeAt(i);
  return result;
}

function pcmBytesToWav(pcm: Uint8Array, rate: number): Blob {
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  const write = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
  };
  write(0, "RIFF"); view.setUint32(4, 36 + pcm.length, true);
  write(8, "WAVE"); write(12, "fmt "); view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  write(36, "data"); view.setUint32(40, pcm.length, true);
  return new Blob([header, pcm], { type: "audio/wav" });
}

function splitTextForSpeech(input: string, maxChars: number): string[] {
  let remaining = input.replace(/\r\n/g, "\n").trim();
  const chunks: string[] = [];
  while (remaining.length > maxChars) {
    const part = remaining.slice(0, maxChars + 1);
    let cut = Math.max(
      part.lastIndexOf("\n\n"), part.lastIndexOf("\n"),
      part.lastIndexOf(". "), part.lastIndexOf("! "),
      part.lastIndexOf("? "), part.lastIndexOf("; "), part.lastIndexOf(" ")
    );
    if (cut < maxChars * 0.45) cut = maxChars;
    else if (remaining[cut] === " " || remaining[cut] === "\n") cut += 1;
    const chunk = remaining.slice(0, cut).trim();
    if (chunk) chunks.push(chunk);
    remaining = remaining.slice(cut).trim();
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}

async function joinWavSegments(segments: Blob[]): Promise<Blob> {
  if (!segments.length) throw new ApiCallError("No audio segments", "לא נוצר אודיו.");
  if (segments.length === 1) return segments[0];
  const decoded = await Promise.all(segments.map(async (blob) => {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    if (bytes.length < 44) throw new ApiCallError("Invalid WAV", "התקבל קובץ אודיו לא תקין.");
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (view.getUint16(22, true) !== 1 || view.getUint16(34, true) !== 16)
      throw new ApiCallError("Unsupported WAV encoding", "פורמט האודיו אינו נתמך.");
    return { rate: view.getUint32(24, true), pcm: bytes.slice(44) };
  }));
  if (decoded.some((item) => item.rate !== decoded[0].rate))
    throw new ApiCallError("Sample rate mismatch", "קטעי האודיו התקבלו בקצב שונה.");
  const total = decoded.reduce((sum, item) => sum + item.pcm.length, 0);
  const joined = new Uint8Array(total);
  let offset = 0;
  for (const item of decoded) { joined.set(item.pcm, offset); offset += item.pcm.length; }
  return pcmBytesToWav(joined, decoded[0].rate);
}

/**
 * טוען את ספריית הקולות המורחבת של Google.
 * GET /v1beta/voices מחזיר metadata כולל gender, pitch ותיאור.
 */
export async function fetchGeminiVoiceLibrary(opts: ApiCallOptions): Promise<VoiceOption[]> {
  const keys = [...new Set([opts.currentApiKey, ...opts.savedApiKeys].filter(Boolean))];
  if (!keys.length) throw new ApiCallError("Missing API Key", "לא הוגדר מפתח API.");

  let lastError: Error | null = null;
  for (const key of keys) {
    const collected: any[] = [];
    let pageToken = "";
    try {
      do {
        const params = new URLSearchParams({ page_size: "1000", type: "prebuilt" });
        if (pageToken) params.set("page_token", pageToken);
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/voices?${params.toString()}`,
          { headers: { "x-goog-api-key": key } }
        );
        const data = await response.json();
        if (!response.ok) {
          lastError = new Error(data?.error?.message || `Voice library request failed: ${response.status}`);
          break;
        }
        collected.push(...(data.voices || []));
        pageToken = data.next_page_token || data.nextPageToken || "";
      } while (pageToken);

      if (collected.length) {
        return collected.map((voice) => {
          const id = String(voice.id || voice.name || "").split("/").pop();
          const rawDescription = String(voice.description || "");
          const genderValue = String(voice.gender || "").toLowerCase();
          return {
            id,
            name: hebrewVoiceName(String(voice.display_name || voice.displayName || id)),
            description: hebrewVoiceStyle(rawDescription),
            gender: genderValue === "male" || genderValue === "female" ? genderValue : "neutral",
            pitch: voice.pitch || undefined,
          } satisfies VoiceOption;
        }).filter((voice) => voice.id);
      }
    } catch (error) {
      lastError = error as Error;
    }
  }
  throw new ApiCallError(
    lastError?.message || "Voice library unavailable",
    "לא ניתן לטעון כרגע את ספריית הקולות של Google."
  );
}

const hebrewVoiceNames: Record<string, string> = {
  Fola: "פולה", Bodi: "בודי", Lumi: "לומי", Sola: "סולה",
  Koda: "קודה", Nika: "ניקה", Tavi: "טאבי", Kira: "קירה",
  Ludo: "לודו", Mako: "מאקו", Brio: "בריו", Jori: "ג'ורי",
  Rami: "ראמי", Enzo: "אנזו", Riko: "ריקו", Sami: "סאמי",
  Gero: "ג'רו", Neno: "ננו", Olin: "אולין", Daro: "דארו",
  Hali: "האלי", Arlo: "ארלו", Cleo: "קליאו", Finn: "פין",
  Enya: "אניה", Jett: "ג'ט", Knox: "נוקס", Cruz: "קרוז",
  Elio: "אליו", Tova: "טובה",
  Zephyr: "זפיר", Puck: "פאק", Charon: "קארון", Kore: "קורי",
  Fenrir: "פנריר", Leda: "לדה", Orus: "אורוס", Aoede: "אואדה",
  Callirrhoe: "קלירואה", Autonoe: "אוטונואה", Enceladus: "אנקלדוס",
  Iapetus: "יאפטוס", Umbriel: "אומבריאל", Algieba: "אלג'יבה",
  Despina: "דספינה", Erinome: "ארינומה", Algenib: "אלג'ניב",
  Rasalgethi: "ראסאלגטי", Laomedeia: "לאומדיה", Achernar: "אחרנר",
  Alnilam: "אלנילם", Schedar: "שדר", Gacrux: "גקרוקס",
  Pulcherrima: "פולכרימה", Achird: "אכירד", Zubenelgenubi: "זובנאלגנובי",
  Vindemiatrix: "וינדמיאטריקס", Sadachbia: "סדחביה",
  Sadaltager: "סדלטגר", Sulafat: "סולפאט",
};

function hebrewVoiceName(name: string): string {
  if (hebrewVoiceNames[name]) return hebrewVoiceNames[name];
  const map: Record<string, string> = {
    a: "א", b: "ב", c: "ק", d: "ד", e: "י", f: "פ", g: "ג", h: "ה",
    i: "י", j: "ג'", k: "ק", l: "ל", m: "מ", n: "נ", o: "ו", p: "פ",
    q: "ק", r: "ר", s: "ס", t: "ט", u: "ו", v: "ו", w: "ו", x: "קס",
    y: "י", z: "ז",
  };
  return name.toLowerCase().split("").map((letter) => map[letter] || letter).join("");
}

function hebrewVoiceStyle(description: string): string {
  const value = description.toLowerCase();
  const styles: Array<[string[], string]> = [
    [["quiet", "soft"], "שקט"], [["warm", "velvety"], "חמים"],
    [["gentle", "comforting", "soothing"], "עדין"], [["direct"], "ישיר"],
    [["clear", "crisp", "precise"], "ברור"], [["confident"], "בטוח"],
    [["energetic", "upbeat", "lively"], "נמרץ"], [["cool"], "קריר"],
    [["friendly", "approachable"], "ידידותי"], [["calm", "relaxed"], "רגוע"],
    [["professional", "poised"], "מקצועי"], [["helpful"], "מועיל"],
    [["colorful"], "ססגוני"], [["empathetic"], "אמפתי"],
    [["resonant"], "מהדהד"], [["light"], "קליל"],
  ];
  return styles.find(([words]) => words.some((word) => value.includes(word)))?.[1] || "ייחודי";
}

/** Gemini 3.8 supports the full Voice Library identifier; older TTS models use preset names. */
function getVoiceConfig(model: string, voiceName: string): Record<string, unknown> {
  if (model.startsWith("gemini-3.8-")) return { voice: voiceName };
  return { prebuiltVoiceConfig: { voiceName } };
}
