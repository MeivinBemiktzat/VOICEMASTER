import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Mic2, Moon, Sun, KeyRound, Menu, X, Copy, Trash2, Check, Settings, Palette, Sparkles } from "lucide-react";
import { useDarkMode } from "../hooks/useDarkMode";
import { useAppStore } from "../lib/AppStore";
import { useToast } from "../lib/ToastContext";

const NAV_LINKS = [
  { to: "/", label: "בית", end: true },
  { to: "/narration", label: "סטודיו קריינות" },
  { to: "/podcast", label: "סטודיו פודקאסט" },
  { to: "/history", label: "היסטוריה" },
  { to: "/settings", label: "הגדרות" },
  { to: "/about", label: "אודות" },
];

function maskKey(key: string) {
  if (key.length <= 10) return key;
  return `${key.slice(0, 6)}...${key.slice(-4)}`;
}

function SettingsDialog({ onClose }: { onClose: () => void }) {
  const { currentApiKey, savedApiKeys, addKey, removeKey, selectKey } = useAppStore();
  const showToast = useToast();
  const [input, setInput] = useState("");
  const [accent, setAccent] = useState("blue");
  const [compact, setCompact] = useState(false);

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
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/25 p-4 backdrop-blur-sm sm:items-center" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section className="card w-full max-w-2xl overflow-hidden rounded-[2rem] shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <div className="flex items-center justify-between border-b border-line bg-soft/50 px-5 py-4 sm:px-7">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-brand/10 p-2 text-brand"><Settings size={20} /></div>
            <div><h2 id="settings-title" className="font-display text-lg font-black text-ink">הגדרות האתר</h2><p className="text-xs text-mute">התאימו את הממשק ושמרו את המפתח שלכם</p></div>
          </div>
          <button onClick={onClose} className="btn btn-outline !size-9 !p-0" aria-label="סגור הגדרות"><X size={17} /></button>
        </div>
        <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-7">
          <div className="rounded-2xl border border-line bg-bg/60 p-4 sm:col-span-2">
            <div className="mb-3 flex items-center gap-2"><KeyRound size={17} className="text-brand" /><h3 className="font-bold text-ink">מפתחות Gemini API</h3></div>
            <p className="mb-3 text-xs leading-5 text-mute">המפתחות נשמרים מקומית בדפדפן בלבד. בחרו מפתח פעיל או הוסיפו מפתח חדש.</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input type="password" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAdd()} className="field flex-1" placeholder="הדביקו כאן מפתח Gemini" aria-label="מפתח Gemini חדש" />
              <button onClick={handleAdd} className="btn btn-primary sm:px-5">הוסף מפתח</button>
            </div>
            <div className="mt-4 flex flex-col gap-2">
              {savedApiKeys.length === 0 ? <p className="text-xs text-mute">אין מפתחות שמורים עדיין</p> : savedApiKeys.map((key) => <div key={key} className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2"><button onClick={() => selectKey(key)} className={`flex-1 truncate text-right text-xs font-bold ${key === currentApiKey ? "text-brand" : "text-mute"}`}>{key === currentApiKey && <Check size={12} className="ms-1 inline" />} {maskKey(key)}</button><button onClick={() => handleCopy(key)} className="rounded-lg p-1.5 text-mute hover:bg-soft hover:text-brand" title="העתק"><Copy size={13} /></button><button onClick={() => removeKey(key)} className="rounded-lg p-1.5 text-mute hover:bg-soft hover:text-danger" title="מחק"><Trash2 size={13} /></button></div>)}
            </div>
          </div>
          <div className="rounded-2xl border border-line bg-bg/60 p-4">
            <div className="mb-3 flex items-center gap-2"><Palette size={17} className="text-brand" /><h3 className="font-bold text-ink">צבע הדגשה</h3></div>
            <div className="flex gap-2" role="group" aria-label="בחירת צבע הדגשה">
              {[{ name: "blue", label: "כחול", className: "bg-brand" }, { name: "violet", label: "סגול", className: "bg-violet-500" }, { name: "sun", label: "זהב", className: "bg-sun" }].map((item) => <button key={item.name} onClick={() => setAccent(item.name)} className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-2 py-2 text-xs font-bold transition ${accent === item.name ? "border-brand bg-brand/10 text-ink" : "border-line text-mute hover:border-brand"}`}><span className={`size-3 rounded-full ${item.className}`} />{item.label}</button>)}
            </div>
          </div>
          <div className="rounded-2xl border border-line bg-bg/60 p-4">
            <div className="mb-3 flex items-center gap-2"><Sparkles size={17} className="text-brand" /><h3 className="font-bold text-ink">תצוגה</h3></div>
            <label className="flex cursor-pointer items-center justify-between gap-3 text-xs font-bold text-ink"><span>מרווחים קומפקטיים</span><input type="checkbox" checked={compact} onChange={(e) => setCompact(e.target.checked)} className="size-4 accent-brand" /></label>
            <p className="mt-2 text-[11px] leading-5 text-mute">מצמצם מעט את הרווחים בממשק כדי להציג יותר תוכן.</p>
          </div>
        </div>
        <div className="flex justify-end border-t border-line px-5 py-4 sm:px-7"><button onClick={onClose} className="btn btn-primary">סיום ושמירה</button></div>
      </section>
    </div>
  );
}

function ApiKeyPopover() {
  const { currentApiKey, savedApiKeys, addKey, removeKey, selectKey } = useAppStore();
  const showToast = useToast();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

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
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="btn btn-outline !px-2.5 sm:!px-3"
        aria-label="ניהול מפתחות API"
        title="ניהול מפתחות API"
      >
        <KeyRound size={18} />
        <span className="hidden sm:inline">{currentApiKey ? "✓ מפתח פעיל" : "הגדר מפתח"}</span>
      </button>
      {open && (
        <div className="card absolute left-0 top-[calc(100%+10px)] z-50 w-[min(360px,calc(100vw-24px))] rounded-2xl p-4 shadow-2xl sm:left-auto sm:right-0">
          <h4 className="mb-1 text-sm font-bold text-ink">
            <span className="text-brand">●</span> ניהול מפתחות API
          </h4>
          <p className="mb-3 text-xs text-mute">
            הוסיפו כמה מפתחות Gemini, בחרו מפתח פעיל, העתיקו או מחקו. המפתחות נשמרים מקומית בדפדפן בלבד.
          </p>
          <div className="flex gap-2">
            <input
              type="password"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              className="field flex-1 !py-2 text-xs"
              placeholder="הדביקו כאן מפתח Gemini"
            />
            <button onClick={handleAdd} className="btn btn-primary !px-3 !py-2 text-[11px]">
              הוסף
            </button>
          </div>
          <div className="mt-3 border-t border-line pt-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-bold text-mute">מפתחות שמורים</span>
              <span className="text-[10px] text-mute">{savedApiKeys.length}</span>
            </div>
            {savedApiKeys.length === 0 ? (
              <div className="text-[10px] text-mute">אין מפתחות שמורים</div>
            ) : (
              <div className="space-y-2">
                {savedApiKeys.map((key) => (
                  <div
                    key={key}
                    className="flex items-center gap-1 rounded-lg border border-line bg-bg px-2 py-1.5"
                  >
                    <button
                      onClick={() => selectKey(key)}
                      className={`flex-1 truncate text-right text-[10px] font-bold ${
                        key === currentApiKey ? "text-brand" : "text-mute"
                      }`}
                    >
                      {key === currentApiKey && <Check size={11} className="ms-1 inline" />} {maskKey(key)}
                    </button>
                    <button
                      onClick={() => handleCopy(key)}
                      className="shrink-0 rounded p-1 text-mute hover:text-brand"
                      title="העתק"
                    >
                      <Copy size={12} />
                    </button>
                    <button
                      onClick={() => removeKey(key)}
                      className="shrink-0 rounded p-1 text-mute hover:text-danger"
                      title="מחק"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Layout() {
  const { isDark, toggle } = useDarkMode();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="site-shell relative min-h-screen">
      <div className="fixed-background-layer" aria-hidden="true" />
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
        <div className="ambient-orb orb-blue absolute -right-24 -top-20 size-[28rem] rounded-full" />
        <div className="ambient-orb orb-violet absolute left-[18%] top-[28%] size-72 rounded-full" />
        <div className="ambient-orb orb-gold absolute -left-24 bottom-[8%] size-[26rem] rounded-full" />
        <div className="ambient-orb orb-pink absolute right-[18%] bottom-[18%] size-52 rounded-full" />
        <div className="ambient-dot dot-one absolute right-[28%] top-[18%] size-5 rounded-full" />
        <div className="ambient-dot dot-two absolute left-[12%] top-[52%] size-3 rounded-full" />
        <div className="ambient-dot dot-three absolute right-[8%] bottom-[12%] size-4 rounded-full" />
      </div>

      <header className="site-header sticky top-0 z-40 border-b border-white/10 bg-bg/45 shadow-sm backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <NavLink to="/" className="flex items-center gap-2.5 sm:gap-3">
            <img src="/voicemaster-logo.png" alt="VoiceMaster" className="h-12 w-[60px] object-contain drop-shadow-lg sm:h-14 sm:w-[70px]" />
            <div>
              <h1 className="font-display text-xl font-black leading-none tracking-tight text-ink sm:text-2xl">
                Voice<span className="text-brand">Master</span>
              </h1>
              <p className="mt-0.5 text-[9px] font-bold uppercase tracking-widest text-mute sm:text-[10px]">
                AI Smart Narration Hub
              </p>
            </div>
          </NavLink>

          <nav className="hidden items-center gap-1 lg:flex">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `rounded-xl px-3.5 py-2 text-sm font-bold transition-colors ${
                    isActive ? "bg-brand text-onbrand" : "text-mute hover:bg-soft hover:text-ink"
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={toggle}
              className="btn btn-outline !px-2.5 sm:!px-3"
              aria-label="החלף מצב לילה"
              title="החלף מצב לילה"
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              onClick={() => setMobileOpen((o) => !o)}
              className="btn btn-outline !px-2.5 lg:hidden"
              aria-label="תפריט"
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <nav className="flex flex-col gap-1 border-t border-line px-4 py-3 lg:hidden">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `rounded-xl px-3.5 py-2.5 text-sm font-bold transition-colors ${
                    isActive ? "bg-brand text-onbrand" : "text-mute hover:bg-soft hover:text-ink"
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
        <Outlet />
      </main>

      <footer className="mx-auto max-w-7xl px-4 pb-10 pt-6 sm:px-6">
        <div className="card rounded-2xl p-6 text-center sm:rounded-[2rem] sm:p-7">
          <p className="text-base font-black text-ink sm:text-lg">אתר זה פותח על ידי אריה AI</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs font-bold sm:text-sm">
            <a className="text-brand transition-colors hover:text-ink" href="https://mitmachim.top/user/%D7%90%D7%A8%D7%99%D7%94-ai" target="_blank" rel="noreferrer">
              אריה AI במתמחים טופ
            </a>
            <span className="text-line" aria-hidden="true">·</span>
            <a className="text-brand transition-colors hover:text-ink" href="https://f2.freeivr.co.il/user/%D7%90%D7%A8%D7%99%D7%94-ai" target="_blank" rel="noreferrer">
              אריה AI בפורום ימות
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
