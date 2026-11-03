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

/** בקשת GenerateContent מאומתת ל-Gemini. משמשת גם לטקסט וגם ל-TTS הוותיק. */
async function apiCall(model: string, payload: unknown, opts: ApiCallOptions): Promise<any> {
  const keys = [...new Set([opts.currentApiKey, ...opts.savedApiKeys].filter(Boolean))];
  if (!keys.length) throw new ApiCallError("Missing API key", "לא הוגדר מפתח API.");
  let lastError: ApiCallError | null = null;
  for (const key of keys) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": key },
          body: JSON.stringify(payload),
        }
      );
      const data = await response.json();
      if (response.ok) return data;
      lastError = new ApiCallError(
        data?.error?.message || `Gemini request failed: ${response.status}`,
        getHebrewApiError(response.status, data?.error?.message),
        response.status
      );
      if (response.status !== 429 && response.status < 500) throw lastError;
    } catch (error) {
      if (error instanceof ApiCallError) throw error;
      lastError = new ApiCallError(String((error as Error)?.message || error), "שגיאה בתקשורת עם Gemini.");
    }
  }
  throw lastError || new ApiCallError("Gemini request failed", "לא ניתן ליצור קריינות כרגע.");
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
  const chunks = splitTextForSpeech(text, 180);
  const audio: Blob[] = [];
  for (const chunk of chunks) {
    if (model.startsWith("gemini-3.8-")) {
      audio.push(await gemini38SingleSpeaker(chunk, styleInstruction, voiceName, model, opts));
    } else {
      const data = await apiCall(model, {
        contents: [{ parts: [{ text: prompts.narration(styleInstruction, chunk) }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
        },
      }, opts);
      const segment = extractAudio(data);
      console.info("[VoiceMaster][TTS]", JSON.stringify({
        model,
        chunk: audio.length + 1,
        totalChunks: chunks.length,
        inputCharacters: chunk.length,
        audioBytes: segment.size,
        finishReason: data?.candidates?.[0]?.finishReason || "unknown",
      }));
      audio.push(segment);
    }
  }
  const blob = await joinWavSegments(audio);
  console.info("[VoiceMaster][TTS]", JSON.stringify({
    model,
    totalChunks: chunks.length,
    inputCharacters: text.length,
    finalAudioBytes: blob.size,
  }));
  return { blob };
}

/** פודקאסט: שני דוברים, לכל אחד קול משלו. שורות התסריט צריכות להתחיל בשם הדובר. */
export async function geminiPodcastAudioCall(
  script: string,
  styleInstruction: string,
  speakers: [SpeakerConfig, SpeakerConfig],
  opts: ApiCallOptions
): Promise<{ blob: Blob }> {
  const model = getSelectedTtsModel();
  if (model.startsWith("gemini-3.8-")) {
    const turns = parsePodcastTurns(script, speakers, 1400);
    const data = await interactionsCall(model, {
      model,
      input: [{
        type: "user_input",
        content: turns.map((turn) => ({
          type: "text",
          text: turn.text,
          annotations: [{
            type: "speech_metadata",
            speaker: turn.speaker,
            style: styleInstruction,
          }],
        })),
      }],
      response_format: { type: "audio" },
      generation_config: {
        speech_config: {
          mode: "conversational",
          speakers: speakers.map((speaker) => ({ speaker: speaker.name, voice: speaker.voice })),
        },
      },
    }, opts);
    return { blob: extractInteractionWav(data) };
  }

  const data = await apiCall(model, {
    contents: [{ parts: [{ text: prompts.podcastNarration(styleInstruction, script) }] }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        multiSpeakerVoiceConfig: {
          speakerVoiceConfigs: speakers.map((speaker) => ({
            speaker: speaker.name,
            voiceConfig: { prebuiltVoiceConfig: { voiceName: speaker.voice } },
          })),
        },
      },
    },
  }, opts);
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
  const mime = String(audioParts[0].inlineData.mimeType || "");
  const bytes = concatBytes(audioParts.map((part: any) => base64ToBytes(part.inlineData.data)));
  if (mime.toLowerCase().includes("wav") || hasWavHeader(bytes)) {
    return new Blob([bytes], { type: "audio/wav" });
  }
  const rate = parseInt(mime.split("rate=")[1] || "", 10) || 24000;
  return pcmBytesToWav(bytes, rate);
}

