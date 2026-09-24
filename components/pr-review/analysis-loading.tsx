"use client";

import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { JevMark } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { formatDuration } from "@/lib/review/format";

export type AnalysisStage = "prepare" | "send" | "receive" | "render";

/**
 * Stages map 1:1 to real client-side events: a stage is only marked done
 * once that event has actually happened. Nothing here simulates Jev internals.
 */
const STAGES: { id: AnalysisStage; label: string; active: string }[] = [
  { id: "prepare", label: "Preparing PR context", active: "Validating input" },
  { id: "send", label: "Sending request to Jev", active: "Waiting for Jev to respond" },
  { id: "receive", label: "Receiving structured decision", active: "Validating response schema" },
  { id: "render", label: "Rendering review", active: "Building review" },
];

function Elapsed({ startedAt }: { startedAt: number }) {
  const [now, setNow] = useState(startedAt);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(timer);
  }, []);
  return <span className="font-mono tabular-nums">{formatDuration(Math.max(0, now - startedAt))}</span>;
}

export function AnalysisLoading({
  stage,
  startedAt,
  onCancel,
}: {
  stage: AnalysisStage;
  startedAt: number;
  onCancel: () => void;
}) {
  const current = STAGES.findIndex((item) => item.id === stage);

  return (
    <div className="space-y-4 motion-safe:animate-fade">
      <Card className="overflow-hidden">
        <div className="relative h-0.5 overflow-hidden bg-surface-3">
          <div className="absolute inset-0 motion-safe:animate-shimmer bg-[linear-gradient(90deg,transparent,var(--accent),transparent)] bg-[length:50%_100%] bg-no-repeat" />
        </div>
        <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-start">
          <span className="relative grid size-12 shrink-0 place-items-center rounded-xl bg-accent text-accent-fg">
            <JevMark className="size-6" />
            <span aria-hidden className="absolute inset-0 rounded-xl ring-4 ring-accent/20 motion-safe:animate-pulse-soft" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg font-semibold tracking-tight text-fg">Analyzing Pull Request</h2>
              <span className="text-xs text-fg-subtle">
                Elapsed <Elapsed startedAt={startedAt} />
              </span>
            </div>
            <p className="mt-0.5 text-sm text-fg-muted">
              Jev is evaluating the PR context against four structured questions.
            </p>

            <ol className="mt-5 space-y-3" aria-label="Analysis progress">
              {STAGES.map((item, index) => {
                const status = index < current ? "done" : index === current ? "active" : "pending";
                return (
                  <li key={item.id} className="flex items-center gap-3 text-sm">
                    <span
                      aria-hidden
                      className={cn(
                        "grid size-5 shrink-0 place-items-center rounded-full border",
                        status === "done" && "border-accent bg-accent text-accent-fg",
                        status === "active" && "border-accent",
                        status === "pending" && "border-line-strong",
                      )}
                    >
                      {status === "done" && <Check className="size-3" strokeWidth={3} />}
                      {status === "active" && <span className="size-2 rounded-full bg-accent motion-safe:animate-pulse-soft" />}
                    </span>
                    <span className={cn(status === "pending" ? "text-fg-subtle" : "text-fg", status === "active" && "font-medium")}>
                      {item.label}
                    </span>
                    {status === "active" && <span className="text-xs text-fg-subtle">— {item.active}…</span>}
                    <span className="sr-only">
                      {status === "done" ? "(complete)" : status === "active" ? "(in progress)" : "(pending)"}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
          <Button size="sm" variant="ghost" onClick={onCancel} className="self-start">
            Cancel
          </Button>
        </div>
      </Card>

      {/* Skeleton of the review that's about to render */}
      <div aria-hidden className="grid gap-4 opacity-70">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="space-y-2 bg-surface p-4">
              <div className="h-2 w-16 rounded bg-surface-3" />
              <div className="h-3.5 w-24 rounded bg-surface-3 motion-safe:animate-pulse-soft" style={{ animationDelay: `${i * 150}ms` }} />
            </div>
          ))}
        </div>
        <div className="h-56 rounded-xl border border-line bg-surface p-5">
          <div className="h-3 w-32 rounded bg-surface-3" />
          <div className="mt-6 h-10 w-40 rounded bg-surface-3 motion-safe:animate-pulse-soft" />
          <div className="mt-8 h-3 w-full rounded-full bg-surface-3" />
        </div>
      </div>
    </div>
  );
}
