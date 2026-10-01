import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { StyleOption, Track, TrackKind, StoredTrack } from "./types";
import { readStoredArray, writeStored, STORAGE_KEYS } from "./storage";
import { useApiKeys } from "../hooks/useApiKeys";
import { styleCatalog as baseStyleCatalog } from "./catalogs";
import { getTracks as getLocalTracks, saveTrack, deleteTrack, clearTracks as clearLocalTracks } from "./localTracks";
import { useAuth } from "./AuthContext";

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
  const { user } = useAuth();
  const [customStyles, setCustomStyles] = useState<StyleOption[]>(() =>
    readStoredArray<StyleOption>(STORAGE_KEYS.customStyles)
  );
  const [tracks, setTracks] = useState<Array<StoredTrack & { blob: Blob }>>([]);
  const [draftText, setDraftText] = useState("");
  const [voice, setVoice] = useState("Zephyr");
  const [style, setStyle] = useState("professional");
  const [storageReady, setStorageReady] = useState(false);
  const [audioUrls, setAudioUrls] = useState<Record<string, string>>({});
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
    const local = user ? await getLocalTracks(user.userId) : [];
    const resolved = local.map((track) => ({
      ...track,
      url: URL.createObjectURL(track.blob),
    }));
    setAudioUrls((previous) => { Object.values(previous).forEach(URL.revokeObjectURL); return Object.fromEntries(resolved.map(t => [t.id, t.url])); });
    setTracks(resolved.map(t => ({ ...t, blob: t.blob })));
    setStorageReady(true);
  }, [user]);

  useEffect(() => { refreshTracks().catch(() => setStorageReady(false)); }, [refreshTracks]);

  const addCustomStyle = useCallback((label: string) => {
    const value = `custom_${Date.now()}`;
    setCustomStyles((prev) => [...prev, { value, label: `מותאם אישית: ${label}`, instruction: label }]);
    return value;
  }, []);

  const addTrack = useCallback(async (blob: Blob, title: string, trackVoice: string, trackStyle: string, kind: TrackKind = "narration", sourceText?: string) => {
    const response = await fetch("/api/voiceovers", {
      method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, voice: trackVoice, style: trackStyle, kind, sourceText }),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      if (response.status === 401) throw new Error("AUTH_REQUIRED");
      throw new Error(error?.error || "לא ניתן לשמור את סטטיסטיקת הקריינות");
    }
    const id = crypto.randomUUID();
    await saveTrack({ ownerId: user?.userId || "", id, title, voice: trackVoice, style: trackStyle, kind, sourceText, createdAt: Date.now(), blob });
    await refreshTracks();
  }, [refreshTracks, user]);

  const removeTrack = useCallback(async (id: string) => {
    if (user) await deleteTrack(user.userId, id);
    setTracks((prev) => prev.filter((track) => track.id !== id));
    setAudioUrls((previous) => {
      if (previous[id]) URL.revokeObjectURL(previous[id]);
      const next = { ...previous };
      delete next[id];
      return next;
    });
  }, [user]);

  const clearTracks = useCallback(async () => {
    if (user) await clearLocalTracks(user.userId);
    Object.values(audioUrls).forEach(URL.revokeObjectURL);
    setAudioUrls({}); setTracks([]);
  }, [audioUrls, user]);

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
    tracks: tracks.map((track) => ({ ...track, url: audioUrls[track.id] || track.url })),
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
