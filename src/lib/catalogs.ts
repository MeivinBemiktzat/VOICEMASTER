import type { VoiceOption, StyleOption } from "./types";

/**
 * הקולות המובנים של Gemini TTS לפי התיעוד הרשמי של Google.
 * שני מודלי Gemini 3.8 TTS חולקים את אותה ספריית קולות.
 * הערך id נשלח ל-API; name ו-description מיועדים לתצוגה בעברית.
 */
export const voiceCatalog: VoiceOption[] = [
  { id: "Zephyr", name: "זפיר", description: "בהיר" },
  { id: "Puck", name: "פאק", description: "נמרץ" },
  { id: "Charon", name: "קארון", description: "אינפורמטיבי" },
  { id: "Kore", name: "קורי", description: "תקיף" },
  { id: "Fenrir", name: "פנריר", description: "נלהב" },
  { id: "Leda", name: "לדה", description: "צעיר" },
  { id: "Orus", name: "אורוס", description: "תקיף" },
  { id: "Aoede", name: "אואדה", description: "קליל" },
  { id: "Callirrhoe", name: "קלירואה", description: "נינוח" },
  { id: "Autonoe", name: "אוטונואה", description: "בהיר" },
  { id: "Enceladus", name: "אנקלדוס", description: "נושם" },
  { id: "Iapetus", name: "יאפטוס", description: "ברור" },
  { id: "Umbriel", name: "אומבריאל", description: "נינוח" },
  { id: "Algieba", name: "אלג'יבה", description: "חלק" },
  { id: "Despina", name: "דספינה", description: "חלק" },
  { id: "Erinome", name: "ארינומה", description: "ברור" },
  { id: "Algenib", name: "אלג'ניב", description: "מחוספס" },
  { id: "Rasalgethi", name: "ראסאלגטי", description: "אינפורמטיבי" },
  { id: "Laomedeia", name: "לאומדיה", description: "נמרץ" },
  { id: "Achernar", name: "אחרנר", description: "רך" },
  { id: "Alnilam", name: "אלנילם", description: "תקיף" },
  { id: "Schedar", name: "שדר", description: "מאוזן" },
  { id: "Gacrux", name: "גקרוקס", description: "בוגר" },
  { id: "Pulcherrima", name: "פולכרימה", description: "החלטי" },
  { id: "Achird", name: "אכירד", description: "ידידותי" },
  { id: "Zubenelgenubi", name: "זובנאלגנובי", description: "אגבי" },
  { id: "Vindemiatrix", name: "וינדמיאטריקס", description: "עדין" },
  { id: "Sadachbia", name: "סדחביה", description: "תוסס" },
  { id: "Sadaltager", name: "סדלטגר", description: "מלומד" },
  { id: "Sulafat", name: "סולפאט", description: "חמים" },
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
