"use client";

import { ArrowRight, Braces, ChevronDown, Globe, Lock, Server } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { SectionHeading } from "@/components/ui/section-heading";
import { cn } from "@/lib/cn";
import type { JevDecisionRequest } from "@/lib/jev/types";
import { JsonViewer } from "./json-viewer";

const HOPS = [
  { title: "Browser", detail: "POST /api/analyze", Icon: Globe },
  { title: "Next.js route", detail: "validates · holds API key", Icon: Server },
  { title: "Jev", detail: "POST /api/v1/decisions", Icon: Braces },
];

interface Disclosure {
  title: string;
  subtitle: string;
  badge?: ReactNode;
  defaultOpen: boolean;
  children: ReactNode;
}

function Panel({ title, subtitle, badge, defaultOpen, children }: Disclosure) {
  const [open, setOpen] = useState(defaultOpen);
  const contentId = useId();
  return (
    <div className="min-w-0 rounded-xl border border-line bg-surface shadow-card">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={contentId}
        className="flex w-full items-center gap-3 rounded-xl px-5 py-4 text-left hover:bg-surface-2/50"
      >
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-fg">
            {title}
            {badge}
          </span>
          <span className="mt-0.5 block text-[13px] text-fg-muted">{subtitle}</span>
        </span>
        <ChevronDown aria-hidden className={cn("size-4 shrink-0 text-fg-subtle transition-transform", open && "rotate-180")} />
      </button>
      <div id={contentId} hidden={!open} className="px-5 pb-5">
        {children}
      </div>
    </div>
  );
}

interface ApiInspectorProps {
  request: JevDecisionRequest | null;
  requestBadge: string;
  requestSubtitle: string;
  raw: unknown;
  hasResult: boolean;
  responseBadge?: ReactNode;
  responseSubtitle: string;
  requestEmptyMessage: string;
  emptyMessage: string;
  /** Changes whenever a new result arrives, so panels re-open for it. */
  resultKey: string;
}

export function ApiInspector({
  request,
  requestBadge,
  requestSubtitle,
  raw,
  hasResult,
  responseBadge,
  responseSubtitle,
  requestEmptyMessage,
  emptyMessage,
  resultKey,
}: ApiInspectorProps) {
  return (
    <section id="api" aria-labelledby="api-title" className="scroll-mt-20 border-t border-line bg-surface/40">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <SectionHeading
          id="api-title"
          eyebrow="API / Raw Decision"
          title="What goes to Jev, and what comes back."
          description="The review above is rendered from this JSON. The raw response is shown exactly as Jev returned it."
        />

        <ol aria-label="Request path" className="mt-8 flex flex-col gap-2 sm:flex-row sm:items-center">
          {HOPS.map((hop, index) => (
            <li key={hop.title} className="flex items-center gap-2 sm:contents">
              {index > 0 && <ArrowRight aria-hidden className="hidden size-4 shrink-0 text-fg-subtle sm:block" />}
              <span className="flex flex-1 items-center gap-2.5 rounded-lg border border-line bg-surface px-3 py-2">
                <hop.Icon aria-hidden className="size-4 text-fg-subtle" />
                <span className="min-w-0">
                  <span className="block text-[13px] font-medium text-fg">{hop.title}</span>
                  <span className="block truncate font-mono text-[11px] text-fg-subtle">{hop.detail}</span>
                </span>
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-2.5 flex items-center gap-1.5 text-xs text-fg-subtle">
          <Lock aria-hidden className="size-3" />
          The Jev API key is read from server environment variables and never sent to the browser.
        </p>

        <div className="mt-8 grid items-start gap-4 lg:grid-cols-2">
          <Panel title="Decision request" subtitle={requestSubtitle} badge={<Badge>{requestBadge}</Badge>} defaultOpen>
            {request ? (
              <JsonViewer key={resultKey} value={request} label="request.json" initiallyCollapsed={["$.questions"]} />
            ) : (
              <p className="rounded-lg border border-dashed border-line-strong px-4 py-8 text-center text-sm text-fg-muted">
                {requestEmptyMessage}
              </p>
            )}
          </Panel>

          <Panel
            key={resultKey}
            title="View Raw Jev Decision"
            subtitle={responseSubtitle}
            badge={responseBadge}
            defaultOpen={hasResult}
          >
            {hasResult ? (
              <JsonViewer value={raw} label="response.json" />
            ) : (
              <p className="rounded-lg border border-dashed border-line-strong px-4 py-8 text-center text-sm text-fg-muted">
                No decision yet. {emptyMessage}
              </p>
            )}
          </Panel>
        </div>
      </div>
    </section>
  );
}
