"use client";

import { RefreshCw, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { GitHubMark } from "@/components/ui/icons";
import { RelativeTime } from "@/components/ui/relative-time";
import { cn } from "@/lib/cn";
import type { ReviewedRepository } from "@/lib/reviews/api";
import { PullStateIcon, ReviewStatusBadge } from "./pull-state";
import type { ListState } from "./use-live-reviews";

interface PullListProps {
  repository: ReviewedRepository;
  list: ListState;
  selected: number | null;
  onSelect: (number: number) => void;
  onRefresh: () => void;
}

export function PullList({ repository, list, selected, onSelect, onRefresh }: PullListProps) {
  const repoUrl = `https://github.com/${repository.owner}/${repository.name}`;
  return (
    <Card aria-labelledby="pull-list-title">
      <CardHeader
        id="pull-list-title"
        as="h2"
        icon={<GitHubMark />}
        title="Recent Pull Requests"
        description={
          <a href={repoUrl} target="_blank" rel="noreferrer" className="font-mono text-xs hover:text-fg hover:underline">
            {repository.owner}/{repository.name}
          </a>
        }
        action={
          <Button size="sm" variant="ghost" onClick={onRefresh} aria-label="Refresh pull requests" title="Refresh">
            <RefreshCw aria-hidden className={cn(list.status === "loading" && "motion-safe:animate-spin")} />
          </Button>
        }
      />

      <div className="mt-4 border-t border-line">
        {list.status === "loading" && (
          <ul aria-label="Loading pull requests" className="divide-y divide-line">
            {Array.from({ length: 4 }, (_, i) => (
              <li key={i} className="space-y-2 px-5 py-3.5">
                <div className="h-3 w-3/4 rounded bg-surface-3 motion-safe:animate-pulse-soft" />
                <div className="h-2.5 w-1/3 rounded bg-surface-3" />
              </li>
            ))}
          </ul>
        )}

        {list.status === "error" && (
          <div role="alert" className="px-5 py-6 text-sm">
            <p className="font-medium text-fg">{list.error.title}</p>
            <p className="mt-1 text-[13px] text-fg-muted">{list.error.message}</p>
            <Button size="sm" className="mt-3" onClick={onRefresh}>
              Try again
            </Button>
          </div>
        )}

        {list.status === "ready" && list.data.pulls.length === 0 && (
          <div className="px-5 py-8 text-center">
            <p className="text-sm font-medium text-fg">No pull requests yet</p>
            <p className="mx-auto mt-1 max-w-xs text-[13px] leading-5 text-fg-muted">
              Push a branch and open a PR. The <span className="font-medium text-fg">Jev PR Review</span> workflow
              analyzes it and this list picks it up automatically.
            </p>
          </div>
        )}

        {list.status === "ready" && list.data.pulls.length > 0 && (
          <ul className="max-h-[32rem] divide-y divide-line overflow-y-auto">
            {list.data.pulls.map(({ pull, status, summary }) => {
              const isSelected = pull.number === selected;
              return (
                <li key={pull.number}>
                  <button
                    type="button"
                    onClick={() => onSelect(pull.number)}
                    aria-current={isSelected ? "true" : undefined}
                    className={cn(
                      "relative flex w-full gap-3 px-5 py-3.5 text-left transition-colors hover:bg-surface-2/60",
                      isSelected && "bg-accent-soft/60 hover:bg-accent-soft",
                    )}
                  >
                    {isSelected && <span aria-hidden className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-accent" />}
                    <PullStateIcon state={pull.state} className="mt-0.5 size-4" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline gap-1.5">
                        <span className="font-mono text-xs text-fg-subtle">#{pull.number}</span>
                        <span className="truncate text-[13px] font-medium text-fg">{pull.title}</span>
                      </span>
                      <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-fg-muted">
                        <ReviewStatusBadge status={status} />
                        {summary && (
                          <span className="tabular-nums">
                            {summary.typeLabel} · {summary.riskLabel} risk {summary.riskScore.toFixed(2)}
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {list.status === "ready" && (
        <p className="flex items-center gap-1.5 border-t border-line px-5 py-2.5 text-[11px] text-fg-subtle">
          <Settings2 aria-hidden className="size-3" />
          {list.data.authenticated ? "Auto-refreshing" : "Manual refresh (no server GITHUB_TOKEN)"} · updated{" "}
          <RelativeTime iso={list.data.fetchedAt} />
        </p>
      )}
    </Card>
  );
}

export function LiveNotConfigured() {
  return (
    <Card className="p-6">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-line bg-surface-2 text-fg-muted">
          <GitHubMark className="size-4" />
        </span>
        <div className="min-w-0 text-sm">
          <h2 className="font-semibold text-fg">Connect a repository</h2>
          <p className="mt-1 leading-6 text-fg-muted">
            Real PR reviews are read from GitHub. Set these on the server, then restart:
          </p>
          <pre className="mt-3 overflow-x-auto rounded-lg border border-line bg-surface-2/60 p-3 font-mono text-xs leading-5 text-fg">
            {"GITHUB_OWNER=your-org\nGITHUB_REPOSITORY=your-repo\nGITHUB_TOKEN=  # read-only; needed for private repos"}
          </pre>
          <p className="mt-3 text-[13px] text-fg-muted">The demo keeps working without any of this.</p>
        </div>
      </div>
    </Card>
  );
}
