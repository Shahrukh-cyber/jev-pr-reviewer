import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Card({ className, ...props }: ComponentProps<"section">) {
  return (
    <section
      className={cn("rounded-xl border border-line bg-surface shadow-card", className)}
      {...props}
    />
  );
}

interface CardHeaderProps {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  id?: string;
  as?: "h2" | "h3";
  className?: string;
}

export function CardHeader({
  icon,
  title,
  description,
  action,
  id,
  as: Heading = "h3",
  className,
}: CardHeaderProps) {
  return (
    <header className={cn("flex items-start gap-3 px-5 pt-5", className)}>
      {icon && (
        <span
          aria-hidden
          className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg border border-line bg-surface-2 text-fg-muted [&_svg]:size-3.5"
        >
          {icon}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <Heading id={id} className="text-sm font-semibold tracking-tight text-fg">
          {title}
        </Heading>
        {description && <p className="mt-0.5 text-[13px] leading-5 text-fg-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}

export function CardBody({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("px-5 pt-4 pb-5", className)} {...props} />;
}
