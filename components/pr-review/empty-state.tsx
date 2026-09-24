import { Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { JevMark } from "@/components/ui/icons";
import { PR_REVIEW_QUESTIONS } from "@/lib/jev/questions";
import { AnalysisButton } from "./analysis-button";

const SHAPES: Record<string, string> = {
  choice: "bug | feature | refactor | …",
  score: "0 ─── 3",
  noul: "0.0 … 1.0",
};

export function EmptyState({
  hasContext,
  onAnalyze,
  onLoadDemo,
}: {
  hasContext: boolean;
  onAnalyze: () => void;
  onLoadDemo: () => void;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-dashed border-line-strong bg-surface/60 motion-safe:animate-fade">
      <div aria-hidden className="bg-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
      <div className="relative px-6 py-12 text-center sm:px-10 sm:py-16">
        <span className="mx-auto grid size-12 place-items-center rounded-xl border border-accent-line bg-accent-soft text-accent-text">
          <JevMark className="size-6" />
        </span>
        <h2 className="mt-5 text-xl font-semibold tracking-tight text-fg">Ready to review your Pull Request</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-fg-muted">
          Paste your PR context and let Jev turn it into structured engineering decisions.
        </p>

        {/* The four questions awaiting answers */}
        <ul aria-label="Questions Jev will answer" className="mx-auto mt-8 grid max-w-lg gap-2 text-left sm:grid-cols-2">
          {Object.entries(PR_REVIEW_QUESTIONS).map(([name, question], index) => (
            <li
              key={name}
              className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface px-3 py-2.5 shadow-card motion-safe:animate-rise"
              style={{ animationDelay: `${100 + index * 70}ms` }}
            >
              <span className="min-w-0">
                <code className="block truncate font-mono text-xs font-medium text-fg">{name}</code>
                <span className="block truncate font-mono text-[11px] text-fg-subtle">{SHAPES[question.type]}</span>
              </span>
              <span className="shrink-0 rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-fg-muted">
                {question.type}
              </span>
            </li>
          ))}
        </ul>

        <div className="mx-auto mt-8 flex max-w-xs flex-col gap-2">
          {hasContext ? (
            <>
              <AnalysisButton isAnalyzing={false} onClick={onAnalyze} />
              <p className="text-xs text-fg-subtle">The demo PR is loaded and ready.</p>
            </>
          ) : (
            <Button size="lg" onClick={onLoadDemo}>
              <Wand2 aria-hidden />
              Load Demo PR
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
