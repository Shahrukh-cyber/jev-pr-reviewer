import { Gauge, Shield, ShieldAlert, ShieldCheck, ShieldX } from "lucide-react";
import { Badge, Eyebrow, TONE_STYLES } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { formatPercent } from "@/lib/review/format";
import type { RiskDecision, RiskTone } from "@/lib/review/model";

const RISK_ICONS: Record<RiskTone, typeof Shield> = {
  low: ShieldCheck,
  moderate: Shield,
  high: ShieldAlert,
  critical: ShieldX,
};

function RiskScale({ risk }: { risk: RiskDecision }) {
  const pct = risk.position * 100;
  const levelPct = (index: number) => (risk.max > 0 ? (index / risk.max) * 100 : 0);

  return (
    <figure className="mt-6">
      <div
        role="img"
        aria-label={`Risk score ${risk.score.toFixed(2)} on a scale from 0 to ${risk.max}: ${risk.interpretation}.`}
        className="relative pt-7"
      >
        {/* Score callout */}
        <div
          aria-hidden
          className="absolute top-0 -translate-x-1/2 motion-safe:animate-slide-from-start"
          style={{ left: `${pct}%` }}
        >
          <span className="block rounded-md bg-fg px-1.5 py-0.5 font-mono text-[11px] font-semibold text-canvas tabular-nums">
            {risk.score.toFixed(2)}
          </span>
        </div>

        {/* Track: full gradient, progressively uncovered up to the score */}
        <div aria-hidden className="relative h-3 overflow-hidden rounded-full">
          <div className="absolute inset-0 bg-[linear-gradient(90deg,var(--risk-low),var(--risk-moderate)_33.3%,var(--risk-high)_66.6%,var(--risk-critical))]" />
          <div
            className="absolute inset-y-0 -right-px left-0 origin-right bg-surface-3 motion-safe:animate-uncover"
            style={{ transform: `scaleX(${1 - risk.position})` }}
          />
          {risk.levels.slice(1, -1).map((level) => (
            <span
              key={level.index}
              className="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-surface"
              style={{ left: `${levelPct(level.index)}%` }}
            />
          ))}
        </div>

        {/* Marker */}
        <span
          aria-hidden
          className="absolute top-7 -mt-1 h-5 w-1.5 -translate-x-1/2 rounded-full bg-fg ring-2 ring-surface motion-safe:animate-slide-from-start"
          style={{ left: `${pct}%` }}
        />
      </div>

      {/* Level ticks */}
      <ol aria-label="Risk levels" className="relative mt-2 h-9 text-[11px]">
        {risk.levels.map((level, index) => {
          const isNearest = level.index === risk.nearest.index;
          const align =
            index === 0 ? "translate-x-0 text-left" : index === risk.levels.length - 1 ? "-translate-x-full text-right" : "-translate-x-1/2 text-center";
          return (
            <li
              key={level.index}
              className={cn("absolute top-0 leading-4", align)}
              style={{ left: `${levelPct(level.index)}%` }}
            >
              <span className="block font-mono text-fg-subtle">{level.index}</span>
              <span className={cn("block font-medium whitespace-nowrap", isNearest ? TONE_STYLES[level.tone].text : "text-fg-muted")}>
                {level.label}
              </span>
            </li>
          );
        })}
      </ol>
    </figure>
  );
}

export function RiskCard({ risk }: { risk: RiskDecision }) {
  const Icon = RISK_ICONS[risk.nearest.tone];

  return (
    <Card aria-labelledby="risk-title" className="motion-safe:animate-rise" style={{ animationDelay: "60ms" }}>
      <CardHeader
        id="risk-title"
        icon={<Gauge />}
        title="Engineering Risk"
        description="Jev's risk score on a 0–3 scale, with the probability of each level."
        action={<Badge>{formatPercent(risk.confidence)} confidence</Badge>}
      />
      <CardBody className="grid gap-8 lg:grid-cols-[1.15fr_1fr]">
        <div>
          <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
            <p className="flex items-baseline gap-1.5">
              <span className="text-5xl font-semibold tracking-[-0.04em] text-fg tabular-nums">
                {risk.score.toFixed(2)}
              </span>
              <span className="text-lg font-medium text-fg-subtle tabular-nums">/ {risk.max.toFixed(2)}</span>
            </p>
            <div className="pb-1.5">
              <Badge tone={risk.nearest.tone} className="px-2 py-1 text-[13px] font-semibold tracking-wide uppercase">
                <Icon aria-hidden className="!size-3.5" />
                {risk.nearest.label}
              </Badge>
              <span className="ml-2 text-xs text-fg-subtle">nearest level</span>
            </div>
          </div>
          <p className="mt-3 text-sm text-fg-muted">
            <span className="font-medium text-fg">{risk.interpretation}.</span>{" "}
            {risk.mostProbable.label} is the most probable level at {risk.mostProbable.percent}%.
          </p>
          <RiskScale risk={risk} />
        </div>

        <div>
          <Eyebrow>Probability distribution</Eyebrow>
          <ul aria-label="Risk probability distribution" className="mt-3 space-y-2">
            {risk.distribution.map((entry, index) => (
              <li
                key={entry.key}
                className={cn(
                  "rounded-lg border px-3 py-2",
                  entry.isTop ? "border-line-strong bg-surface-2" : "border-transparent",
                )}
              >
                <div className="flex items-center justify-between gap-2 text-[13px]">
                  <span className="flex items-center gap-2">
                    <span aria-hidden className={cn("size-2 rounded-full", TONE_STYLES[entry.tone].dot)} />
                    <span className={entry.isTop ? "font-semibold text-fg" : "text-fg-muted"}>{entry.label}</span>
                    {entry.isTop && <Badge tone={entry.tone}>Most probable</Badge>}
                  </span>
                  <span className={cn("tabular-nums", entry.isTop ? "font-semibold text-fg" : "text-fg-muted")}>
                    {entry.percent}%
                  </span>
                </div>
                <div aria-hidden className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-3">
                  <div
                    className={cn("h-full origin-left rounded-full motion-safe:animate-grow-x", TONE_STYLES[entry.tone].bar)}
                    style={{ width: `${entry.probability * 100}%`, animationDelay: `${150 + index * 70}ms` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </CardBody>
    </Card>
  );
}
