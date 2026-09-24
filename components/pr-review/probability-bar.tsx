import { TONE_STYLES } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import type { DistributionEntry, Tone } from "@/lib/review/model";

interface ProbabilityBarProps {
  label: string;
  probability: number;
  percent: number;
  tone: Tone;
  emphasized?: boolean;
  note?: string;
  delayMs?: number;
}

export function ProbabilityBar({
  label,
  probability,
  percent,
  tone,
  emphasized = false,
  note,
  delayMs = 0,
}: ProbabilityBarProps) {
  return (
    <div className="grid grid-cols-[minmax(0,7.5rem)_1fr_2.75rem] items-center gap-3 text-[13px]">
      <span className={cn("flex min-w-0 items-center gap-1.5", emphasized ? "font-semibold text-fg" : "text-fg-muted")}>
        <span className="truncate">{label}</span>
        {note && <span className="sr-only">({note})</span>}
      </span>
      <span aria-hidden className="relative h-2 overflow-hidden rounded-full bg-surface-3">
        <span
          className={cn(
            "absolute inset-y-0 left-0 origin-left rounded-full motion-safe:animate-grow-x",
            emphasized ? TONE_STYLES[tone].bar : "bg-fg-subtle/40",
          )}
          style={{ width: `${Math.max(probability * 100, probability > 0 ? 1.5 : 0)}%`, animationDelay: `${delayMs}ms` }}
        />
      </span>
      <span className={cn("text-right tabular-nums", emphasized ? "font-semibold text-fg" : "text-fg-muted")}>
        {percent}%
      </span>
    </div>
  );
}

interface DistributionProps {
  entries: DistributionEntry[];
  label: string;
  /** Emphasize only the top entry (default) or every entry by its tone. */
  emphasis?: "top" | "all";
}

export function Distribution({ entries, label, emphasis = "top" }: DistributionProps) {
  return (
    <ul aria-label={label} className="space-y-2.5">
      {entries.map((entry, index) => (
        <li key={entry.key}>
          <ProbabilityBar
            label={entry.label}
            probability={entry.probability}
            percent={entry.percent}
            tone={entry.tone}
            emphasized={emphasis === "all" ? entry.probability > 0 : entry.isTop}
            note={entry.isTop ? "most probable" : undefined}
            delayMs={120 + index * 60}
          />
        </li>
      ))}
    </ul>
  );
}
