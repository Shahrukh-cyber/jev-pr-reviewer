import { Braces, FileSearch, GitPullRequest, Tags } from "lucide-react";
import { Fragment } from "react";
import { GitHubMark, JevMark } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

const STEPS = [
  { title: "GitHub Pull Request", detail: "Opened or updated", Icon: GitPullRequest, highlight: false },
  { title: "Collect PR Context", detail: "Title, description, files, diff stats", Icon: FileSearch, highlight: false },
  { title: "Jev API", detail: "POST /api/v1/decisions", Icon: JevMark, highlight: true },
  { title: "Structured Decision", detail: "type · risk · needs_human_review · needs_tests", Icon: Braces, highlight: false },
  { title: "GitHub Automation", detail: "Labels, reviewers, merge gates", Icon: Tags, highlight: false },
];

/** How a GitHub Action could wire Jev into PR triage. Illustrative — not a shipped integration. */
export function WorkflowDiagram() {
  return (
    <div className="rounded-xl border border-line bg-surface p-5 shadow-card sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-fg">
          <GitHubMark className="size-4" />
          GitHub Actions integration
        </h3>
        <span className="rounded-md border border-line bg-surface-2 px-1.5 py-0.5 text-[11px] font-medium text-fg-muted">
          Illustrative workflow
        </span>
      </div>
      <ol className="mt-5 flex flex-col items-stretch gap-0 lg:flex-row lg:items-stretch">
        {STEPS.map((step, index) => (
          <Fragment key={step.title}>
            {index > 0 && (
              <li aria-hidden className="flex shrink-0 items-center justify-center py-1.5 lg:w-8 lg:py-0">
                <span className="h-4 w-px bg-line-strong lg:h-px lg:w-full" />
              </li>
            )}
            <li
              className={cn(
                "relative flex flex-1 items-center gap-3 rounded-lg border px-3.5 py-3 lg:flex-col lg:items-start lg:gap-2.5 lg:px-4 lg:py-4",
                step.highlight
                  ? "border-accent-line bg-accent-soft"
                  : "border-line bg-surface-2/60",
              )}
            >
              <span
                className={cn(
                  "grid size-8 shrink-0 place-items-center rounded-lg",
                  step.highlight ? "bg-accent text-accent-fg" : "border border-line bg-surface text-fg-muted",
                )}
              >
                <step.Icon className="size-4" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-fg-subtle">{String(index + 1).padStart(2, "0")}</span>
                  <span className={cn("text-sm font-semibold", step.highlight ? "text-accent-text" : "text-fg")}>
                    {step.title}
                  </span>
                </span>
                <span className="mt-0.5 block text-xs leading-5 break-words text-fg-muted">{step.detail}</span>
              </span>
            </li>
          </Fragment>
        ))}
      </ol>
    </div>
  );
}
