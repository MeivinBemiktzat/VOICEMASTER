import { useMemo, useState } from "react";
import { Sparkles, Wand2, Loader2, Inbox } from "lucide-react";
import { useAppStore } from "../lib/AppStore";
import { useAuth } from "../lib/AuthContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "../lib/ToastContext";
import { useAiAction } from "../lib/useAiAction";
import { voiceCatalog } from "../lib/catalogs";
import { prompts } from "../lib/prompts";
import { geminiTextCall, geminiAudioCall } from "../lib/gemini";
import AiButton from "../components/AiButton";
import TrackCard from "../components/TrackCard";

const QUICK_EDITS = [
  { label: "✨ ריכוך", instruction: "הפוך את הטקסט ליותר רגוע ונעים" },
  { label: "✨ שיווקי", instruction: "הפוך את הטקסט ליותר שיווקי ואנרגטי" },
  { label: "✨ קיצור", instruction: "קצר את הטקסט ב-30% מבלי לאבד משמעות" },
];

export default function Narration() {
  const store = useAppStore();
  const { user } = useAuth();
  const navigate = useNavigate();
  const showToast = useToast();
  const { loadingKey, run } = useAiAction();

  const [promptInput, setPromptInput] = useState("");
  const [customStyleInput, setCustomStyleInput] = useState("");

  const voices = useMemo(
    () => [
      { label: "קולות גבריים", options: voiceCatalog.male },
      { label: "קולות נשיים", options: voiceCatalog.female },
    ],
    []
  );

  const apiOpts = { currentApiKey: store.currentApiKey, savedApiKeys: store.savedApiKeys };

  const magicWrite = () =>
    run("magic", () => geminiTextCall(prompts.magicWrite(promptInput.trim() || "קריינות כללית"), apiOpts), (text) =>
      store.setDraftText(text)
    );

  const smartEdit = (instruction: string) => {
    const text = store.draftText.trim();
    if (!text) return showToast("אין טקסט לעריכה");
    run(`edit_${instruction}`, () => geminiTextCall(prompts.smartEdit(instruction, text), apiOpts), (result) =>
      store.setDraftText(result)
    );
  };

  const translateText = () => {
    const text = store.draftText.trim();
    if (!text) return showToast("אין טקסט לתרגום");
    run("translate", () => geminiTextCall(prompts.translate(text), apiOpts), (result) => store.setDraftText(result));
  };

  const summarizeText = () => {
    const text = store.draftText.trim();
    if (!text) return showToast("אין טקסט לסיכום");
    run("summarize", () => geminiTextCall(prompts.summarize(text), apiOpts), (result) => store.setDraftText(result));
  };

  const analyzeTone = () => {
    const text = store.draftText.trim();
    if (!text) return showToast("אין טקסט לניתוח");
    run(
      "tone",
      async () => {
        const choice = (await geminiTextCall(prompts.analyzeTone(text), apiOpts)).trim().toLowerCase();
        return choice.replace(/[^a-z]/g, "");
      },
      (cleanChoice) => {
        const option = store.allStyles.find((o) => o.value === cleanChoice);
        if (option) {
          store.setStyle(cleanChoice);
          showToast(`הסגנון הותאם ל: ${option.label}`, "success");
        } else {
          showToast("לא זוהה סגנון מתאים");
        }
      }
    );
  };

  const vocalize = () => {
    const text = store.draftText.trim();
    if (!text) return showToast("אין טקסט לניקוד");
    run("vocalize", () => geminiTextCall(prompts.vocalize(text), apiOpts), (result) => store.setDraftText(result));
  };

  const saveCustomStyle = () => {
    const label = customStyleInput.trim();
    if (!label) return showToast("הזינו תיאור לסגנון המותאם");
    const value = store.addCustomStyle(label);
    store.setStyle(value);
    setCustomStyleInput("");
    showToast("סגנון מותאם אישית נשמר", "success");
  };

  const generate = () => {
    if (!user) { navigate("/register"); return; }
    const text = store.draftText.trim();
    if (!text) return showToast("הכנס טקסט לקריינות");
    const selectedStyle = store.allStyles.find((s) => s.value === store.style);
    const styleInstruction = selectedStyle?.instruction || selectedStyle?.label || store.style;
    run(
      "generate",
      () => geminiAudioCall(text, styleInstruction, store.voice, apiOpts),
      ({ blob }) => {
        store.addTrack(blob, text.slice(0, 30), store.voice, store.style, "narration", text)
          .then(() => showToast("קריינות הופקה ונשמרה בהצלחה!", "success"))
          .catch((error) => showToast(`הקריינות הופקה, אך השמירה נכשלה: ${error instanceof Error ? error.message : "שגיאה לא ידועה"}`));
      }
    );
  };

  const narrationTracks = store.tracks.filter((t) => t.kind === "narration");

  return (
    <div className="grid gap-6 lg:grid-cols-12 lg:gap-8">
      <div className="space-y-6 lg:col-span-5">
        <div className="card pulse-soft rounded-2xl p-4 sm:rounded-[2rem] sm:p-6">
          <h3 className="mb-3 text-sm font-black text-ink sm:mb-4 sm:text-base">יצירת תוכן חכמה</h3>
          <div className="mb-4 flex gap-2">
            <input
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              className="field flex-grow text-xs sm:text-sm"
              placeholder="תאר מה לכתוב (למשל: פרסומת לשירות חדש)..."
            />
            <button onClick={magicWrite} disabled={loadingKey === "magic"} className="btn btn-primary !px-3.5">
              {loadingKey === "magic" ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {QUICK_EDITS.map((edit) => (
              <AiButton
                key={edit.label}
                onClick={() => smartEdit(edit.instruction)}
                loading={loadingKey === `edit_${edit.instruction}`}
              >
                {edit.label}
              </AiButton>
            ))}
            <AiButton onClick={translateText} loading={loadingKey === "translate"}>
              ✨ תרגם
            </AiButton>
            <AiButton onClick={summarizeText} loading={loadingKey === "summarize"}>
              ✨ סיכום
            </AiButton>
          </div>
        </div>

        <div className="card rounded-2xl p-4 sm:rounded-[2.5rem] sm:p-7">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <label className="label !mb-0">טקסט לקריינות</label>
            <button
              onClick={analyzeTone}
              disabled={loadingKey === "tone"}
              className="flex items-center gap-1 rounded-full bg-soft px-2.5 py-1 text-[11px] font-bold text-brand hover:bg-line"
            >
              {loadingKey === "tone" && <Loader2 size={12} className="animate-spin" />}
              ✨ התאם סגנון אוטומטית
            </button>
          </div>
          <textarea
            value={store.draftText}
            onChange={(e) => store.setDraftText(e.target.value)}
            rows={6}
            className="field resize-y text-base shadow-inner sm:text-lg"
            placeholder="הטקסט יופיע כאן..."
          />
          <button
            onClick={vocalize}
            disabled={loadingKey === "vocalize"}
            className="btn btn-quiet mb-5 mt-3 w-full"
          >
            {loadingKey === "vocalize" ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
            ✨ ניקוד אוטומטי
          </button>

          <div className="mb-4 grid gap-3 sm:grid-cols-2 sm:gap-4">
            <div>
              <label className="label">קול</label>
              <select
                value={store.voice}
                onChange={(e) => store.setVoice(e.target.value)}
                className="field cursor-pointer bg-soft !border-none text-xs font-bold sm:text-sm"
              >
                {voices.map((group) => (
                  <optgroup key={group.label} label={group.label}>
                    {group.options.map((v, i) => (
                      <option key={`${v.id}_${i}`} value={v.id}>
                        {v.id} — {v.description}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div>
              <label className="label">סגנון והגשה</label>
              <select
                value={store.style}
                onChange={(e) => store.setStyle(e.target.value)}
                className="field cursor-pointer bg-soft !border-none text-xs font-bold sm:text-sm"
              >
                {store.allStyles.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mb-4">
            <label className="label">סגנון מותאם אישית</label>
            <div className="flex gap-2">
              <input
                value={customStyleInput}
                onChange={(e) => setCustomStyleInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveCustomStyle()}
                className="field flex-1 text-xs"
                placeholder="לדוגמה: קריין יוקרתי, איטי, חם ומדויק"
              />
              <button onClick={saveCustomStyle} className="btn btn-quiet !bg-ink !text-bg !px-3 text-[11px]">
                שמור
              </button>
            </div>
          </div>

          <button onClick={generate} disabled={loadingKey === "generate"} className="btn btn-sun w-full !py-3.5 text-sm sm:!py-4 sm:text-base">
            {loadingKey === "generate" ? <Loader2 size={18} className="animate-spin" /> : null}
            הפק קריינות עכשיו
          </button>
        </div>
      </div>

      <div className="lg:col-span-7">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-ink sm:text-xl">הקלטות אחרונות</h2>
            <p className="text-[11px] text-mute">היסטוריית הקריינות שלך נשמרת בענן</p>
          </div>
          {narrationTracks.length > 0 && (
            <button
              onClick={() => {
                narrationTracks.forEach((t) => store.removeTrack(t.id));
              }}
              className="text-xs font-bold text-mute transition-colors hover:text-danger"
            >
              נקה הכל
            </button>
          )}
        </div>
        <div className="space-y-3 sm:space-y-4">
          {narrationTracks.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-line py-16 text-center text-sm font-bold text-mute sm:rounded-[2.5rem] sm:py-24">
              <Inbox size={28} />
              היסטוריית הקריינות שלך תישמר כאן
            </div>
          ) : (
            narrationTracks.map((t) => <TrackCard key={t.id} track={t} onRemove={store.removeTrack} />)
          )}
        </div>
      </div>
    </div>
  );
}
