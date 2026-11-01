import type { VoiceOption, StyleOption } from "./types";

/**
 * הקולות המובנים של Gemini TTS לפי התיעוד הרשמי של Google.
 * שני מודלי Gemini 3.8 TTS חולקים את אותה ספריית קולות.
 * הערך id נשלח ל-API; name ו-description מיועדים לתצוגה בעברית.
 */
export const voiceCatalog: VoiceOption[] = [
  { id: "Zephyr", name: "משה", description: "בהיר", gender: "male" },
  { id: "Puck", name: "אהרון", description: "נמרץ", gender: "male" },
  { id: "Charon", name: "דן", description: "אינפורמטיבי", gender: "male" },
  { id: "Kore", name: "יוסף", description: "תקיף", gender: "male" },
  { id: "Fenrir", name: "איתן", description: "נלהב", gender: "male" },
  { id: "Leda", name: "נועה", description: "צעיר", gender: "female" },
  { id: "Orus", name: "אורי", description: "תקיף", gender: "male" },
  { id: "Aoede", name: "מיכל", description: "קליל", gender: "female" },
  { id: "Callirrhoe", name: "יעל", description: "נינוח", gender: "female" },
  { id: "Autonoe", name: "תמר", description: "בהיר", gender: "female" },
  { id: "Enceladus", name: "אליהו", description: "נושם", gender: "male" },
  { id: "Iapetus", name: "שמואל", description: "ברור", gender: "male" },
  { id: "Umbriel", name: "רחל", description: "נינוח", gender: "female" },
  { id: "Algieba", name: "דוד", description: "חלק", gender: "male" },
  { id: "Despina", name: "שרה", description: "חלק", gender: "female" },
  { id: "Erinome", name: "אביגיל", description: "ברור", gender: "female" },
  { id: "Algenib", name: "יצחק", description: "מחוספס", gender: "male" },
  { id: "Rasalgethi", name: "בנימין", description: "אינפורמטיבי", gender: "male" },
  { id: "Laomedeia", name: "שירה", description: "נמרץ", gender: "female" },
  { id: "Achernar", name: "לאה", description: "רך", gender: "female" },
  { id: "Alnilam", name: "שלמה", description: "תקיף", gender: "male" },
  { id: "Schedar", name: "מרים", description: "מאוזן", gender: "female" },
  { id: "Gacrux", name: "יהודה", description: "בוגר", gender: "male" },
  { id: "Pulcherrima", name: "אסתר", description: "החלטי", gender: "female" },
  { id: "Achird", name: "נחום", description: "ידידותי", gender: "male" },
  { id: "Zubenelgenubi", name: "רבקה", description: "אגבי", gender: "female" },
  { id: "Vindemiatrix", name: "חנה", description: "עדין", gender: "female" },
  { id: "Sadachbia", name: "יונתן", description: "תוסס", gender: "male" },
  { id: "Sadaltager", name: "גדעון", description: "מלומד", gender: "male" },
  { id: "Sulafat", name: "דבורה", description: "חמים", gender: "female" },
];

/** הקטלוג הרשמי זהה לשני מודלי Gemini 3.8 TTS ולמודלי TTS קודמים המתועדים. */
export const voicesByTtsModel: Record<string, VoiceOption[]> = {
  "gemini-3.8-flash-tts": voiceCatalog,
  "gemini-3.8-flash-lite-tts": voiceCatalog,
  "gemini-3.1-flash-tts-preview": voiceCatalog,
  "gemini-2.5-pro-preview-tts": voiceCatalog,
};

export const styleCatalog: StyleOption[] = [

  { value: "natural", label: "טבעי" },
  { value: "broadcast", label: "שידור" },
  { value: "cheerful", label: "שמח" },
  { value: "serious", label: "רציני" },
  { value: "whisper", label: "לחישה" },
  { value: "excited", label: "נרגש" },
  { value: "calm", label: "רגוע" },
  { value: "authoritative", label: "סמכותי" },
  { value: "friendly", label: "ידידותי" },
  { value: "professional", label: "מקצועי" },
  { value: "storytelling", label: "מספר סיפורים" },
  { value: "documentary", label: "דוקומנטרי" },
  { value: "podcast", label: "פודקאסט" },
  { value: "commercial", label: "פרסומת" },
  { value: "dramatic", label: "דרמטי" },
  { value: "warm", label: "חם" },
  { value: "confident", label: "ביטחון" },
  { value: "gentle", label: "עדין" },
  { value: "energetic", label: "אנרגטי" },
  { value: "luxury", label: "יוקרתי" },
  { value: "inspiring", label: "מעורר השראה" },
  { value: "technical", label: "טכני" },
  { value: "shouting", label: "צעקה" },
  { value: "terrified", label: "מבועת" },
  { value: "sad", label: "עצוב" },
  { value: "angry", label: "כועס" },
  { value: "hopeful", label: "מלא תקווה" },
  { value: "cinematic", label: "קולנועי" },
  { value: "royal", label: "מלכותי" },
  { value: "motivational", label: "מוטיבציוני" },
];

/** הסגנונות שמותר ל"התאמת סגנון אוטומטית" לבחור מהם (כמו באתר המקורי) */
export const toneChoices =
  "natural, cheerful, serious, whisper, excited, calm, authoritative, friendly, professional, storytelling, shouting, terrified, sad, angry, hopeful";


export function getVoicesForTtsModel(model: string): VoiceOption[] {
  return voicesByTtsModel[model] || voiceCatalog;
}


/** מספר הקולות הייחודיים בקטלוג. */
export const uniqueVoiceCount = voiceCatalog.length;

/** חיפוש קולות לפי שם עברי, מזהה מקורי, סגנון, מגדר וגובה קול. */
export function searchVoices(voices: VoiceOption[], query: string, gender: "male" | "female" | "all" = "all"): VoiceOption[] {
  const q = query.trim().toLocaleLowerCase("he");
  return voices.filter((voice) => {
    const genderMatches = gender === "all" || voice.gender === gender || !voice.gender;
    if (!genderMatches) return false;
    if (!q) return true;
    return [voice.name, voice.id, voice.description, voice.pitch || "", voice.gender === "male" ? "גברי" : voice.gender === "female" ? "נשי" : "ניטרלי"]
      .join(" ").toLocaleLowerCase("he").includes(q);
  });
}
