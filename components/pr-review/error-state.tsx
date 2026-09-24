import { RefreshCw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AnalyzeFailure } from "@/lib/review/api";

export function ErrorState({
  error,
  onRetry,
  onDismiss,
}: {
  error: AnalyzeFailure["error"];
  onRetry: () => void;
  onDismiss: () => void;
}) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-risk-critical/25 bg-surface p-6 shadow-card motion-safe:animate-rise sm:p-8"
    >
      <div className="flex flex-col gap-5 sm:flex-row">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--risk-critical-soft)] text-[var(--risk-critical-text)]">
          <TriangleAlert aria-hidden className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold tracking-tight text-fg">{error.title}</h2>
          <p className="mt-1 text-sm leading-6 text-fg-muted">{error.message}</p>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {error.retryable && (
              <Button variant="primary" onClick={onRetry}>
                <RefreshCw aria-hidden />
                Try again
              </Button>
            )}
            <Button onClick={onDismiss}>{error.retryable ? "Dismiss" : "Back to form"}</Button>
            <code className="ml-auto rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] text-fg-subtle">
              error: {error.kind}
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}
