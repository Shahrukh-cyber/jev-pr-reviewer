import { Circle, CircleCheck, Info, Settings2 } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { GitHubMark } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import type { WorkflowPreview } from "@/lib/review/workflow";

/** GitHub-style label colors for the simulated sidebar. */
const LABEL_COLORS: Record<string, string> = {
  bug: "border-[#d73a4a]/40 bg-[#d73a4a]/12 text-[#b31d28] dark:text-[#ff7b8a]",
  feature: "border-[#0969da]/40 bg-[#0969da]/10 text-[#0550ae] dark:text-[#79c0ff]",
  refactor: "border-[#8250df]/40 bg-[#8250df]/10 text-[#6639ba] dark:text-[#d2a8ff]",
  documentation: "border-[#0075ca]/40 bg-[#0075ca]/10 text-[#005a9e] dark:text-[#7cc4fa]",
  "low-risk": "border-[#1a7f37]/40 bg-[#1a7f37]/10 text-[#116329] dark:text-[#7ee787]",
  "moderate-risk": "border-[#bf8700]/45 bg-[#bf8700]/12 text-[#7d4e00] dark:text-[#e3b341]",
  "high-risk": "border-[#e16f24]/45 bg-[#e16f24]/12 text-[#a4410e] dark:text-[#ffa657]",
  "critical-risk": "border-[#cf222e]/45 bg-[#cf222e]/12 text-[#a40e26] dark:text-[#ff7b72]",
  "needs-review": "border-[#8250df]/40 bg-[#8250df]/10 text-[#6639ba] dark:text-[#d2a8ff]",
  "needs-tests": "border-[#bf8700]/45 bg-[#bf8700]/12 text-[#7d4e00] dark:text-[#e3b341]",
};

function GitHubLabel({ name, muted = false }: { name: string; muted?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs leading-4 font-medium whitespace-nowrap",
        muted ? "border-dashed border-line-strong text-fg-subtle" : (LABEL_COLORS[name] ?? "border-line bg-surface-2 text-fg"),
      )}
    >
      {name}
    </span>
  );
}

export function AutomationPreview({ workflow, applied = false }: { workflow: WorkflowPreview; applied?: boolean }) {
  return (
    <Card aria-labelledby="automation-title" className="motion-safe:animate-rise" style={{ animationDelay: "360ms" }}>
      <CardHeader
        id="automation-title"
        icon={<GitHubMark />}
        title={applied ? "Workflow signals" : "Suggested workflow signals"}
        description={applied ? "What the Jev PR Review workflow did on this PR." : "What a GitHub Action could do with this decision."}
        action={
          applied ? (
            <span className="rounded-md border border-risk-low/30 bg-[var(--risk-low-soft)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--risk-low-text)]">
              Labels applied on GitHub
            </span>
          ) : (
            <span className="rounded-md border border-dashed border-line-strong px-1.5 py-0.5 text-[11px] font-medium text-fg-muted">
              Simulated
            </span>
          )
        }
      />
      <div className="mx-5 mt-4 flex gap-2 rounded-lg border border-line bg-surface-2/60 px-3 py-2.5 text-xs leading-5 text-fg-muted">
        <Info aria-hidden className="mt-0.5 size-3.5 shrink-0" />
        <p>
          These labels and actions are <strong className="font-medium text-fg">derived by this app</strong> from
          Jev&apos;s answers using deterministic rules. Jev returns the structured decision only — not labels.
        </p>
      </div>

      <div className="grid gap-4 p-5">
        {/* Simulated GitHub PR sidebar */}
        <div className="grid rounded-lg border border-line bg-surface sm:grid-cols-2">
          <div className="border-b border-line px-3.5 py-3 sm:border-r sm:border-b-0">
            <p className="text-xs font-semibold text-fg">Labels</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {workflow.labels.length > 0 ? (
                workflow.labels.map((label) => <GitHubLabel key={label} name={label} />)
              ) : (
                <span className="text-xs text-fg-subtle">None yet</span>
              )}
            </div>
          </div>
          <div className="px-3.5 py-3">
            <p className="text-xs font-semibold text-fg">Suggested actions{applied && <span className="font-normal text-fg-subtle"> · not automated</span>}</p>
            <ul className="mt-2 space-y-2">
              {workflow.actions.length > 0 ? (
                workflow.actions.map((action) => (
                  <li key={action.id} className="flex gap-2 text-xs leading-5 text-fg-muted">
                    <CircleCheck aria-hidden className="mt-0.5 size-3.5 shrink-0 text-accent-text" />
                    <span>
                      {action.label}
                      <span className="block font-mono text-[10.5px] text-fg-subtle">
                        via {action.triggeredBy.join(", ")}
                      </span>
                    </span>
                  </li>
                ))
              ) : (
                <li className="text-xs text-fg-subtle">No actions triggered</li>
              )}
            </ul>
          </div>
        </div>

        {/* Rules */}
        <div className="min-w-0">
          <div className="overflow-x-auto rounded-lg border border-line">
            <table className="w-full min-w-[520px] text-left text-[13px]">
              <caption className="sr-only">Rules that map Jev values to workflow labels</caption>
              <thead>
                <tr className="border-b border-line bg-surface-2/60 text-[11px] tracking-[0.06em] text-fg-subtle uppercase">
                  <th scope="col" className="px-3 py-2 font-medium">Label</th>
                  <th scope="col" className="px-3 py-2 font-medium">Rule</th>
                  <th scope="col" className="px-3 py-2 font-medium">Jev value</th>
                  <th scope="col" className="px-3 py-2 font-medium">Result</th>
                </tr>
              </thead>
              <tbody>
                {workflow.signals.map((signal) => (
                  <tr key={signal.id} className="border-b border-line last:border-b-0">
                    <td className="px-3 py-2.5">
                      {signal.label ? (
                        <GitHubLabel name={signal.label} muted={!signal.applied} />
                      ) : (
                        <span className="text-xs text-fg-subtle">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[11.5px] text-fg-muted">{signal.rule}</td>
                    <td className="px-3 py-2.5 font-mono text-[11.5px] whitespace-nowrap text-fg">{signal.observed}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {signal.applied ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-fg">
                          <CircleCheck aria-hidden className="size-3.5 text-accent-text" /> Applied
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-fg-subtle">
                          <Circle aria-hidden className="size-3.5" /> Not applied
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2.5 flex items-center gap-1.5 text-[11px] text-fg-subtle">
            <Settings2 aria-hidden className="size-3" />
            Thresholds are configurable in <code className="font-mono">lib/review/config.ts</code>.
          </p>
        </div>
      </div>
    </Card>
  );
}
