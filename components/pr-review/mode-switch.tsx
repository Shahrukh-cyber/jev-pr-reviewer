"use client";

import { FlaskConical, Radio } from "lucide-react";
import { cn } from "@/lib/cn";

export type ReviewMode = "demo" | "live";

const OPTIONS: { value: ReviewMode; label: string; hint: string; Icon: typeof Radio }[] = [
  { value: "demo", label: "Demo", hint: "Manual context", Icon: FlaskConical },
  { value: "live", label: "Live PRs", hint: "From GitHub", Icon: Radio },
];

/** Demo vs. real GitHub PR reviews. Same review UI; different data source. */
export function ModeSwitch({ mode, onChange }: { mode: ReviewMode; onChange: (mode: ReviewMode) => void }) {
  return (
    <div role="radiogroup" aria-label="Review source" className="flex rounded-xl border border-line bg-surface-2 p-1">
      {OPTIONS.map(({ value, label, hint, Icon }) => {
        const selected = mode === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(value)}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-1.5 text-left transition-colors",
              selected ? "bg-surface text-fg shadow-card" : "text-fg-muted hover:text-fg",
            )}
          >
            <Icon
              aria-hidden
              className={cn(
                "size-4",
                selected && (value === "live" ? "text-[var(--risk-low-text)]" : "text-accent-text"),
              )}
            />
            <span>
              <span className="block text-[13px] leading-4 font-semibold">{label}</span>
              <span className="block text-[11px] leading-4 text-fg-subtle">{hint}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
