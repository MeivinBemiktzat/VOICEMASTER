import { Download, Trash2, Podcast, Mic } from "lucide-react";
import type { Track } from "../lib/types";

export default function TrackCard({ track, onRemove }: { track: Track; onRemove: (id: string) => void }) {
  return (
    <div className="card flex flex-col items-start justify-between gap-3 rounded-xl p-3 sm:flex-row sm:items-center sm:rounded-2xl sm:p-4">
      <div className="w-full min-w-0 flex-grow sm:w-auto">
        <div className="flex items-center gap-1.5">
          {track.kind === "podcast" ? (
            <Podcast size={13} className="shrink-0 text-brand" />
          ) : (
            <Mic size={13} className="shrink-0 text-brand" />
          )}
          <div className="truncate text-xs font-bold text-ink sm:text-sm">{track.title}</div>
        </div>
        <div className="mt-0.5 text-[10px] text-mute">
          {track.voice} · {track.style} · {new Date(track.createdAt).toLocaleString("he-IL")}
        </div>
      </div>
      <div className="flex w-full items-center justify-between gap-2 border-t border-line pt-2 sm:w-auto sm:justify-end sm:border-t-0 sm:pt-0">
        <audio src={track.url} controls className="w-full sm:w-48" />
        <a
          href={`${track.url}?download=1`}
          download={`${track.kind}_${track.createdAt}.wav`}
          className="shrink-0 rounded-lg p-2 text-brand hover:bg-soft"
          title="הורדה"
        >
          <Download size={18} />
        </a>
        <button
          onClick={() => onRemove(track.id)}
          className="shrink-0 rounded-lg p-2 text-mute hover:bg-soft hover:text-danger"
          title="מחיקה"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
}
