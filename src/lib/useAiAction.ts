import { useState } from "react";
import { useToast } from "./ToastContext";
import type { ApiCallError } from "./gemini";

/** עוטף קריאת AI: מנהל מצב טעינה לפי מפתח ומציג שגיאות בעברית. */
export function useAiAction() {
  const showToast = useToast();
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  const handleError = (e: unknown) => {
    const err = e as ApiCallError;
    if (err?.message === "Missing API Key") {
      showToast("אנא הוסיפו מפתח API בתפריט שבראש העמוד");
      return;
    }
    showToast(err?.userMessage || "אירעה שגיאה");
  };

  const run = async <T,>(key: string, task: () => Promise<T>, onDone?: (result: T) => void) => {
    setLoadingKey(key);
    try {
      const result = await task();
      if (result && onDone) onDone(result);
    } catch (e) {
      handleError(e);
    } finally {
      setLoadingKey(null);
    }
  };

  return { loadingKey, run, handleError };
}
