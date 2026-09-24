"use client";

import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Clock,
  GitBranch,
  GitCommitHorizontal,
  History,
  LoaderCircle,
  MessageSquare,
  RefreshCw,
  TriangleAlert,
  User,
} from "lucide-react";
import type { ReactNode, Ref } from "react";
import { ReviewBody } from "@/components/pr-review/review-results";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { RelativeTime } from "@/components/ui/relative-time";
import { cn } from "@/lib/cn";
import type { PullRequestInfo } from "@/lib/github/types";
import { parseJevResponse } from "@/lib/jev/schema";
import { formatPercent } from "@/lib/review/format";
import { toReviewModel, typeLabel } from "@/lib/review/model";
import { deriveWorkflow } from "@/lib/review/workflow";
import type { PullReviewResponse } from "@/lib/reviews/api";
import type { HistoryEntry, StoredAnalysis } from "@/lib/reviews/record";
import { PullStateBadge } from "./pull-state";
import type { DetailState } from "./use-live-reviews";

const short = (sha: string) => sha.slice(0, 7);
const repoUrl = (pull: PullRequestInfo) => pull.url.replace(/\/pull\/\d+$/, "");

function LivePrBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-risk-low/30 bg-[var(--risk-low-soft)] px-1.5 py-0.5 text-[11px] font-semibold tracking-[0.08em] text-[var(--risk-low-text)]">
      <span aria-hidden className="size-1.5 rounded-full bg-risk-low motion-safe:animate-pulse-soft" />
      LIVE PR
    </span>
  );
}

function PullHeader({
  data,
  headingRef,
  onRefresh,
}: {
  data: PullReviewResponse;
  headingRef: Ref<HTMLHeadingElement>;
  onRefresh: () => void;
}) {
  const { pull, record } = data;
  const latest = record?.latest;
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center gap-2">
        <LivePrBadge />
        <PullStateBadge state={pull.state} />
        <a
          href={repoUrl(pull)}
          target="_blank"
          rel="noreferrer"
          className="font-mono text-xs text-fg-muted hover:text-fg hover:underline"
        >
          {pull.repository.owner}/{pull.repository.name}
        </a>
      </div>
      <h2 ref={headingRef} tabIndex={-1} className="mt-3 text-xl leading-snug font-semibold tracking-tight text-fg focus:outline-none sm:text-2xl">
        <span className="font-normal text-fg-subtle">#{pull.number}</span> {pull.title}
      </h2>
      <dl className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-fg-muted">
        {pull.author && (
          <div className="flex items-center gap-1.5">
            <dt className="sr-only">Author</dt>
            <User aria-hidden className="size-3.5 text-fg-subtle" />
            <dd>{pull.author}</dd>
          </div>
        )}
        <div className="flex min-w-0 items-center gap-1.5">
          <dt className="sr-only">Branches</dt>
          <GitBranch aria-hidden className="size-3.5 shrink-0 text-fg-subtle" />
          <dd className="flex min-w-0 items-center gap-1 font-mono text-xs">
            <span className="truncate rounded bg-surface-2 px-1.5 py-0.5 text-fg">{pull.headBranch}</span>
            <ArrowRight aria-label="into" className="size-3 shrink-0 text-fg-subtle" />
            <span className="truncate rounded bg-surface-2 px-1.5 py-0.5 text-fg">{pull.baseBranch}</span>
          </dd>
        </div>
        <div className="flex items-center gap-1.5">
          <dt className="sr-only">Head commit</dt>
          <GitCommitHorizontal aria-hidden className="size-3.5 text-fg-subtle" />
          <dd>
            <a href={`${repoUrl(pull)}/commit/${pull.headSha}`} target="_blank" rel="noreferrer" className="font-mono text-xs hover:text-fg hover:underline">
              {short(pull.headSha)}
            </a>
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
        <a href={pull.url} target="_blank" rel="noreferrer" className={buttonClasses("primary", "sm")}>
          View on GitHub
          <ArrowUpRight aria-hidden />
        </a>
        {data.comment && (
          <a href={data.comment.url} target="_blank" rel="noreferrer" className={buttonClasses("secondary", "sm")}>
            <MessageSquare aria-hidden />
            Jev comment
          </a>
        )}
        {latest?.runUrl && (
          <a href={latest.runUrl} target="_blank" rel="noreferrer" className={buttonClasses("ghost", "sm")}>
            Workflow run
            <ArrowUpRight aria-hidden />
          </a>
        )}
        <span className="ml-auto flex items-center gap-2 text-xs text-fg-subtle">
          {latest && (
            <span className="flex items-center gap-1">
              <Clock aria-hidden className="size-3.5" />
              Analyzed <RelativeTime iso={latest.analyzedAt} /> · <span className="font-mono">{short(latest.headSha)}</span>
            </span>
          )}
          <Button size="sm" variant="ghost" onClick={onRefresh} aria-label="Refresh review" title="Refresh">
            <RefreshCw aria-hidden />
          </Button>
          <a href="#api" className={buttonClasses("ghost", "sm")}>
            Raw decision
            <ArrowDown aria-hidden />
          </a>
        </span>
      </div>
    </Card>
  );
}

