import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { StyleOption, Track, TrackKind, StoredTrack } from "./types";
import { readStoredArray, writeStored, STORAGE_KEYS } from "./storage";
import { useApiKeys } from "../hooks/useApiKeys";
import { styleCatalog as baseStyleCatalog } from "./catalogs";

interface AppStoreValue {
  currentApiKey: string;
  savedApiKeys: string[];
  addKey: (key: string) => void;
  removeKey: (key: string) => void;
  selectKey: (key: string) => void;

  customStyles: StyleOption[];
  allStyles: StyleOption[];
  addCustomStyle: (label: string) => string;

  draftText: string;
  setDraftText: (text: string) => void;
  voice: string;
  setVoice: (voice: string) => void;
  style: string;
  setStyle: (style: string) => void;
  accent: string;
  setAccent: (accent: string) => void;
  compact: boolean;
  setCompact: (compact: boolean) => void;

  tracks: Array<StoredTrack & { blob: Blob }>;
  addTrack: (
    blob: Blob,
    title: string,
    voice: string,
    style: string,
    kind?: TrackKind,
    sourceText?: string
  ) => Promise<void>;
  removeTrack: (id: string) => Promise<void>;
  clearTracks: () => Promise<void>;
  refreshTracks: () => Promise<void>;
  storageReady: boolean;
}

const AppStoreContext = createContext<AppStoreValue | null>(null);

async function fetchTracks(): Promise<StoredTrack[]> {
  const response = await fetch("/api/voiceovers", { credentials: "same-origin" });
  if (!response.ok) throw new Error("לא ניתן לטעון את היסטוריית הקריינויות");
  const data = (await response.json()) as { tracks?: StoredTrack[] };
  return Array.isArray(data.tracks) ? data.tracks : [];
}

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const apiKeys = useApiKeys();
  const [customStyles, setCustomStyles] = useState<StyleOption[]>(() =>
    readStoredArray<StyleOption>(STORAGE_KEYS.customStyles)
  );
  const [tracks, setTracks] = useState<Array<StoredTrack & { blob: Blob }>>([]);
  const [draftText, setDraftText] = useState("");
  const [voice, setVoice] = useState("Zephyr");
  const [style, setStyle] = useState("professional");
  const [storageReady, setStorageReady] = useState(false);
  const [accent, setAccentState] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.accent);
      const parsed = stored ? JSON.parse(stored) : "blue";
      return typeof parsed === "string" ? parsed : "blue";
    } catch {
      return "blue";
    }
  });
  const [compact, setCompactState] = useState(() => localStorage.getItem(STORAGE_KEYS.compact) === "true");

  const setAccent = useCallback((value: string) => {
    setAccentState(value);
    writeStored(STORAGE_KEYS.accent, value);
  }, []);

  const setCompact = useCallback((value: boolean) => {
    setCompactState(value);
    writeStored(STORAGE_KEYS.compact, value);
  }, []);

  useEffect(() => {
    writeStored(STORAGE_KEYS.customStyles, customStyles);
  }, [customStyles]);

  useEffect(() => {
    document.documentElement.dataset.accent = accent;
    document.documentElement.classList.toggle("compact", compact);
  }, [accent, compact]);

  const refreshTracks = useCallback(async () => {
    const remoteTracks = await fetchTracks();
    setTracks(remoteTracks.map((track) => ({ ...track, blob: new Blob() })));
    setStorageReady(true);
  }, []);

  useEffect(() => {
    refreshTracks().catch(() => setStorageReady(false));
  }, [refreshTracks]);

  const addCustomStyle = useCallback((label: string) => {
    const value = `custom_${Date.now()}`;
    setCustomStyles((prev) => [...prev, { value, label: `מותאם אישית: ${label}`, instruction: label }]);
    return value;
  }, []);

  const addTrack = useCallback(
    async (
      blob: Blob,
      title: string,
      trackVoice: string,
      trackStyle: string,
      kind: TrackKind = "narration",
      sourceText?: string
    ) => {
      const initResponse = await fetch("/api/voiceovers", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          voice: trackVoice,
          style: trackStyle,
          kind,
          sourceText,
        }),
      });
      if (!initResponse.ok) {
        const error = await initResponse.json().catch(() => ({}));
        throw new Error(error?.error || "לא ניתן להכין את שמירת הקריינות");
      }

      const init = (await initResponse.json()) as { id: string };
      const uploadResponse = await fetch(`/api/voiceovers/${encodeURIComponent(init.id)}`, {
        method: "PUT",
        headers: { "Content-Type": blob.type || "audio/wav" },
        body: blob,
      });
      if (!uploadResponse.ok) {
        const error = await uploadResponse.json().catch(() => ({}));
        throw new Error(error?.error || "העלאת קובץ האודיו נכשלה");
      }

      const completeResponse = await fetch("/api/voiceovers/complete", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: init.id }),
      });
      if (!completeResponse.ok) {
        const error = await completeResponse.json().catch(() => ({}));
        throw new Error(error?.error || "לא ניתן להשלים את שמירת הקריינות");
      }

      await refreshTracks();
    },
    [refreshTracks]
  );

  const removeTrack = useCallback(async (id: string) => {
    const response = await fetch(`/api/voiceovers/${encodeURIComponent(id)}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    if (!response.ok) throw new Error("לא ניתן למחוק את הקריינות");
    setTracks((prev) => prev.filter((track) => track.id !== id));
  }, []);

  const clearTracks = useCallback(async () => {
    const results = await Promise.all(
      tracks.map((track) =>
        fetch(`/api/voiceovers/${encodeURIComponent(track.id)}`, {
          method: "DELETE",
          credentials: "same-origin",
        })
      )
    );
    if (results.some((response) => !response.ok)) throw new Error("לא ניתן לנקות את כל ההיסטוריה");
    setTracks([]);
  }, [tracks]);

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
    accent,
    setAccent,
    compact,
    setCompact,
    tracks,
    addTrack,
    removeTrack,
    clearTracks,
    refreshTracks,
    storageReady,
  };

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

export function useAppStore() {
  const ctx = useContext(AppStoreContext);
  if (!ctx) throw new Error("useAppStore must be used within AppStoreProvider");
  return ctx;
}
