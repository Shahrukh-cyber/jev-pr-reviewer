import { ArrowDown, ArrowRight, ChevronDown, Mail } from "lucide-react";
import { Fragment } from "react";
import { cn } from "@/lib/cn";
import type { Creator } from "@/lib/branding/creator";
import { CreatorAvatar } from "./creator-avatar";
import { CreatorLinks } from "./creator-links";

const FLOW = ["GitHub Pull Request", "PR Context", "Jev", "Structured Decisions", "Developer Workflow"];

function AboutProject({ creator }: { creator: Creator }) {
  return (
    <details className="group rounded-xl border border-line bg-surface shadow-card">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-5 py-4 hover:bg-surface-2/50 [&::-webkit-details-marker]:hidden">
        <span>
          <span className="block text-sm font-semibold text-fg">About Jev PR Reviewer</span>
          <span className="mt-0.5 block text-[13px] text-fg-muted">What this project demonstrates</span>
        </span>
        <ChevronDown aria-hidden className="size-4 shrink-0 text-fg-subtle transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-line px-5 py-5">
        <p className="max-w-2xl text-sm leading-6 text-fg-muted">
          Jev PR Reviewer demonstrates how structured decisions from Jev can transform Pull Request context into
          actionable engineering signals.
        </p>
        <ol aria-label="How a Pull Request becomes a workflow decision" className="mt-5 flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
          {FLOW.map((step, index) => (
            <Fragment key={step}>
              {index > 0 && (
                <li aria-hidden className="pl-3 text-fg-subtle sm:pl-0">
                  <ArrowDown className="size-3.5 sm:hidden" />
                  <ArrowRight className="hidden size-3.5 sm:block" />
                </li>
              )}
              <li
                className={cn(
                  "w-fit rounded-lg border px-2.5 py-1 text-xs font-medium",
                  step === "Jev" ? "border-accent-line bg-accent-soft text-accent-text" : "border-line bg-surface-2 text-fg-muted",
                )}
              >
                {step}
              </li>
            </Fragment>
          ))}
        </ol>
        <p className="mt-5 text-[13px] text-fg-muted">
          Built as an exploration of structured AI decision-making for developer workflows.
        </p>
        <p className="mt-1 text-xs text-fg-subtle">
          Created by {creator.name} · {creator.role}
        </p>
      </div>
    </details>
  );
}

/** "Built by" product signature — the page's closing moment, below the Jev content. */
export function CreatorCard({ creator }: { creator: Creator }) {
  return (
    <section id="built-by" aria-labelledby="built-by-title" className="scroll-mt-20 border-t border-line">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-14 sm:px-6 sm:py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-start lg:px-8">
        <AboutProject creator={creator} />

        <div className="rounded-xl border border-line bg-surface p-6 shadow-card">
          <p className="text-[11px] font-medium tracking-[0.08em] text-fg-subtle uppercase">Built by</p>
          <div className="mt-4 flex items-center gap-3.5">
            <CreatorAvatar creator={creator} size="md" />
            <div className="min-w-0">
              <h2 id="built-by-title" className="text-lg leading-tight font-semibold tracking-tight text-fg">
                {creator.name}
              </h2>
              <p className="mt-0.5 text-[13px] text-fg-muted">{creator.role}</p>
              <a
                href={`mailto:${creator.email}`}
                className="mt-1 inline-flex max-w-full items-center gap-1.5 text-[13px] text-fg-subtle transition-colors hover:text-fg"
              >
                <Mail aria-hidden className="size-3.5 shrink-0" />
                <span className="truncate">{creator.email}</span>
              </a>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-pretty text-fg-muted">{creator.description}</p>
          <CreatorLinks links={creator.links} className="mt-5" />
        </div>
      </div>
    </section>
  );
}