function Banner({
  tone,
  icon,
  title,
  children,
  action,
}: {
  tone: "accent" | "neutral" | "moderate" | "critical";
  icon: ReactNode;
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  const styles = {
    accent: "border-accent-line bg-accent-soft text-accent-text",
    neutral: "border-line bg-surface-2/70 text-fg",
    moderate: "border-risk-moderate/30 bg-[var(--risk-moderate-soft)] text-[var(--risk-moderate-text)]",
    critical: "border-risk-critical/30 bg-[var(--risk-critical-soft)] text-[var(--risk-critical-text)]",
  }[tone];
  return (
    <div role="status" className={cn("flex flex-wrap items-start gap-3 rounded-xl border px-4 py-3.5 motion-safe:animate-fade", styles)}>
      <span aria-hidden className="mt-0.5 [&_svg]:size-4">{icon}</span>
      <div className="min-w-0 flex-1 text-[13px] leading-5">
        <p className="font-semibold">{title}</p>
        <div className="mt-0.5 opacity-90">{children}</div>
      </div>
      {action}
    </div>
  );
}

function LifecycleBanner({ data, pollingStopped, onRefresh }: { data: PullReviewResponse; pollingStopped: boolean; onRefresh: () => void }) {
  const { lifecycle, record, pull } = data;
  const attempt = record?.attempt;
  const latest = record?.latest;
  const checking = pollingStopped ? (
    <span> Stopped checking automatically — refresh to check again.</span>
  ) : (
    <span> Checking for updates automatically.</span>
  );

  switch (lifecycle.status) {
    case "ready":
      return null;
    case "analyzing":
      return (
        <Banner tone="accent" icon={<LoaderCircle className="motion-safe:animate-spin" />} title="Analyzing with Jev…">
          The GitHub Action is analyzing commit <code className="font-mono">{short(pull.headSha)}</code>
          {attempt?.startedAt && (
            <> (started <RelativeTime iso={attempt.startedAt} />)</>
          )}
          .{latest && " The previous review is shown below."}
          {checking}
        </Banner>
      );
    case "waiting":
      return (
        <Banner tone="neutral" icon={<Clock />} title="Waiting for Jev analysis">
          The Jev PR Review workflow hasn&apos;t reported for this PR yet. It runs when a PR is opened, reopened, or receives new commits.
          {checking}
        </Banner>
      );
    case "outdated":
      return (
        <Banner tone="moderate" icon={<GitCommitHorizontal />} title="New commits since this review">
          Showing the review of <code className="font-mono">{latest ? short(latest.headSha) : "—"}</code>; the PR head is now{" "}
          <code className="font-mono">{short(pull.headSha)}</code>. Waiting for the workflow to analyze it.
          {checking}
        </Banner>
      );
    case "failed":
      return (
        <Banner
          tone="critical"
          icon={<TriangleAlert />}
          title="Review unavailable"
          action={
            <div className="flex gap-2">
              <Button size="sm" onClick={onRefresh}>
                <RefreshCw aria-hidden />
                Try again
              </Button>
              {attempt?.runUrl && (
                <a href={attempt.runUrl} target="_blank" rel="noreferrer" className={buttonClasses("secondary", "sm")}>
                  Workflow run
                  <ArrowUpRight aria-hidden />
                </a>
              )}
            </div>
          }
        >
          {lifecycle.error?.message ?? "The analysis of the latest commit failed."}{" "}
          <code className="font-mono text-[11px]">({lifecycle.error?.kind ?? "error"})</code>
          {latest && ` The last successful review (commit ${short(latest.headSha)}) is shown below.`}
        </Banner>
      );
  }
}

function ReviewHistory({ entries, currentSha, pull }: { entries: HistoryEntry[]; currentSha: string | null; pull: PullRequestInfo }) {
  if (entries.length === 0) return null;
  return (
    <Card aria-labelledby="history-title" className="motion-safe:animate-rise" style={{ animationDelay: "400ms" }}>
      <CardHeader
        id="history-title"
        icon={<History />}
        title="Review History"
        description="How Jev's decision changed as the PR evolved — one analysis per commit."
      />
      <div className="mt-4 overflow-x-auto border-t border-line">
        <table className="w-full min-w-[520px] text-left text-[13px]">
          <caption className="sr-only">Jev decisions per analyzed commit, newest first</caption>
          <thead>
            <tr className="border-b border-line bg-surface-2/60 text-[11px] tracking-[0.06em] text-fg-subtle uppercase">
              <th scope="col" className="px-5 py-2 font-medium">Commit</th>
              <th scope="col" className="px-3 py-2 font-medium">Analyzed</th>
              <th scope="col" className="px-3 py-2 font-medium">Type</th>
              <th scope="col" className="px-3 py-2 font-medium">Risk</th>
              <th scope="col" className="px-3 py-2 font-medium">Review</th>
              <th scope="col" className="px-5 py-2 font-medium">Tests</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, index) => {
              const older = entries[index + 1];
              const delta = older ? entry.riskScore - older.riskScore : 0;
              const isCurrent = entry.headSha === currentSha;
              return (
                <tr key={entry.headSha} className={cn("border-b border-line last:border-b-0", isCurrent && "bg-accent-soft/40")}>
                  <td className="px-5 py-2.5">
                    <a href={`${repoUrl(pull)}/commit/${entry.headSha}`} target="_blank" rel="noreferrer" className="font-mono text-xs text-fg hover:underline">
                      {short(entry.headSha)}
                    </a>
                    {isCurrent && <Badge tone="accent" className="ml-2">shown</Badge>}
                  </td>
                  <td className="px-3 py-2.5 text-fg-muted">
                    <RelativeTime iso={entry.analyzedAt} />
                  </td>
                  <td className="px-3 py-2.5 text-fg">{typeLabel(entry.typeChoice)}</td>
                  <td className="px-3 py-2.5 font-mono text-xs whitespace-nowrap text-fg tabular-nums">
                    {entry.riskScore.toFixed(2)}
                    {older && Math.abs(delta) >= 0.01 && (
                      <span className={cn("ml-1.5", delta > 0 ? "text-[var(--risk-high-text)]" : "text-[var(--risk-low-text)]")}>
                        {delta > 0 ? "↑" : "↓"}
                        {Math.abs(delta).toFixed(2)}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-fg-muted tabular-nums">{formatPercent(entry.humanReview)}</td>
                  <td className="px-5 py-2.5 text-fg-muted tabular-nums">{formatPercent(entry.tests)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function AnalysisView({ analysis }: { analysis: StoredAnalysis }) {
  const parsed = parseJevResponse(analysis.response);
  if (!parsed.ok) {
    return (
      <Banner tone="critical" icon={<TriangleAlert />} title="Stored Jev response couldn't be read">
        The review comment contains a decision that doesn&apos;t match Jev&apos;s response schema, so it isn&apos;t rendered. Re-run the workflow.
      </Banner>
    );
  }
  return (
    <ReviewBody
      model={toReviewModel(parsed.decision)}
      workflow={deriveWorkflow(parsed.decision)}
      context={analysis.context}
      filesTruncated={analysis.context.changedFilesTruncated}
      evidence={analysis.detection}
      labelsApplied
    />
  );
}

export function LiveReview({
  detail,
  headingRef,
  onRefresh,
}: {
  detail: DetailState;
  headingRef: Ref<HTMLHeadingElement>;
  onRefresh: () => void;
}) {
  if (detail.status === "loading") {
    return (
      <div aria-busy className="space-y-4">
        <Card className="h-44 p-5">
          <div className="h-4 w-24 rounded bg-surface-3" />
          <div className="mt-4 h-6 w-2/3 rounded bg-surface-3 motion-safe:animate-pulse-soft" />
          <div className="mt-4 h-3 w-1/2 rounded bg-surface-3" />
        </Card>
        <Card className="h-56" />
      </div>
    );
  }

  if (detail.status === "error") {
    return (
      <Card role="alert" className="p-6">
        <h2 className="font-semibold text-fg">{detail.error.title}</h2>
        <p className="mt-1 text-sm text-fg-muted">{detail.error.message}</p>
        <Button className="mt-4" onClick={onRefresh}>
          <RefreshCw aria-hidden />
          Try again
        </Button>
      </Card>
    );
  }

  const { data } = detail;
  const latest = data.record?.latest ?? null;
  return (
    <div className="space-y-4">
      <PullHeader data={data} headingRef={headingRef} onRefresh={onRefresh} />
      <LifecycleBanner data={data} pollingStopped={detail.pollingStopped} onRefresh={onRefresh} />
      {latest && (
        <div className={cn("space-y-4", !data.lifecycle.isCurrent && "opacity-90")}>
          <AnalysisView analysis={latest} />
        </div>
      )}
      {data.record && <ReviewHistory entries={data.record.history} currentSha={latest?.headSha ?? null} pull={data.pull} />}
    </div>
  );
}
