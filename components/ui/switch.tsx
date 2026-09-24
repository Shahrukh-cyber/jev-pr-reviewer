"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface SwitchRowProps {
  id: string;
  label: string;
  description?: string;
  icon?: ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

/** A labeled row with an accessible switch (role="switch"). */
export function SwitchRow({ id, label, description, icon, checked, onCheckedChange }: SwitchRowProps) {
  const descriptionId = description ? `${id}-description` : undefined;
  return (
    <div className="flex items-center gap-3 py-2.5">
      {icon && (
        <span aria-hidden className="text-fg-subtle [&_svg]:size-4">
          {icon}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <label htmlFor={id} className="block cursor-pointer text-sm font-medium text-fg">
          {label}
        </label>
        {description && (
          <p id={descriptionId} className="text-xs text-fg-subtle">
            {description}
          </p>
        )}
      </div>
      <span className="w-6 text-right font-mono text-[11px] text-fg-subtle" aria-hidden>
        {checked ? "Yes" : "No"}
      </span>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={descriptionId}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border transition-colors duration-150",
          checked ? "border-accent bg-accent" : "border-line-strong bg-surface-3",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "size-3.5 rounded-full bg-white shadow-sm transition-transform duration-150",
            checked ? "translate-x-[18px]" : "translate-x-[2px]",
          )}
        />
      </button>
    </div>
  );
}
