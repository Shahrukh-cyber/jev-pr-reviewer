"use client";

import { Info } from "lucide-react";
import { useMemo, useRef, useState, type ReactNode } from "react";
import { LiveReview } from "@/components/live/live-review";
import { LiveNotConfigured, PullList } from "@/components/live/pull-list";
import { useLiveReviews } from "@/components/live/use-live-reviews";
import { Badge } from "@/components/ui/badge";
import { buildDecisionRequest } from "@/lib/jev/questions";
import { parseJevResponse } from "@/lib/jev/schema";
import type { JevDecisionRequest } from "@/lib/jev/types";
import type { AnalyzeFailure, AnalyzeResponse, AnalyzeSuccess } from "@/lib/review/api";
import { ANALYZE_ERROR_COPY, isAnalyzeErrorKind, type AnalyzeErrorKind } from "@/lib/review/errors";
import { toReviewModel } from "@/lib/review/model";
import {
  DEMO_FORM,
  EMPTY_FORM,
  formValuesToInput,
  validatePrContext,
  type FieldErrors,
  type PrContextField,
  type PrFormValues,
} from "@/lib/review/validation";
import { deriveWorkflow } from "@/lib/review/workflow";
import type { ReviewedRepository } from "@/lib/reviews/api";
import { AnalysisLoading, type AnalysisStage } from "./analysis-loading";
import { EmptyState } from "./empty-state";
import { ErrorState } from "./error-state";
import { FIELD_IDS, PrInputForm } from "./pr-input-form";
import { ApiInspector } from "./raw-response";
import { ModeSwitch, type ReviewMode } from "./mode-switch";
import { ReviewResults, type ReviewResult } from "./review-results";

const CLIENT_TIMEOUT_MS = 45_000;
const FIELD_ORDER = Object.keys(FIELD_IDS) as PrContextField[];

type AnalysisState =
  | { status: "idle" }
  | { status: "loading"; stage: AnalysisStage; startedAt: number }
  | { status: "error"; error: AnalyzeFailure["error"] }
  | { status: "success" };

interface Completed {
  result: ReviewResult;
  raw: unknown;
  request: JevDecisionRequest;
}

function clientError(kind: AnalyzeErrorKind): AnalyzeFailure["error"] {
  return { kind, ...ANALYZE_ERROR_COPY[kind] };
}

function isAnalyzeResponse(value: unknown): value is AnalyzeResponse {
  if (typeof value !== "object" || value === null || !("ok" in value)) return false;
  if (value.ok === true) return "raw" in value && "request" in value && "source" in value;
  return (
    "error" in value &&
    typeof value.error === "object" &&
    value.error !== null &&
    "kind" in value.error &&
    isAnalyzeErrorKind(value.error.kind)
  );
}

// A short beat so the completed checklist is perceivable. Uses setTimeout rather than
// requestAnimationFrame, which never fires while the tab is in the background.
const renderBeat = () => new Promise<void>((resolve) => setTimeout(resolve, 180));

function syncUrl(mode: ReviewMode, pr: number | null) {
  const url = new URL(window.location.href);
  if (mode === "live") {
    url.searchParams.set("mode", "live");
    if (pr !== null) url.searchParams.set("pr", String(pr));
    else url.searchParams.delete("pr");
  } else {
    url.searchParams.delete("mode");
    url.searchParams.delete("pr");
  }
  window.history.replaceState(window.history.state, "", url);
}

interface PrReviewerProps {
  howItWorks: ReactNode;
  /** Repository configured on the server for real PR reviews, if any. */
  liveRepository: ReviewedRepository | null;
  initialMode: ReviewMode;
  initialPr: number | null;
}

