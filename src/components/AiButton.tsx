import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";

interface AiButtonProps {
  onClick: () => void;
  loading: boolean;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
}

export default function AiButton({ onClick, loading, disabled, children, className = "" }: AiButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      className={`btn btn-quiet !py-2 text-[11px] sm:text-xs ${className}`}
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : null}
      <span>{children}</span>
    </button>
  );
}
