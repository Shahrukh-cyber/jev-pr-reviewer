import { GitMerge, GitPullRequest, GitPullRequestClosed, GitPullRequestDraft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import type { PullState } from "@/lib/github/types";
import type { ReviewStatus } from "@/lib/reviews/lifecycle";

const STATE: Record<PullState, { label: string; Icon: typeof GitPullRequest; className: string }> = {
  open: { label: "Open", Icon: GitPullRequest, className: "text-diff-add" },
  draft: { label: "Draft", Icon: GitPullRequestDraft, className: "text-fg-subtle" },
  merged: { label: "Merged", Icon: GitMerge, className: "text-[#8250df] dark:text-[#a371f7]" },
  closed: { label: "Closed", Icon: GitPullRequestClosed, className: "text-diff-del" },
};

export function PullStateIcon({ state, className }: { state: PullState; className?: string }) {
  const { Icon, className: color, label } = STATE[state];
  return <Icon aria-label={label} className={cn("shrink-0", color, className)} />;
}

export function PullStateBadge({ state }: { state: PullState }) {
  const { Icon, className, label } = STATE[state];
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-line bg-surface-2 px-2 py-0.5 text-xs font-medium text-fg">
      <Icon aria-hidden className={cn("size-3.5", className)} />
      {label}
    </span>
  );
}

const STATUS: Record<ReviewStatus, { label: string; tone: "low" | "accent" | "neutral" | "moderate" | "critical"; pulse: boolean }> = {
  ready: { label: "Review ready", tone: "low", pulse: false },
  analyzing: { label: "Analyzing", tone: "accent", pulse: true },
  waiting: { label: "Waiting for Jev", tone: "neutral", pulse: true },
  outdated: { label: "New commits", tone: "moderate", pulse: true },
  failed: { label: "Review unavailable", tone: "critical", pulse: false },
};

export function ReviewStatusBadge({ status }: { status: ReviewStatus }) {
  const { label, tone, pulse } = STATUS[status];
  return (
    <Badge tone={tone}>
      <span aria-hidden className={cn("size-1.5 rounded-full bg-current", pulse && "motion-safe:animate-pulse-soft")} />
      {label}
    </Badge>
  );
}
