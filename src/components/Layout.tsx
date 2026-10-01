import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { KeyRound, Menu, Moon, Sun, X, Copy, Trash2, Check, ArrowUpLeft } from "lucide-react";
import { useDarkMode } from "../hooks/useDarkMode";
import { useAppStore } from "../lib/AppStore";
import { useToast } from "../lib/ToastContext";

const NAV_LINKS = [
  { to: "/", label: "סקירה", end: true },
  { to: "/narration", label: "סטודיו קריינות" },
  { to: "/podcast", label: "סטודיו פודקאסט" },
  { to: "/history", label: "היסטוריה" },
  { to: "/about", label: "אודות" },
];

function maskKey(key: string) {
  if (key.length <= 10) return key;
  return `${key.slice(0, 6)}...${key.slice(-4)}`;
}

function ApiKeyPopover() {
  const { currentApiKey, savedApiKeys, addKey, removeKey, selectKey } = useAppStore();
  const showToast = useToast();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
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
      <button onClick={() => setOpen((value) => !value)} className="icon-button" aria-label="ניהול מפתחות API" title="ניהול מפתחות API">
        <KeyRound size={17} />
        <span className="hidden sm:inline">{currentApiKey ? "מפתח פעיל" : "חיבור API"}</span>
      </button>
      {open && (
        <div className="card absolute left-0 top-[calc(100%+12px)] z-50 w-[min(360px,calc(100vw-24px))] rounded-2xl p-4 shadow-2xl sm:left-auto sm:right-0">
          <h4 className="mb-1 text-sm font-black text-ink">ניהול מפתחות API</h4>
          <p className="mb-3 text-xs leading-5 text-mute">הוסיפו מפתחות Gemini, בחרו מפתח פעיל, העתיקו או מחקו. המפתחות נשמרים בדפדפן בלבד.</p>
          <div className="flex gap-2">
            <input type="password" value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => event.key === "Enter" && handleAdd()} className="field flex-1 !py-2 text-xs" placeholder="הדביקו כאן מפתח Gemini" />
            <button onClick={handleAdd} className="btn btn-primary !px-3 !py-2 text-[11px]">הוסף</button>
          </div>
          <div className="mt-3 border-t border-line pt-3">
            <div className="mb-2 flex items-center justify-between"><span className="text-[10px] font-bold text-mute">מפתחות שמורים</span><span className="text-[10px] text-mute">{savedApiKeys.length}</span></div>
            {savedApiKeys.length === 0 ? <div className="text-[10px] text-mute">אין מפתחות שמורים</div> : <div className="flex flex-col gap-2">{savedApiKeys.map((key) => <div key={key} className="flex items-center gap-1 rounded-lg border border-line bg-bg px-2 py-1.5"><button onClick={() => selectKey(key)} className={`flex-1 truncate text-right text-[10px] font-bold ${key === currentApiKey ? "text-brand" : "text-mute"}`}>{key === currentApiKey && <Check size={11} className="ms-1 inline" />} {maskKey(key)}</button><button onClick={() => handleCopy(key)} className="shrink-0 rounded p-1 text-mute hover:text-brand" title="העתק"><Copy size={12} /></button><button onClick={() => removeKey(key)} className="shrink-0 rounded p-1 text-mute hover:text-danger" title="מחק"><Trash2 size={12} /></button></div>)}</div>}
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
    <div className="min-h-screen">
      <header className="site-header">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-3 sm:px-8">
          <NavLink to="/" className="brand-lockup">
            <img src="/voicemaster-logo.png" alt="VoiceMaster" className="brand-mark" />
            <div><div className="brand-name">Voice<span>Master</span></div><div className="brand-caption">AI VOICE STUDIO</div></div>
          </NavLink>
          <nav className="hidden items-center gap-1 lg:flex">{NAV_LINKS.map((link) => <NavLink key={link.to} to={link.to} end={link.end} className={({ isActive }) => `nav-link ${isActive ? "nav-link-active" : ""}`}>{link.label}</NavLink>)}</nav>
          <div className="flex items-center gap-2"><ApiKeyPopover /><button onClick={toggle} className="icon-button !px-2.5" aria-label="החלף מצב לילה" title="החלף מצב לילה">{isDark ? <Sun size={17} /> : <Moon size={17} />}</button><button onClick={() => setMobileOpen((value) => !value)} className="icon-button !px-2.5 lg:hidden" aria-label="תפריט">{mobileOpen ? <X size={17} /> : <Menu size={17} />}</button></div>
        </div>
        {mobileOpen && <nav className="flex flex-col gap-1 border-t border-line px-4 py-3 lg:hidden">{NAV_LINKS.map((link) => <NavLink key={link.to} to={link.to} end={link.end} onClick={() => setMobileOpen(false)} className={({ isActive }) => `nav-link ${isActive ? "nav-link-active" : ""}`}>{link.label}</NavLink>)}</nav>}
      </header>
      <main className="mx-auto max-w-[1440px] px-4 py-8 sm:px-8 sm:py-12"><Outlet /></main>
      <footer className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 pb-8 pt-2 text-xs text-mute sm:px-8"><span>VoiceMaster Studio · {new Date().getFullYear()}</span><span className="flex items-center gap-1">נוצר עבור יוצרים <ArrowUpLeft size={13} /></span></footer>
    </div>
  );
}
