import { LoaderCircle } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { JevMark } from "@/components/ui/icons";

interface AnalysisButtonProps {
  isAnalyzing: boolean;
  /** Renders a plain button with onClick instead of a form submit. */
  onClick?: () => void;
  className?: string;
}

export function AnalysisButton({ isAnalyzing, onClick, className }: AnalysisButtonProps) {
  return (
    <button
      type={onClick ? "button" : "submit"}
      onClick={onClick}
      disabled={isAnalyzing}
      aria-busy={isAnalyzing}
      className={buttonClasses("primary", "lg", `w-full ${className ?? ""}`)}
    >
      {isAnalyzing ? (
        <LoaderCircle aria-hidden className="motion-safe:animate-spin" />
      ) : (
        <JevMark aria-hidden />
      )}
      {isAnalyzing ? "Analyzing…" : "Analyze with Jev"}
      {!isAnalyzing && !onClick && (
        <kbd className="ml-1 hidden rounded border border-white/25 px-1 font-sans text-[10px] font-medium text-white/80 sm:inline">
          Ctrl ↵
        </kbd>
      )}
    </button>
  );
}
