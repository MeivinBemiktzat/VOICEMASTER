export function readStoredArray<T>(key: string): T[] {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? (value as T[]) : [];
  } catch {
    return [];
  }
}

export function writeStored(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/** שמות המפתחות זהים לאתר המקורי, כדי שמפתחות שמורים ימשיכו לעבוד. */
export const STORAGE_KEYS = {
  apiKeys: "gemini_api_keys",
  legacyApiKey: "gemini_api_key",
  activeApiKey: "gemini_active_api_key",
  customStyles: "custom_voice_styles",
  darkMode: "voice_master_dark_mode",
};
