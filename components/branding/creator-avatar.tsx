import { cn } from "@/lib/cn";
import type { Creator } from "@/lib/branding/creator";

const SIZES = {
  sm: "size-7 text-[10px]",
  md: "size-10 text-[13px]",
} as const;

/** Real profile image when configured; otherwise initials. Never a placeholder photo. */
export function CreatorAvatar({ creator, size = "sm", className }: { creator: Creator; size?: keyof typeof SIZES; className?: string }) {
  const classes = cn(
    "grid shrink-0 place-items-center overflow-hidden rounded-full border border-line bg-surface-2 font-semibold tracking-wide text-fg-muted",
    SIZES[size],
    className,
  );
  if (creator.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- user-configured external URL; no remote image config needed
      <img src={creator.avatarUrl} alt="" className={cn(classes, "object-cover")} />
    );
  }
  return (
    <span aria-hidden className={classes}>
      {creator.initials}
    </span>
  );
}
