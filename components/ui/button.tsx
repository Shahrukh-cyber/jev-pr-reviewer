import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-accent text-accent-fg shadow-[0_1px_0_rgb(255_255_255/0.15)_inset,0_1px_2px_rgb(0_0_0/0.2)] hover:bg-accent-hover disabled:hover:bg-accent",
  secondary:
    "border border-line bg-surface text-fg shadow-card hover:bg-surface-2 hover:border-line-strong",
  ghost: "text-fg-muted hover:bg-surface-2 hover:text-fg",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 gap-1.5 rounded-lg px-2.5 text-[13px] [&_svg]:size-3.5",
  md: "h-9 gap-2 rounded-lg px-3.5 text-sm [&_svg]:size-4",
  lg: "h-11 gap-2 rounded-xl px-5 text-[15px] [&_svg]:size-4",
};

export function buttonClasses(variant: Variant = "secondary", size: Size = "md", className?: string) {
  return cn(
    "inline-flex shrink-0 items-center justify-center font-medium whitespace-nowrap transition-colors duration-150 select-none disabled:cursor-not-allowed disabled:opacity-60",
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

interface ButtonProps extends ComponentProps<"button"> {
  variant?: Variant;
  size?: Size;
}

export function Button({ variant, size, className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonClasses(variant, size, className)} {...props} />;
}
