import type { Creator } from "@/lib/branding/creator";
import { CreatorAvatar } from "./creator-avatar";

/** Secondary header element: links to the "Built by" signature at the bottom of the page. */
export function CreatorBadge({ creator }: { creator: Creator }) {
  return (
    <a
      href="#built-by"
      aria-label={`Built by ${creator.name}, ${creator.role}`}
      className="group flex items-center gap-2.5 rounded-lg px-1.5 py-1 transition-colors hover:bg-surface-2"
    >
      <span className="hidden text-right leading-tight lg:block">
        <span className="block text-xs font-medium text-fg-muted transition-colors group-hover:text-fg">{creator.name}</span>
        <span className="block text-[11px] text-fg-subtle">{creator.role}</span>
      </span>
      <CreatorAvatar creator={creator} />
    </a>
  );
}
