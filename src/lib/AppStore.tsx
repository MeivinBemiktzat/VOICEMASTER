import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { StyleOption, Track, TrackKind } from "./types";
import { readStoredArray, writeStored, STORAGE_KEYS } from "./storage";
import { useApiKeys } from "../hooks/useApiKeys";
import { styleCatalog as baseStyleCatalog } from "./catalogs";

interface AppStoreValue {
  // מפתחות API
  currentApiKey: string;
  savedApiKeys: string[];
  addKey: (key: string) => void;
  removeKey: (key: string) => void;
  selectKey: (key: string) => void;

  // סגנונות
  customStyles: StyleOption[];
  allStyles: StyleOption[];
  addCustomStyle: (label: string) => string;

  // בחירות משותפות לכל הדפים
  draftText: string;
  setDraftText: (text: string) => void;
  voice: string;
  setVoice: (voice: string) => void;
  style: string;
  setStyle: (style: string) => void;

  // הקלטות (נשמרות בזיכרון בלבד, עד רענון הדף)
  tracks: Track[];
  addTrack: (blob: Blob, title: string, voice: string, style: string, kind?: TrackKind) => void;
  removeTrack: (id: string) => void;
  clearTracks: () => void;
}

const AppStoreContext = createContext<AppStoreValue | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const apiKeys = useApiKeys();
  const [customStyles, setCustomStyles] = useState<StyleOption[]>(() =>
    readStoredArray<StyleOption>(STORAGE_KEYS.customStyles)
  );
  const [tracks, setTracks] = useState<Track[]>([]);
  const [draftText, setDraftText] = useState("");
  const [voice, setVoice] = useState("Zephyr");
  const [style, setStyle] = useState("professional");

  useEffect(() => {
    writeStored(STORAGE_KEYS.customStyles, customStyles);
  }, [customStyles]);

  const addCustomStyle = useCallback((label: string) => {
    const value = `custom_${Date.now()}`;
    setCustomStyles((prev) => [...prev, { value, label: `מותאם אישית: ${label}`, instruction: label }]);
    return value;
  }, []);

  const addTrack = useCallback(
    (blob: Blob, title: string, trackVoice: string, trackStyle: string, kind: TrackKind = "narration") => {
      const track: Track = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        title,
        voice: trackVoice,
        style: trackStyle,
        url: URL.createObjectURL(blob),
        blob,
        createdAt: Date.now(),
        kind,
      };
      setTracks((prev) => [track, ...prev]);
    },
    []
  );

  const removeTrack = useCallback((id: string) => {
    setTracks((prev) => {
      const target = prev.find((t) => t.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((t) => t.id !== id);
    });
  }, []);

  const clearTracks = useCallback(() => {
    setTracks((prev) => {
      prev.forEach((t) => URL.revokeObjectURL(t.url));
      return [];
    });
  }, []);

  const allStyles = useMemo(() => [...baseStyleCatalog, ...customStyles], [customStyles]);

  const value: AppStoreValue = {
    ...apiKeys,
    customStyles,
    allStyles,
    addCustomStyle,
    draftText,
    setDraftText,
    voice,
    setVoice,
    style,
    setStyle,
    tracks,
    addTrack,
    removeTrack,
    clearTracks,
  };

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

export function useAppStore() {
  const ctx = useContext(AppStoreContext);
  if (!ctx) throw new Error("useAppStore must be used within AppStoreProvider");
  return ctx;
}
