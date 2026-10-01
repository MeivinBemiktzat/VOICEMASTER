import { useState } from "react";
import { Check, Copy, KeyRound, Palette, Settings as SettingsIcon, Sparkles, Trash2 } from "lucide-react";
import { useAppStore } from "../lib/AppStore";
import { useToast } from "../lib/ToastContext";
import { useAuth } from "../lib/AuthContext";

function maskKey(key: string) {
  if (key.length <= 10) return key;
  return `${key.slice(0, 6)}...${key.slice(-4)}`;
}

export default function Settings() {
  const { currentApiKey, savedApiKeys, addKey, removeKey, selectKey, accent, setAccent, compact, setCompact } = useAppStore();
  const { user, uploadAvatar, logout } = useAuth();
  const [avatarBusy, setAvatarBusy] = useState(false);
  const showToast = useToast();
  const [input, setInput] = useState("");

  const handleAdd = () => {
    if (!input.trim()) return;
    addKey(input);
    setInput("");
    showToast("מפתח ה-API נשמר", "success");
  };

  const handleCopy = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key);
      showToast("מפתח ה-API הועתק", "success");
    } catch {
      showToast("לא ניתן להעתיק את המפתח");
    }
  };

  return (
    <section className="mx-auto max-w-4xl">
      <div className="mb-7 flex items-start gap-4">
        <div className="rounded-2xl bg-brand/10 p-3 text-brand"><SettingsIcon size={26} /></div>
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-brand">התאמה אישית</p>
          <h2 className="font-display text-3xl font-black tracking-tight text-ink sm:text-4xl">הגדרות האתר</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-mute">נהלו את מפתחות Gemini והתאימו את חוויית השימוש באתר לפי ההעדפות שלכם.</p>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
      <div className="card rounded-[2rem] p-5 sm:col-span-2 sm:p-7">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand text-2xl font-black text-onbrand">
            {user?.avatarDataUrl ? <img src={user.avatarDataUrl} alt="תמונת פרופיל" className="size-full object-cover" /> : (user?.username?.[0] || "?").toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-lg font-black text-ink">{user?.username}</h3>
            <p className="text-xs text-mute">תמונת הפרופיל נשמרת בחשבון שלכם.</p>
            <label className="btn btn-outline mt-3 inline-flex cursor-pointer">
              {avatarBusy ? "מעלה..." : "החלפת תמונת פרופיל"}
              <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" disabled={avatarBusy} onChange={async e => { const file=e.target.files?.[0]; if(!file)return; setAvatarBusy(true); try{await uploadAvatar(file);showToast("תמונת הפרופיל עודכנה","success");}catch(err){showToast(err instanceof Error?err.message:"לא ניתן לעדכן תמונה");}finally{setAvatarBusy(false);}}}/>
            </label>
          </div>
          <button onClick={async()=>{await logout();showToast("התנתקת");}} className="btn btn-outline !text-danger">התנתקות</button>
        </div>
      </div>


        <div className="card rounded-[2rem] p-5 sm:col-span-2 sm:p-7">
          <div className="mb-4 flex items-center gap-3"><div className="rounded-xl bg-brand/10 p-2 text-brand"><KeyRound size={19} /></div><div><h3 className="font-display text-lg font-black text-ink">מפתחות Gemini API</h3><p className="text-xs text-mute">שמירה מקומית בדפדפן בלבד</p></div></div>
          <p className="mb-4 text-sm leading-6 text-mute">הוסיפו מפתח, בחרו מפתח פעיל והחליפו ביניהם בכל עת. המפתח אינו נשלח לשרת שלנו.</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input type="password" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAdd()} className="field flex-1" placeholder="הדביקו כאן מפתח Gemini" aria-label="מפתח Gemini חדש" />
            <button onClick={handleAdd} className="btn btn-primary sm:px-6">הוסף מפתח</button>
          </div>
          <div className="mt-5 flex flex-col gap-2">
            {savedApiKeys.length === 0 ? <p className="rounded-xl bg-soft/60 px-4 py-3 text-xs text-mute">אין מפתחות שמורים עדיין</p> : savedApiKeys.map((key) => <div key={key} className="flex items-center gap-2 rounded-xl border border-line bg-bg/60 px-3 py-2.5"><button onClick={() => selectKey(key)} className={`flex-1 truncate text-right text-xs font-bold ${key === currentApiKey ? "text-brand" : "text-mute"}`}>{key === currentApiKey && <Check size={13} className="ms-1 inline" />} {maskKey(key)}</button><button onClick={() => handleCopy(key)} className="rounded-lg p-1.5 text-mute hover:bg-soft hover:text-brand" title="העתק"><Copy size={14} /></button><button onClick={() => removeKey(key)} className="rounded-lg p-1.5 text-mute hover:bg-soft hover:text-danger" title="מחק"><Trash2 size={14} /></button></div>)}
          </div>
        </div>

        <div className="card rounded-[2rem] p-5 sm:p-7">
          <div className="mb-4 flex items-center gap-3"><div className="rounded-xl bg-brand/10 p-2 text-brand"><Palette size={19} /></div><h3 className="font-display text-lg font-black text-ink">צבע הדגשה</h3></div>
          <p className="mb-4 text-xs leading-5 text-mute">בחרו את האופי הצבעוני של הממשק.</p>
          <div className="flex gap-2" role="group" aria-label="בחירת צבע הדגשה">{[{ name: "blue", label: "כחול", className: "bg-brand" }, { name: "violet", label: "סגול", className: "bg-violet-500" }, { name: "sun", label: "זהב", className: "bg-sun" }].map((item) => <button key={item.name} onClick={() => setAccent(item.name)} className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-2 py-2 text-xs font-bold transition ${accent === item.name ? "border-brand bg-brand/10 text-ink" : "border-line text-mute hover:border-brand"}`}><span className={`size-3 rounded-full ${item.className}`} />{item.label}</button>)}</div>
        </div>

        <div className="card rounded-[2rem] p-5 sm:p-7">
          <div className="mb-4 flex items-center gap-3"><div className="rounded-xl bg-brand/10 p-2 text-brand"><Sparkles size={19} /></div><h3 className="font-display text-lg font-black text-ink">תצוגה</h3></div>
          <label className="flex cursor-pointer items-center justify-between gap-3 text-sm font-bold text-ink"><span>מרווחים קומפקטיים</span><input type="checkbox" checked={compact} onChange={(e) => setCompact(e.target.checked)} className="size-4 accent-brand" /></label>
          <p className="mt-3 text-xs leading-5 text-mute">מצמצם מעט את הרווחים כדי להציג יותר תוכן במסך.</p>
        </div>
      </div>
    </section>
  );
}