function extractInteractionWav(data: any): Blob {
  const steps = Array.isArray(data?.steps) ? data.steps : [];
  const audioItems = steps
    .filter((step: any) => step?.type === "model_output" || step?.type === "output")
    .flatMap((step: any) => step?.content || [])
    .filter((item: any) => item?.type === "audio" && item?.data);
  const convenienceAudio = data?.output_audio;
  const encodedBlocks = audioItems.length
    ? audioItems.map((item: any) => item.data)
    : convenienceAudio?.data ? [convenienceAudio.data] : [];

  console.info("[VoiceMaster][TTS][response]", JSON.stringify({
    id: data?.id || null,
    status: data?.status || null,
    stepTypes: steps.map((step: any) => step?.type || "unknown"),
    audioBlocks: encodedBlocks.length,
    audioBase64Characters: encodedBlocks.reduce((sum: number, value: string) => sum + value.length, 0),
    mimeType: convenienceAudio?.mime_type || audioItems[0]?.mime_type || null,
    responseKeys: Object.keys(data || {}),
  }));

  if (!encodedBlocks.length) {
    throw new ApiCallError(
      `No interaction audio returned (status: ${data?.status || "unknown"})`,
      "Google לא החזירה אודיו. נסה שוב ובדוק את מצב הבקשה."
    );
  }

  const blocks = encodedBlocks.map((encoded: string) => base64ToBytes(encoded));
  if (blocks.length === 1) {
    const only = blocks[0];
    if (hasWavHeader(only)) return new Blob([only], { type: "audio/wav" });
    return pcmBytesToWav(only, 24000);
  }

  const allWav = blocks.every((bytes: Uint8Array) => hasWavHeader(bytes));
  if (allWav) {
    const pcmBlocks = blocks.map((bytes: Uint8Array) => bytes.slice(44));
    return pcmBytesToWav(concatBytes(pcmBlocks), 24000);
  }
  return pcmBytesToWav(concatBytes(blocks), 24000);
}

function hasWavHeader(bytes: Uint8Array): boolean {
  return bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WAVE";
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const result = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) result[i] = binary.charCodeAt(i);
  return result;
}

function pcmBytesToWav(pcm: Uint8Array, rate: number, channels = 1, bits = 16): Blob {
  const bytesPerSample = bits / 8;
  const blockAlign = channels * bytesPerSample;
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  const write = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
  };
  write(0, "RIFF"); view.setUint32(4, 36 + pcm.length, true);
  write(8, "WAVE"); write(12, "fmt "); view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); view.setUint16(22, channels, true);
  view.setUint32(24, rate, true); view.setUint32(28, rate * blockAlign, true);
  view.setUint16(32, blockAlign, true); view.setUint16(34, bits, true);
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

  // Gemini may return WAV files with extra chunks before/after the audio data.
  // Never assume a fixed 44-byte header: locate the actual "data" chunk and
  // preserve the original PCM format when joining the segments.
  const decoded = await Promise.all(segments.map(async (blob) => {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    if (!hasWavHeader(bytes)) {
      throw new ApiCallError("TTS segment is not a valid WAV file", "Google החזירה קטע אודיו בפורמט לא תקין.");
    }
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let offset = 12;
    let format: { audioFormat: number; channels: number; rate: number; bits: number } | null = null;
    let pcm: Uint8Array | null = null;
    while (offset + 8 <= bytes.length) {
      const id = String.fromCharCode(...bytes.slice(offset, offset + 4));
      const size = view.getUint32(offset + 4, true);
      const body = offset + 8;
      if (body + size > bytes.length) break;
      if (id === "fmt " && size >= 16) {
        format = {
          audioFormat: view.getUint16(body, true),
          channels: view.getUint16(body + 2, true),
          rate: view.getUint32(body + 4, true),
          bits: view.getUint16(body + 14, true),
        };
      } else if (id === "data") {
        pcm = bytes.slice(body, body + size);
      }
      offset = body + size + (size % 2);
    }
    if (!format || !pcm || format.audioFormat !== 1 || !format.channels || !format.rate || ![8, 16, 24, 32].includes(format.bits)) {
      throw new ApiCallError("Unsupported WAV encoding", "פורמט האודיו שהתקבל מ-Google אינו נתמך.");
    }
    return { ...format, pcm };
  }));

  const first = decoded[0];
  if (decoded.some((item) =>
    item.audioFormat !== first.audioFormat ||
    item.channels !== first.channels ||
    item.rate !== first.rate ||
    item.bits !== first.bits
  )) {
    throw new ApiCallError("WAV format mismatch between segments", "קטעי הקריינות התקבלו בפורמטים שונים ולא ניתן לחבר אותם בבטחה.");
  }
  const joined = concatBytes(decoded.map((item) => item.pcm));
  return pcmBytesToWav(joined, first.rate, first.channels, first.bits);
}

