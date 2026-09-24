import type { ReactNode } from "react";
import { Check, Database, FileStack, FlaskConical, KeyRound, X } from "lucide-react";
import { Eyebrow } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import type { PrContext } from "@/lib/review/validation";

function DiffBlocks({ added, removed }: { added: number; removed: number }) {
  const total = added + removed;
  const addBlocks = total === 0 ? 0 : Math.round((added / total) * 5);
  const delBlocks = total === 0 ? 0 : 5 - addBlocks;
  return (
    <span aria-hidden className="flex gap-0.5">
      {Array.from({ length: 5 }, (_, index) => (
        <span
          key={index}
          className={cn(
            "size-2.5 rounded-[2px]",
            index < addBlocks ? "bg-diff-add" : index < addBlocks + delBlocks ? "bg-diff-del" : "bg-surface-3",
          )}
        />
      ))}
    </span>
  );
}

/** Real PRs: the changed files that triggered each path heuristic. */
export interface SignalEvidence {
  tests: string[];
  authentication: string[];
  database: string[];
}

function SignalRow({ label, value, icon, matches }: { label: string; value: boolean; icon: ReactNode; matches?: string[] }) {
  return (
    <li className="flex items-center gap-2.5 py-2 text-[13px]">
      <span aria-hidden className="text-fg-subtle [&_svg]:size-4">{icon}</span>
      <span className="min-w-0 flex-1 text-fg-muted">
        {label}
        {matches && matches.length > 0 && (
          <span className="block truncate font-mono text-[11px] text-fg-subtle" title={matches.join(", ")}>
            {matches[0]}
            {matches.length > 1 && ` +${matches.length - 1}`}
          </span>
        )}
      </span>
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium",
          value ? "bg-surface-3 text-fg" : "text-fg-subtle",
        )}
      >
        {value ? <Check aria-hidden className="size-3.5" /> : <X aria-hidden className="size-3.5" />}
        {value ? "Yes" : "No"}
      </span>
    </li>
  );
}

/** The context that was actually submitted for this analysis. */
export function PrContextSummary({ context, evidence }: { context: PrContext; evidence?: SignalEvidence }) {
  return (
    <Card aria-labelledby="context-title" className="min-w-0 motion-safe:animate-rise" style={{ animationDelay: "300ms" }}>
      <CardHeader id="context-title" icon={<FileStack />} title="PR Context" description="What Jev evaluated." />
      <CardBody>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-line bg-surface-2/60 p-3">
            <Eyebrow>Files changed</Eyebrow>
            <p className="mt-1 text-2xl font-semibold text-fg tabular-nums">{context.filesChanged}</p>
          </div>
          <div className="rounded-lg border border-line bg-surface-2/60 p-3">
            <Eyebrow>Lines</Eyebrow>
            <p className="mt-1 flex items-center gap-2 font-mono text-[15px] font-semibold tabular-nums">
              <span className="text-diff-add">
                <span className="sr-only">added </span>+{context.linesAdded.toLocaleString("en-US")}
              </span>
              <span className="text-diff-del">
                <span className="sr-only">removed </span>−{context.linesRemoved.toLocaleString("en-US")}
              </span>
            </p>
            <div className="mt-2">
              <DiffBlocks added={context.linesAdded} removed={context.linesRemoved} />
            </div>
          </div>
        </div>
        <ul className="mt-3 divide-y divide-line">
          <SignalRow label="Authentication changes" value={context.hasAuthenticationChanges} icon={<KeyRound />} matches={evidence?.authentication} />
          <SignalRow label="Database changes" value={context.hasDatabaseChanges} icon={<Database />} matches={evidence?.database} />
          <SignalRow label="Tests added" value={context.testsAdded} icon={<FlaskConical />} matches={evidence?.tests} />
        </ul>
        {evidence && (
          <p className="mt-2 text-[11px] leading-4 text-fg-subtle">
            Detected from changed file paths by deterministic heuristics (<code className="font-mono">lib/review/detection.ts</code>), then sent to Jev.
          </p>
        )}
      </CardBody>
    </Card>
  );
}
