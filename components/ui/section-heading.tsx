import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface SectionHeadingProps {
  id: string;
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function SectionHeading({ id, eyebrow, title, description, action, className }: SectionHeadingProps) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="max-w-2xl">
        <p className="text-xs font-semibold tracking-[0.08em] text-accent-text uppercase">{eyebrow}</p>
        <h2 id={id} className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-balance text-fg sm:text-3xl">
          {title}
        </h2>
        {description && <p className="mt-2 text-[15px] leading-7 text-pretty text-fg-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
