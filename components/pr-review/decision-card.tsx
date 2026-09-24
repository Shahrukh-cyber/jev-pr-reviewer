import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import type { ProbabilityDecision } from "@/lib/review/model";

interface DecisionCardProps {
  id: string;
  title: string;
  icon: ReactNode;
  decision: ProbabilityDecision;
  description: string;
  /** Workflow threshold shown on the meter, e.g. where `needs-review` applies. */
  threshold: { value: number; label: string };
  delayMs?: number;
}

/** A noul answer: a probability, displayed as such — never as a verdict. */
export function DecisionCard({ id, title, icon, decision, description, threshold, delayMs = 0 }: DecisionCardProps) {
  const likely = decision.assessment === "likely";
  const thresholdPct = threshold.value * 100;

  return (
    <Card aria-labelledby={id} className="flex flex-col motion-safe:animate-rise" style={{ animationDelay: `${delayMs}ms` }}>
      <CardHeader
        id={id}
        icon={icon}
        title={title}
        action={<Badge tone={likely ? "accent" : "neutral"}>{decision.assessmentLabel}</Badge>}
      />
      <CardBody className="flex flex-1 flex-col">
        <p className="flex items-baseline gap-2">
          <span className="text-4xl font-semibold tracking-[-0.03em] text-fg tabular-nums">{decision.percent}%</span>
          <span className="text-xs text-fg-subtle">probability</span>
        </p>
        <p className="mt-1.5 text-[13px] leading-5 text-fg-muted">{description}</p>

        <div className="mt-auto pt-5">
          <div aria-hidden className="relative">
            <div className="h-2 overflow-hidden rounded-full bg-surface-3">
              <div
                className={cn("h-full origin-left rounded-full motion-safe:animate-grow-x", likely ? "bg-accent" : "bg-fg-subtle/60")}
                style={{ width: `${decision.probability * 100}%`, animationDelay: `${delayMs + 150}ms` }}
              />
            </div>
            <span
              className="absolute -top-1 h-4 w-px bg-fg-muted"
              style={{ left: `${thresholdPct}%` }}
            />
          </div>
          <div aria-hidden className="relative mt-1.5 h-4 font-mono text-[10px] text-fg-subtle">
            <span className="absolute left-0">0</span>
            <span className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: `${thresholdPct}%` }}>
              {threshold.label}
            </span>
            <span className="absolute right-0">1</span>
          </div>
          <p className="mt-3 truncate border-t border-line pt-3 font-mono text-[11px] text-fg-subtle">
            {decision.field.replace(/^answers\./, "")} = {decision.probability}
          </p>
        </div>
      </CardBody>
    </Card>
  );
}
