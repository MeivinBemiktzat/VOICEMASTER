import { useCallback, useEffect, useState } from "react";
import { STORAGE_KEYS } from "../lib/storage";

function initialDark(): boolean {
  const stored = localStorage.getItem(STORAGE_KEYS.darkMode);
  if (stored !== null) return stored === "true";
  return false;
}

export function useDarkMode() {
  const [isDark, setIsDark] = useState<boolean>(initialDark);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem(STORAGE_KEYS.darkMode, String(isDark));
  }, [isDark]);

  const toggle = useCallback(() => setIsDark((d) => !d), []);
  return { isDark, toggle };
}
