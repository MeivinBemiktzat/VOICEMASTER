import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Mic2, Moon, Sun, KeyRound, Menu, X, Copy, Trash2, Check } from "lucide-react";
import { useDarkMode } from "../hooks/useDarkMode";
import { useAppStore } from "../lib/AppStore";
import { useToast } from "../lib/ToastContext";

const NAV_LINKS = [
  { to: "/", label: "בית", end: true },
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
    <div className="relative min-h-screen">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -right-20 -top-10 h-72 w-72 rounded-full bg-brand/10 blur-[100px]" />
        <div className="absolute -left-16 bottom-10 h-72 w-72 rounded-full bg-sun/10 blur-[100px]" />
      </div>

      <header className="sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <NavLink to="/" className="flex items-center gap-2.5 sm:gap-3">
            <div className="rounded-2xl bg-gradient-to-br from-brand via-violet-500 to-sun p-2 text-white shadow-lg ring-8 ring-brand/10 sm:p-2.5">
              <Mic2 size={22} />
            </div>
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
            <ApiKeyPopover />
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
          <p className="mt-2 text-xs text-mute sm:text-sm">
            הפקת קריינות ופודקאסטים בעברית באמצעות בינה מלאכותית · {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}
