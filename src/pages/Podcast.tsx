import { useState } from "react";
import { Loader2, Podcast as PodcastIcon, Inbox } from "lucide-react";
import { useAppStore } from "../lib/AppStore";
import { useAuth } from "../lib/AuthContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "../lib/ToastContext";
import { useAiAction } from "../lib/useAiAction";
import { voiceCatalog } from "../lib/catalogs";
import { prompts } from "../lib/prompts";
import { geminiTextCall, geminiPodcastAudioCall } from "../lib/gemini";
import TrackCard from "../components/TrackCard";

const LENGTH_OPTIONS = [
  { value: "קצר (כ-6 שורות)", label: "קצר" },
  { value: "בינוני (כ-12 שורות)", label: "בינוני" },
  { value: "ארוך (כ-20 שורות)", label: "ארוך" },
];

export default function Podcast() {
  const store = useAppStore();
  const { user } = useAuth();
  const navigate = useNavigate();
  const showToast = useToast();
  const { loadingKey, run } = useAiAction();

  const [topic, setTopic] = useState("");
  const [nameA, setNameA] = useState("דנה");
  const [nameB, setNameB] = useState("יוני");
  const [voiceA, setVoiceA] = useState("Kore");
  const [voiceB, setVoiceB] = useState("Zephyr");
  const [length, setLength] = useState(LENGTH_OPTIONS[1].value);
  const [script, setScript] = useState("");

  const apiOpts = { currentApiKey: store.currentApiKey, savedApiKeys: store.savedApiKeys };

  const generateScript = () => {
    if (!topic.trim()) return showToast("הזינו נושא לפודקאסט");
    if (!nameA.trim() || !nameB.trim()) return showToast("הזינו שמות לשני הדוברים");
    run(
      "script",
      () => geminiTextCall(prompts.podcastScript(topic.trim(), nameA.trim(), nameB.trim(), length), apiOpts),
      (result) => setScript(result)
    );
  };

  const generateAudio = () => {
    if (!script.trim()) return showToast("אין תסריט להפקה. צרו תסריט תחילה");
    const selectedStyle = store.allStyles.find((s) => s.value === store.style);
    const styleInstruction = selectedStyle?.instruction || selectedStyle?.label || store.style;
    run(
      "audio",
      () =>
        geminiPodcastAudioCall(
          script,
          styleInstruction,
          [
            { name: nameA.trim(), voice: voiceA },
            { name: nameB.trim(), voice: voiceB },
          ],
          apiOpts
        ),
      ({ blob }) => {
        store.addTrack(blob, `פודקאסט: ${topic.slice(0, 24)}`, `${voiceA} / ${voiceB}`, store.style, "podcast", script)
          .then(() => showToast("הפודקאסט הופק ונשמר בהצלחה!", "success"))
          .catch(() => showToast("הפודקאסט הופק, אך השמירה למסד הנתונים נכשלה"));
      }
    );
  };

  const podcastTracks = store.tracks.filter((t) => t.kind === "podcast");

  return (
    <div className="space-y-8">
      <div>
        <span className="luxury-chip mb-3 inline-flex items-center gap-1.5">
          <PodcastIcon size={13} /> סטודיו פודקאסט
        </span>
        <h1 className="font-display text-2xl font-black text-ink sm:text-3xl">
          הפקת פודקאסט דו-שיח עם בינה מלאכותית
        </h1>
        <p className="mt-2 max-w-2xl text-xs text-mute sm:text-sm">
          כתבו נושא, תנו שם וקול לכל דובר — ה-AI יכתוב תסריט דו-שיח טבעי בעברית ויהפוך אותו לקובץ אודיו עם
          שני קולות נפרדים.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-12 lg:gap-8">
        <div className="space-y-6 lg:col-span-5">
          <div className="card rounded-2xl p-4 sm:rounded-[2rem] sm:p-6">
            <h3 className="mb-4 text-sm font-black text-ink sm:text-base">1. נושא ותסריט</h3>
            <label className="label">נושא הפודקאסט</label>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="field mb-4 text-sm"
              placeholder="לדוגמה: עתיד הבינה המלאכותית"
            />
            <label className="label">אורך התסריט</label>
            <select value={length} onChange={(e) => setLength(e.target.value)} className="field mb-4 bg-soft !border-none text-sm font-bold">
              {LENGTH_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <button
              onClick={generateScript}
              disabled={loadingKey === "script"}
              className="btn btn-primary w-full"
            >
              {loadingKey === "script" ? <Loader2 size={16} className="animate-spin" /> : null}
              ✨ צור תסריט דו-שיח
            </button>
          </div>

          <div className="card rounded-2xl p-4 sm:rounded-[2rem] sm:p-6">
            <h3 className="mb-4 text-sm font-black text-ink sm:text-base">2. הדוברים</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">שם דובר א׳</label>
                <input value={nameA} onChange={(e) => setNameA(e.target.value)} className="field mb-2 text-sm" />
                <select value={voiceA} onChange={(e) => setVoiceA(e.target.value)} className="field cursor-pointer bg-soft !border-none text-xs font-bold">
                  <optgroup label="גברים">
                    {voiceCatalog.male.map((v, i) => (
                      <option key={`a_m_${i}`} value={v.id}>
                        {v.id}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="נשים">
                    {voiceCatalog.female.map((v, i) => (
                      <option key={`a_f_${i}`} value={v.id}>
                        {v.id}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>
              <div>
                <label className="label">שם דובר ב׳</label>
                <input value={nameB} onChange={(e) => setNameB(e.target.value)} className="field mb-2 text-sm" />
                <select value={voiceB} onChange={(e) => setVoiceB(e.target.value)} className="field cursor-pointer bg-soft !border-none text-xs font-bold">
                  <optgroup label="גברים">
                    {voiceCatalog.male.map((v, i) => (
                      <option key={`b_m_${i}`} value={v.id}>
                        {v.id}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="נשים">
                    {voiceCatalog.female.map((v, i) => (
                      <option key={`b_f_${i}`} value={v.id}>
                        {v.id}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>
            </div>
            <label className="label mt-4">סגנון הגשה</label>
            <select value={store.style} onChange={(e) => store.setStyle(e.target.value)} className="field cursor-pointer bg-soft !border-none text-sm font-bold">
              {store.allStyles.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-6 lg:col-span-7">
          <div className="card rounded-2xl p-4 sm:rounded-[2rem] sm:p-6">
            <h3 className="mb-3 text-sm font-black text-ink sm:text-base">3. תסריט הדו-שיח</h3>
            <textarea
              value={script}
              onChange={(e) => setScript(e.target.value)}
              rows={10}
              className="field resize-y text-sm leading-relaxed shadow-inner"
              placeholder={`התסריט יופיע כאן. כל שורה מתחילה בשם הדובר, למשל:\n${nameA}: שלום וברוכים הבאים!`}
            />
            <button
              onClick={generateAudio}
              disabled={loadingKey === "audio"}
              className="btn btn-sun mt-4 w-full !py-3.5"
            >
              {loadingKey === "audio" ? <Loader2 size={18} className="animate-spin" /> : null}
              הפק אודיו לפודקאסט
            </button>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-black text-ink">הפודקאסטים שלי</h2>
            <div className="space-y-3">
              {podcastTracks.length === 0 ? (
                <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-line py-14 text-center text-sm font-bold text-mute">
                  <Inbox size={26} />
                  הפודקאסטים שתפיקו יופיעו כאן
                </div>
              ) : (
                podcastTracks.map((t) => <TrackCard key={t.id} track={t} onRemove={store.removeTrack} />)
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
