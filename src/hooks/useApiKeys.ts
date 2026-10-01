import { useCallback, useEffect, useState } from "react";
import { readStoredArray, writeStored, STORAGE_KEYS } from "../lib/storage";

export function useApiKeys() {
  const [savedApiKeys, setSavedApiKeys] = useState<string[]>(() => {
    const keys = readStoredArray<string>(STORAGE_KEYS.apiKeys).filter((k) => typeof k === "string" && k.trim());
    const legacy = localStorage.getItem(STORAGE_KEYS.legacyApiKey) || "";
    if (legacy && !keys.includes(legacy)) keys.push(legacy);
    return keys;
  });

  const [currentApiKey, setCurrentApiKey] = useState<string>(
    () => localStorage.getItem(STORAGE_KEYS.activeApiKey) || savedApiKeys[0] || ""
  );

  useEffect(() => {
    writeStored(STORAGE_KEYS.apiKeys, savedApiKeys);
  }, [savedApiKeys]);

  useEffect(() => {
    if (currentApiKey) localStorage.setItem(STORAGE_KEYS.activeApiKey, currentApiKey);
    else localStorage.removeItem(STORAGE_KEYS.activeApiKey);
  }, [currentApiKey]);

  const addKey = useCallback((key: string) => {
    const trimmed = key.trim();
    if (!trimmed) return;
    setSavedApiKeys((prev) => [...new Set([...prev, trimmed])]);
    setCurrentApiKey(trimmed);
  }, []);

  const removeKey = useCallback(
    (key: string) => {
      const remaining = savedApiKeys.filter((k) => k !== key);
      setSavedApiKeys(remaining);
      if (currentApiKey === key) setCurrentApiKey(remaining[0] || "");
    },
    [currentApiKey, savedApiKeys]
  );

  const selectKey = useCallback((key: string) => setCurrentApiKey(key), []);

  return { savedApiKeys, currentApiKey, addKey, removeKey, selectKey };
}
