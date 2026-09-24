import { ArrowDown, FlaskConical, GitPullRequest, Info, UserRoundCheck } from "lucide-react";
import type { ReactNode, Ref } from "react";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import type { DecisionSource } from "@/lib/review/api";
import { DEFAULT_WORKFLOW_CONFIG } from "@/lib/review/config";
import type { AnalyzeErrorKind } from "@/lib/review/errors";
import { formatDuration } from "@/lib/review/format";
import type { ReviewModel } from "@/lib/review/model";
import type { PrContext } from "@/lib/review/validation";
import type { WorkflowPreview } from "@/lib/review/workflow";
import { AutomationPreview } from "./automation-preview";
import { ChangedFiles } from "./changed-files";
import { DecisionCard } from "./decision-card";
import { DecisionSignals } from "./decision-signals";
import { PrContextSummary, type SignalEvidence } from "./pr-context";
import { ReviewSummary } from "./review-summary";
import { RiskCard } from "./risk-card";
import { TypeCard } from "./type-card";

export interface ReviewResult {
  id: string;
  source: DecisionSource;
  fallbackFrom?: AnalyzeErrorKind;
  context: PrContext;
  model: ReviewModel;
  workflow: WorkflowPreview;
  durationMs: number;
  receivedAt: string;
}

interface ReviewBodyProps {
  model: ReviewModel;
  workflow: WorkflowPreview;
  context: PrContext;
  /** Real PRs: total can exceed the listed paths (GitHub/storage limits). */
  filesTruncated?: boolean;
  evidence?: SignalEvidence;
  /** Real PRs: labels were actually applied on GitHub, not just simulated. */
  labelsApplied?: boolean;
}

/** The decision cards — identical for demo and real PRs. */
export function ReviewBody({ model, workflow, context, filesTruncated, evidence, labelsApplied }: ReviewBodyProps) {
  const threshold = (label: string, value: number) => ({ value, label: `${label} ≥ ${value.toFixed(2)}` });
  return (
    <>
      <ReviewSummary model={model} />
      <RiskCard risk={model.risk} />

      <div className="grid gap-4 xl:grid-cols-2">
        <TypeCard type={model.type} />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <DecisionCard
            id="review-title"
            title="Human Review"
            icon={<UserRoundCheck />}
            decision={model.humanReview}
            description="Probability that this PR requires careful human review before merging."
            threshold={threshold("needs-review", DEFAULT_WORKFLOW_CONFIG.needsReviewThreshold)}
            delayMs={180}
          />
          <DecisionCard
            id="tests-title"
            title="Additional Tests"
            icon={<FlaskConical />}
            decision={model.tests}
            description="Probability that additional automated tests may be required before merging."
            threshold={threshold("needs-tests", DEFAULT_WORKFLOW_CONFIG.needsTestsThreshold)}
            delayMs={240}
          />
        </div>
      </div>

      <DecisionSignals signals={model.signals} />

      <div className="grid gap-4 md:grid-cols-2">
        <PrContextSummary context={context} evidence={evidence} />
        <ChangedFiles files={context.changedFiles} total={context.filesChanged} truncated={filesTruncated} />
      </div>

      <AutomationPreview workflow={workflow} applied={labelsApplied} />
    </>
  );
}

/** Demo-mode review: form-submitted context, clearly marked as a demo. */
export function ReviewResults({
  result,
  headingRef,
  staleNotice,
}: {
  result: ReviewResult;
  headingRef: Ref<HTMLHeadingElement>;
  staleNotice?: ReactNode;
}) {
  const { model, context } = result;
  const receivedAt = new Date(result.receivedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 ref={headingRef} tabIndex={-1} className="text-xl font-semibold tracking-tight text-fg focus:outline-none">
              PR Review
            </h2>
            <Badge tone="accent" className="font-semibold tracking-[0.08em]">
              DEMO
            </Badge>
          </div>
          <p className="mt-1 flex min-w-0 items-center gap-1.5 text-sm text-fg-muted">
            <GitPullRequest aria-hidden className="size-3.5 shrink-0 text-fg-subtle" />
            <span className="truncate">{context.title}</span>
            <span className="shrink-0 text-xs text-fg-subtle">· context entered manually</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-fg-subtle">
          {result.source === "sample" ? (
            <Badge tone="moderate">Documented example response</Badge>
          ) : (
            <Badge tone="low">
              <span aria-hidden className="size-1.5 rounded-full bg-risk-low" />
              Live Jev decision
            </Badge>
          )}
          {result.source === "jev" && <span>in {formatDuration(result.durationMs)}</span>}
          <span aria-hidden>·</span>
          <time dateTime={result.receivedAt}>{receivedAt}</time>
          <a href="#api" className={buttonClasses("ghost", "sm", "ml-1")}>
            Raw decision
            <ArrowDown aria-hidden />
          </a>
        </div>
      </header>

      {result.source === "sample" && (
        <div className="flex gap-2.5 rounded-lg border border-risk-moderate/30 bg-[var(--risk-moderate-soft)] px-3.5 py-3 text-[13px] leading-5 text-[var(--risk-moderate-text)]">
          <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
          <p>
            {result.fallbackFrom ? (
              <>
                <strong className="font-semibold">Jev was unavailable</strong> (<code className="font-mono">{result.fallbackFrom}</code>),
                so the demo PR is showing Jev&apos;s documented example response instead of a live decision.
              </>
            ) : (
              <>
                <strong className="font-semibold">Sample mode.</strong> This is Jev&apos;s documented example response for the
                demo PR — it was not generated from the context you submitted. Set{" "}
                <code className="font-mono">JEV_USE_SAMPLE_RESPONSE=false</code> for live decisions.
              </>
            )}
          </p>
        </div>
      )}

      {staleNotice}

      <ReviewBody model={model} workflow={result.workflow} context={context} />
    </div>
  );
}