export function PrReviewer({ howItWorks, liveRepository, initialMode, initialPr }: PrReviewerProps) {
  const [mode, setModeState] = useState<ReviewMode>(initialMode);
  const live = useLiveReviews(liveRepository, initialPr, mode === "live");
  const liveHeadingRef = useRef<HTMLHeadingElement>(null);
  const [values, setValues] = useState<PrFormValues>(DEMO_FORM);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [state, setState] = useState<AnalysisState>({ status: "idle" });
  const [completed, setCompleted] = useState<Completed | null>(null);
  const [announcement, setAnnouncement] = useState("");

  const abortRef = useRef<AbortController | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const isAnalyzing = state.status === "loading";

  const formContext = useMemo(() => {
    const validation = validatePrContext(formValuesToInput(values));
    return validation.success ? validation.data : null;
  }, [values]);
  const previewRequest = useMemo(() => (formContext ? buildDecisionRequest(formContext) : null), [formContext]);

  const setMode = (next: ReviewMode) => {
    setModeState(next);
    syncUrl(next, next === "live" ? live.selected : null);
  };

  const selectPull = (number: number) => {
    live.select(number);
    syncUrl("live", number);
  };

  const update = (patch: Partial<PrFormValues>) => {
    setValues((current) => ({ ...current, ...patch }));
    setErrors((current) => {
      const next = { ...current };
      for (const key of Object.keys(patch) as PrContextField[]) delete next[key];
      if (patch.changedFiles) delete next.filesChanged;
      delete next.form;
      return next;
    });
  };

  const scrollToResults = () => {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const top = resultsRef.current?.getBoundingClientRect().top ?? 0;
    if (top < 64 || top > window.innerHeight * 0.6) {
      resultsRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    }
  };

  const fail = (error: AnalyzeFailure["error"]) => {
    setState({ status: "error", error });
    setAnnouncement(`${error.title}. ${error.message}`);
    if (error.fieldErrors) setErrors(error.fieldErrors);
    requestAnimationFrame(scrollToResults);
  };

  const analyze = async () => {
    if (isAnalyzing) return;

    // 1. Prepare: validate locally before anything leaves the browser.
    const validation = validatePrContext(formValuesToInput(values));
    if (!validation.success) {
      setErrors(validation.fieldErrors);
      const first = FIELD_ORDER.find((field) => validation.fieldErrors[field]);
      if (first) document.getElementById(FIELD_IDS[first])?.focus();
      setAnnouncement("Some fields need attention before analysis.");
      return;
    }
    setErrors({});
    const context = validation.data;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const startedAt = Date.now();
    setState({ status: "loading", stage: "send", startedAt });
    setAnnouncement("Analyzing pull request with Jev.");
    requestAnimationFrame(scrollToResults);

    // 2. Send
    let response: Response;
    try {
      response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(context),
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(CLIENT_TIMEOUT_MS)]),
      });
    } catch (error) {
      if (controller.signal.aborted) return;
      fail(clientError(error instanceof DOMException && error.name === "TimeoutError" ? "timeout" : "client_network"));
      return;
    }
    if (controller.signal.aborted) return;

    // 3. Receive + validate
    setState({ status: "loading", stage: "receive", startedAt });
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      if (controller.signal.aborted) return;
      fail(clientError(response.ok ? "malformed_response" : "upstream_error"));
      return;
    }
    if (controller.signal.aborted) return;

    if (!isAnalyzeResponse(body)) {
      fail(clientError("malformed_response"));
      return;
    }
    if (!body.ok) {
      fail(body.error);
      return;
    }
    const parsed = parseJevResponse(body.raw);
    if (!parsed.ok) {
      fail(clientError("malformed_response"));
      return;
    }

    // 4. Render
    setState({ status: "loading", stage: "render", startedAt });
    const success: AnalyzeSuccess = body;
    const model = toReviewModel(parsed.decision);
    const result: ReviewResult = {
      id: `${success.receivedAt}-${Math.random().toString(36).slice(2, 8)}`,
      source: success.source,
      fallbackFrom: success.fallbackFrom,
      context,
      model,
      workflow: deriveWorkflow(parsed.decision),
      durationMs: success.durationMs,
      receivedAt: success.receivedAt,
    };
    await renderBeat();
    if (controller.signal.aborted) return;

    setCompleted({ result, raw: success.raw, request: success.request });
    setState({ status: "success" });
    setAnnouncement(
      `Review ready. ${model.type.label}, ${model.risk.nearest.label} risk at ${model.risk.score.toFixed(2)}. Human review ${model.humanReview.percent} percent, additional tests ${model.tests.percent} percent.`,
    );
    requestAnimationFrame(() => {
      scrollToResults();
      headingRef.current?.focus({ preventScroll: true });
    });
  };

  const cancel = () => {
    abortRef.current?.abort();
    setState(completed ? { status: "success" } : { status: "idle" });
    setAnnouncement("Analysis cancelled.");
  };

  const dismissError = () => {
    setState(completed ? { status: "success" } : { status: "idle" });
    const first = FIELD_ORDER.find((field) => errors[field]);
    document.getElementById(FIELD_IDS[first ?? "title"])?.focus();
  };

  const hasContext = values.title.trim() !== "" || values.changedFiles.length > 0;

  let panel: ReactNode;
  if (state.status === "loading") {
    panel = <AnalysisLoading stage={state.stage} startedAt={state.startedAt} onCancel={cancel} />;
  } else if (state.status === "error") {
    panel = <ErrorState error={state.error} onRetry={analyze} onDismiss={dismissError} />;
  } else if (completed) {
    const edited = !formContext || JSON.stringify(formContext) !== JSON.stringify(completed.result.context);
    panel = (
      <ReviewResults
        key={completed.result.id}
        result={completed.result}
        headingRef={headingRef}
        staleNotice={
          edited && (
            <p className="flex items-center gap-2 rounded-lg border border-line bg-surface-2/70 px-3.5 py-2.5 text-[13px] text-fg-muted">
              <Info aria-hidden className="size-4 shrink-0 text-fg-subtle" />
              The form has changed since this analysis. This review reflects the context that was analyzed — analyze again to update it.
            </p>
          )
        }
      />
    );
  } else {
    panel = <EmptyState hasContext={hasContext} onAnalyze={analyze} onLoadDemo={() => update(DEMO_FORM)} />;
  }

  // Raw request/response for the API section follow the active mode.
  const liveData = live.detail.status === "ready" ? live.detail.data : null;
  const liveLatest = liveData?.record?.latest ?? null;
  const inspector =
    mode === "live"
      ? {
          request: liveLatest ? buildDecisionRequest(liveLatest.context) : null,
          requestBadge: "Rebuilt",
          requestSubtitle: "Rebuilt from the PR context stored with the review (same questions the workflow sends).",
          requestEmptyMessage: "Select an analyzed Pull Request to see its request body.",
          raw: liveLatest?.response,
          hasResult: Boolean(liveLatest),
          responseBadge: liveLatest ? <Badge tone="low">LIVE PR #{liveData?.pull.number}</Badge> : undefined,
          responseSubtitle: liveLatest
            ? `Unmodified Jev response for commit ${liveLatest.headSha.slice(0, 7)}, as stored by the workflow.`
            : "No stored decision for the selected PR yet.",
          emptyMessage: "The selected PR hasn't been analyzed yet.",
          resultKey: liveLatest ? `live-${liveData?.pull.number}-${liveLatest.headSha}-${liveLatest.analyzedAt}` : "live-none",
        }
      : {
          request: completed?.request ?? previewRequest,
          requestBadge: completed ? "Sent" : "Preview",
          requestSubtitle: completed ? "The body sent to Jev for the latest analysis." : "Live preview built from the form.",
          requestEmptyMessage: "Complete the Pull Request form to preview the request body.",
          raw: completed?.raw,
          hasResult: Boolean(completed),
          responseBadge: completed ? (
            completed.result.source === "sample" ? (
              <Badge tone="moderate">Documented example</Badge>
            ) : (
              <Badge tone="low">Live Jev</Badge>
            )
          ) : undefined,
          responseSubtitle: completed ? "Unmodified response body from Jev." : "Run an analysis to see Jev's raw response.",
          emptyMessage: "Analyze a Pull Request to inspect Jev's structured output.",
          resultKey: completed?.result.id ?? "none",
        };

  return (
    <>
      <section id="review" aria-labelledby="review-heading" className="scroll-mt-20">
        <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 sm:pt-12 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 id="review-heading" className="text-lg font-semibold tracking-tight text-fg">
                Review a Pull Request
              </h2>
              <p className="mt-0.5 text-[13px] text-fg-muted">
                {mode === "demo"
                  ? "Demo: enter PR context by hand (or load the demo PR) and ask Jev directly."
                  : "Live: real Pull Requests analyzed by the Jev PR Review GitHub Action."}
              </p>
            </div>
            <ModeSwitch mode={mode} onChange={setMode} />
          </div>
        </div>

        {mode === "demo" ? (
          <div className="mx-auto grid max-w-7xl items-start gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[380px_minmax(0,1fr)] lg:px-8 xl:grid-cols-[400px_minmax(0,1fr)]">
            <div className="min-w-0 lg:sticky lg:top-20">
              <PrInputForm
                values={values}
                errors={errors}
                isAnalyzing={isAnalyzing}
                onChange={update}
                onLoadDemo={() => {
                  setValues(DEMO_FORM);
                  setErrors({});
                  setAnnouncement("Demo pull request loaded.");
                }}
                onClear={() => {
                  setValues(EMPTY_FORM);
                  setErrors({});
                  document.getElementById(FIELD_IDS.title)?.focus();
                }}
                onSubmit={analyze}
              />
            </div>
            <div ref={resultsRef} className="min-w-0 scroll-mt-20" aria-busy={isAnalyzing}>
              {panel}
            </div>
          </div>
        ) : (
          <div className="mx-auto grid max-w-7xl items-start gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[380px_minmax(0,1fr)] lg:px-8 xl:grid-cols-[400px_minmax(0,1fr)]">
            {liveRepository ? (
              <>
                <div className="min-w-0 lg:sticky lg:top-20">
                  <PullList
                    repository={liveRepository}
                    list={live.list}
                    selected={live.selected}
                    onSelect={selectPull}
                    onRefresh={live.refresh}
                  />
                </div>
                <div className="min-w-0">
                  {live.selected === null && live.list.status !== "loading" ? (
                    <p className="rounded-xl border border-dashed border-line-strong px-6 py-16 text-center text-sm text-fg-muted">
                      Select a Pull Request to see its Jev review.
                    </p>
                  ) : (
                    <LiveReview detail={live.detail} headingRef={liveHeadingRef} onRefresh={live.refresh} />
                  )}
                </div>
              </>
            ) : (
              <div className="lg:col-span-2">
                <LiveNotConfigured />
              </div>
            )}
          </div>
        )}
        <p aria-live="polite" role="status" className="sr-only">
          {announcement}
        </p>
      </section>

      {howItWorks}

      <ApiInspector {...inspector} />
    </>
  );
}
