import { Inbox } from "lucide-react";
import { useAppStore } from "../lib/AppStore";
import TrackCard from "../components/TrackCard";

export default function History() {
  const store = useAppStore();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-black text-ink sm:text-3xl">היסטוריית הפקות</h1>
          <p className="mt-1 text-xs text-mute sm:text-sm">
            כל הקריינות והפודקאסטים ששמרתם בחשבון הדפדפן ({store.tracks.length} הקלטות)
          </p>
        </div>
        {store.tracks.length > 0 && (
          <button onClick={store.clearTracks} className="btn btn-outline !text-danger">
            נקה היסטוריה
          </button>
        )}
      </div>

      <div className="space-y-3 sm:space-y-4">
        {store.tracks.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-line py-20 text-center text-sm font-bold text-mute sm:rounded-[2.5rem]">
            <Inbox size={28} />
            עדיין לא יצרתם הקלטות. גשו לסטודיו הקריינות או הפודקאסט כדי להתחיל.
          </div>
        ) : (
          store.tracks.map((t) => <TrackCard key={t.id} track={t} onRemove={store.removeTrack} />)
        )}
      </div>
    </div>
  );
}
