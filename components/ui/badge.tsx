import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";
import type { Tone } from "@/lib/review/model";

export const TONE_STYLES: Record<Tone, { badge: string; text: string; bar: string; dot: string }> = {
  accent: {
    badge: "border-accent-line bg-accent-soft text-accent-text",
    text: "text-accent-text",
    bar: "bg-accent",
    dot: "bg-accent",
  },
  neutral: {
    badge: "border-line bg-surface-2 text-fg-muted",
    text: "text-fg",
    bar: "bg-fg-subtle/50",
    dot: "bg-fg-subtle",
  },
  low: {
    badge: "border-risk-low/25 bg-[var(--risk-low-soft)] text-[var(--risk-low-text)]",
    text: "text-[var(--risk-low-text)]",
    bar: "bg-risk-low",
    dot: "bg-risk-low",
  },
  moderate: {
    badge: "border-risk-moderate/25 bg-[var(--risk-moderate-soft)] text-[var(--risk-moderate-text)]",
    text: "text-[var(--risk-moderate-text)]",
    bar: "bg-risk-moderate",
    dot: "bg-risk-moderate",
  },
  high: {
    badge: "border-risk-high/25 bg-[var(--risk-high-soft)] text-[var(--risk-high-text)]",
    text: "text-[var(--risk-high-text)]",
    bar: "bg-risk-high",
    dot: "bg-risk-high",
  },
  critical: {
    badge: "border-risk-critical/25 bg-[var(--risk-critical-soft)] text-[var(--risk-critical-text)]",
    text: "text-[var(--risk-critical-text)]",
    bar: "bg-risk-critical",
    dot: "bg-risk-critical",
  },
};

interface BadgeProps extends ComponentProps<"span"> {
  tone?: Tone;
}

export function Badge({ tone = "neutral", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] leading-4 font-medium whitespace-nowrap [&_svg]:size-3",
        TONE_STYLES[tone].badge,
        className,
      )}
      {...props}
    />
  );
}

/** Small uppercase label used above values. */
export function Eyebrow({ className, ...props }: ComponentProps<"p">) {
  return (
    <p
      className={cn("text-[11px] font-medium tracking-[0.06em] text-fg-subtle uppercase", className)}
      {...props}
    />
  );
}
