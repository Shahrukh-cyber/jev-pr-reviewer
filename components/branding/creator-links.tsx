import { ArrowUpRight, Globe } from "lucide-react";
import type { ReactNode, SVGProps } from "react";
import { GitHubMark } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import type { CreatorLink, CreatorLinkKind } from "@/lib/branding/creator";

function LinkedInMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden {...props}>
      <path d="M0 1.146C0 .513.526 0 1.175 0h13.65C15.474 0 16 .513 16 1.146v13.708c0 .633-.526 1.146-1.175 1.146H1.175C.526 16 0 15.487 0 14.854zm4.943 12.248V6.169H2.542v7.225zm-1.2-8.212c.837 0 1.358-.554 1.358-1.248-.015-.709-.52-1.248-1.342-1.248S2.4 3.226 2.4 3.934c0 .694.521 1.248 1.327 1.248zm4.908 8.212V9.359c0-.216.016-.432.08-.586.173-.431.568-.878 1.232-.878.869 0 1.216.662 1.216 1.634v3.865h2.401V9.25c0-2.22-1.184-3.252-2.764-3.252-1.274 0-1.845.7-2.165 1.193v.025h-.016l.016-.025V6.169h-2.4c.03.678 0 7.225 0 7.225z" />
    </svg>
  );
}

const ICONS: Record<CreatorLinkKind, (props: { className?: string }) => ReactNode> = {
  github: (props) => <GitHubMark {...props} />,
  linkedin: (props) => <LinkedInMark {...props} />,
  portfolio: (props) => <Globe aria-hidden {...props} />,
};

/** Compact icon buttons. Renders nothing when no links are configured. */
export function CreatorLinks({ links, variant = "button", className }: { links: CreatorLink[]; variant?: "button" | "inline"; className?: string }) {
  if (links.length === 0) return null;
  return (
    <ul className={cn("flex flex-wrap items-center", variant === "button" ? "gap-2" : "gap-x-4 gap-y-1", className)}>
      {links.map((link) => {
        const Icon = ICONS[link.kind];
        return (
          <li key={link.kind}>
            <a
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${link.label} (opens in a new tab)`}
              className={cn(
                "group inline-flex items-center gap-1.5 transition-colors",
                variant === "button"
                  ? "h-8 rounded-lg border border-line bg-surface px-2.5 text-[13px] font-medium text-fg-muted shadow-card hover:border-line-strong hover:text-fg"
                  : "text-xs text-fg-subtle hover:text-fg",
              )}
            >
              <Icon className="size-3.5" />
              {link.label}
              <ArrowUpRight
                aria-hidden
                className="size-3 opacity-60 transition-transform duration-150 group-hover:translate-x-px group-hover:-translate-y-px group-hover:opacity-100"
              />
            </a>
          </li>
        );
      })}
    </ul>
  );
}
