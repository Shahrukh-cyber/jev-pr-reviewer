import { JevMark } from "@/components/ui/icons";
import type { Creator } from "@/lib/branding/creator";
import { CreatorAvatar } from "./creator-avatar";
import { CreatorLinks } from "./creator-links";

/** Quiet footer: the product first, the creator as a signature. */
export function CreatorFooter({ creator }: { creator: Creator }) {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-fg">
              <span className="grid size-6 place-items-center rounded-md bg-fg text-canvas">
                <JevMark className="size-3.5" />
              </span>
              Jev PR Reviewer
            </p>
            <p className="mt-2 max-w-xs text-[13px] leading-5 text-fg-muted">
              Structured Pull Request intelligence powered by Jev.
            </p>
          </div>

          <div className="flex items-start gap-3 sm:text-right">
            <CreatorAvatar creator={creator} className="sm:order-last" />
            <div>
              <p className="text-[13px] text-fg-muted">
                Crafted by <span className="font-medium text-fg">{creator.name}</span>
              </p>
              <p className="text-xs text-fg-subtle">{creator.role}</p>
              <CreatorLinks links={creator.links} variant="inline" className="mt-2 sm:justify-end" />
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-line pt-5 text-[11px] text-fg-subtle sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono tracking-wide">Next.js × Jev</p>
        </div>
      </div>
    </footer>
  );
}