async function interactionsCall(model: string, payload: unknown, opts: ApiCallOptions): Promise<any> {
  const keys = [...new Set([opts.currentApiKey, ...opts.savedApiKeys].filter(Boolean))];
  let lastError: ApiCallError | null = null;
  for (const key of keys) {
    try {
      const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify(payload),
      });
      let data = await response.json();
      if (!response.ok) {
        lastError = new ApiCallError(data?.error?.message || "Interactions API failed", getHebrewApiError(response.status, data?.error?.message), response.status);
        if (response.status !== 429 && response.status < 500) throw lastError;
        continue;
      }

      // אם Google מחזירה Interaction שעדיין רץ, ממתינים לתוצאה הסופית
      // במקום לשמור את בלוק האודיו החלקי שהגיע בתשובת הביניים.
      const id = data?.id;
      for (let attempt = 0; id && ["in_progress", "running", "pending"].includes(String(data?.status || "").toLowerCase()) && attempt < 90; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const poll = await fetch(`https://generativelanguage.googleapis.com/v1beta/interactions/${encodeURIComponent(id)}`, {
          headers: { "x-goog-api-key": key },
        });
        data = await poll.json();
        if (!poll.ok) throw new ApiCallError(data?.error?.message || "Interactions polling failed", getHebrewApiError(poll.status, data?.error?.message), poll.status);
      }
      if (["in_progress", "running", "pending"].includes(String(data?.status || "").toLowerCase())) {
        throw new ApiCallError("TTS interaction timed out", "יצירת הקריינות עדיין לא הסתיימה. נסה שוב.");
      }
      if (["failed", "cancelled"].includes(String(data?.status || "").toLowerCase())) {
        throw new ApiCallError(data?.error?.message || "TTS interaction failed", "Google לא הצליחה להשלים את יצירת הקריינות.");
      }
      return data;
    } catch (error) {
      if (error instanceof ApiCallError) throw error;
      lastError = new ApiCallError((error as Error).message, "שגיאה ביצירת הקריינות דרך Gemini.");
    }
  }
  throw lastError || new ApiCallError("No API key", "לא הוגדר מפתח API.");
}

async function gemini38SingleSpeaker(
  text: string, style: string, voice: string, model: string, opts: ApiCallOptions
): Promise<Blob> {
  const data = await interactionsCall(model, {
    model,
    input: [{
      type: "user_input",
      content: [{
        type: "text",
        text,
        annotations: [{ type: "speech_metadata", style }],
      }],
    }],
    response_format: { type: "audio" },
    generation_config: { speech_config: [{ voice }] },
  }, opts);
  // כל בקשה קצרה ומוגבלת כדי למנוע מהמודל להחזיר אודיו חלקי
  // בטקסטים ארוכים. האיחוד מתבצע ב-geminiAudioCall.
  return extractInteractionWav(data);
}

function parsePodcastTurns(
  script: string, speakers: [SpeakerConfig, SpeakerConfig], maxChars: number
): Array<{ speaker: string; text: string }> {
  const names = speakers.map((speaker) => speaker.name);
  const turns: Array<{ speaker: string; text: string }> = [];
  for (const rawLine of script.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const match = line.match(/^([^:：]{1,50})[:：]\s*(.*)$/);
    const speaker = match && names.includes(match[1].trim()) ? match[1].trim() : names[0];
    const text = match ? match[2].trim() : line;
    if (!text) continue;
    for (const chunk of splitTextForSpeech(text, maxChars)) turns.push({ speaker, text: chunk });
  }
  return turns;
}

function concatBytes(chunks: Uint8Array[]): Uint8Array {
  const output = new Uint8Array(chunks.reduce((sum, chunk) => sum + chunk.length, 0));
  let offset = 0;
  for (const chunk of chunks) { output.set(chunk, offset); offset += chunk.length; }
  return output;
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
