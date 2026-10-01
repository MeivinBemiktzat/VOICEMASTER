import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";

type ToastType = "success" | "error";
interface ToastState {
  message: string;
  type: ToastType;
  visible: boolean;
}

const ToastContext = createContext<(message: string, type?: ToastType) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState>({ message: "", type: "error", visible: false });
  const timerRef = useRef<number | undefined>(undefined);

  const showToast = useCallback((message: string, type: ToastType = "error") => {
    window.clearTimeout(timerRef.current);
    setToast({ message, type, visible: true });
    timerRef.current = window.setTimeout(() => {
      setToast((t) => ({ ...t, visible: false }));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className={`card fixed bottom-6 left-4 right-4 z-[60] flex max-w-md items-center gap-3 px-4 py-3 transition-all duration-300 sm:right-auto sm:left-6 ${
          toast.visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
        }`}
      >
        {toast.type === "error" ? (
          <AlertCircle size={20} className="shrink-0 text-danger" />
        ) : (
          <CheckCircle2 size={20} className="shrink-0 text-ok" />
        )}
        <span className="text-sm font-bold text-ink">{toast.message}</span>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
