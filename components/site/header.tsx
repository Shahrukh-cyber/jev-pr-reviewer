import { JevMark } from "@/components/ui/icons";
import { ThemeToggle } from "./theme-toggle";

const NAV = [
  { href: "#review", label: "Review" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#api", label: "API / Raw Decision" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/80 backdrop-blur-md supports-[backdrop-filter]:bg-canvas/70">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <a href="#top" className="flex items-center gap-2.5 rounded-md" aria-label="Jev PR Reviewer home">
          <span className="grid size-7 place-items-center rounded-lg bg-fg text-canvas">
            <JevMark className="size-4" />
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-fg">Jev PR Reviewer</span>
        </a>
        <span className="hidden items-center gap-1.5 rounded-full border border-accent-line bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent-text sm:inline-flex">
          <span className="size-1.5 rounded-full bg-accent" aria-hidden />
          Powered by Jev
        </span>

        <nav aria-label="Primary" className="ml-auto hidden md:block">
          <ul className="flex items-center gap-1">
            {NAV.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className="rounded-md px-3 py-1.5 text-[13px] font-medium text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="ml-auto md:ml-2">
          <ThemeToggle />
        </div>
      </div>
      <nav aria-label="Primary mobile" className="border-t border-line md:hidden">
        <ul className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-3 py-1.5">
          {NAV.map((item) => (
            <li key={item.href}>
              <a
                href={item.href}
                className="block rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap text-fg-muted hover:bg-surface-2 hover:text-fg"
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
