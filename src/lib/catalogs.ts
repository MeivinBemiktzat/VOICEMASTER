import type { VoiceCatalog, StyleOption } from "./types";

/**
 * קטלוג הקולות מהאתר המקורי. חלק מהרשומות חוזרות על אותו קול (id) עם תיאור שונה:
 * הן נשמרו כדי לשמור על התנהגות האתר המקורי. בפועל נשלח ל-Gemini רק שם הקול.
 */
const v = (id: string, description: string) => ({ id, description });

export const voiceCatalog: VoiceCatalog = {
  male: [
    v("Zephyr", "קליל"), v("Fenrir", "עמוק"), v("Puck", "שובב"), v("Charon", "סמכותי"), v("Orus", "קלאסי"),
    v("Enceladus", "צעיר"), v("Iapetus", "חם"), v("Algieba", "נמרץ"), v("Rasalgethi", "בוגר"), v("Achernar", "יציב"),
    v("Alnilam", "בהיר"), v("Schedar", "נעים"), v("Achird", "שידורי"), v("Zubenelgenubi", "עמוק מאוד"),
    v("Sadachbia", "רך"), v("Sadaltager", "טבעי"), v("Sulafat", "עוצמתי"),
    v("Zephyr", "פרסומי"), v("Zephyr", "רגוע"), v("Zephyr", "חברי"), v("Zephyr", "דוקומנטרי"),
    v("Fenrir", "קולנועי"), v("Fenrir", "דרמטי"), v("Fenrir", "חדשותי"), v("Fenrir", "מלכותי"),
    v("Puck", "צעיר ואנרגטי"), v("Puck", "קומי"), v("Puck", "פודקאסט"), v("Puck", "שיווקי"),
    v("Charon", "קריין חד"), v("Charon", "מנחה"), v("Charon", "עסקי"), v("Charon", "רשמי"),
    v("Orus", "חם ובוגר"), v("Orus", "מספר סיפורים"), v("Orus", "אלגנטי"), v("Orus", "מוטיבציוני"),
    v("Iapetus", "פרימיום"), v("Iapetus", "עמוק וחם"), v("Algieba", "ספורטיבי"), v("Algieba", "מהיר"),
    v("Rasalgethi", "בשל ורגוע"), v("Achernar", "יציב וברור"), v("Alnilam", "בהיר ודינמי"),
  ],
  female: [
    v("Kore", "מקצועי"), v("Leda", "עדין"), v("Aoede", "רך"), v("Callirrhoe", "רהוט"), v("Autonoe", "אנרגטי"),
    v("Umbriel", "מסתורי"), v("Despina", "מהיר"), v("Erinome", "ידידותי"), v("Algenib", "חדשותי"),
    v("Laomedeia", "מרגיע"), v("Gacrux", "אלגנטי"), v("Pulcherrima", "עשיר"), v("Vindemiatrix", "סבלני"),
  ],
};

/** מספר קולות ייחודיים (לפי id) */
export const uniqueVoiceCount = new Set([...voiceCatalog.male, ...voiceCatalog.female].map((x) => x.id)).size;

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
