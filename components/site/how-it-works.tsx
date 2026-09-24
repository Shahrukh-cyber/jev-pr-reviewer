import { ArrowDown, Bot, GitPullRequest, ListChecks, User, Workflow } from "lucide-react";
import type { ReactNode } from "react";
import { WorkflowDiagram } from "@/components/pr-review/workflow-diagram";
import { JevMark } from "@/components/ui/icons";
import { SectionHeading } from "@/components/ui/section-heading";
import { PR_REVIEW_QUESTIONS } from "@/lib/jev/questions";
import type { JevQuestion } from "@/lib/jev/types";
import { cn } from "@/lib/cn";

interface FlowStep {
  title: string;
  icon: ReactNode;
  visual?: ReactNode;
}

function Flow({ steps, tone }: { steps: FlowStep[]; tone: "muted" | "jev" }) {
  return (
    <ol className="space-y-0">
      {steps.map((step, index) => (
        <li key={step.title}>
          {index > 0 && (
            <div aria-hidden className="flex h-6 items-center pl-[15px]">
              <ArrowDown className={cn("size-3.5", tone === "jev" ? "text-accent-text" : "text-fg-subtle")} />
            </div>
          )}
          <div className="flex gap-3">
            <span
              aria-hidden
              className={cn(
                "grid size-8 shrink-0 place-items-center rounded-lg [&_svg]:size-4",
                tone === "jev" ? "bg-accent-soft text-accent-text" : "bg-surface-2 text-fg-subtle",
              )}
            >
              {step.icon}
            </span>
            <div className="min-w-0 flex-1 pt-1.5">
              <p className="text-sm font-medium text-fg">{step.title}</p>
              {step.visual && <div className="mt-2">{step.visual}</div>}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

function TextWall() {
  const widths = ["w-full", "w-11/12", "w-full", "w-4/5", "w-full", "w-10/12", "w-3/5"];
  return (
    <div aria-label="A long block of generated prose" role="img" className="space-y-1.5 rounded-lg border border-line bg-surface-2/60 p-3">
      {widths.map((width, index) => (
        <div key={index} className={cn("h-1.5 rounded-full bg-fg-subtle/20", width)} />
      ))}
    </div>
  );
}

function MiniJson() {
  const rows: [string, string][] = [
    ["type.choice", '"bug"'],
    ["risk.score", "1.84"],
    ["needs_human_review.noul", "0.86"],
    ["needs_tests.noul", "0.46"],
  ];
  return (
    <dl className="overflow-hidden rounded-lg border border-accent-line/70 bg-surface font-mono text-xs">
      {rows.map(([key, value]) => (
        <div key={key} className="flex justify-between gap-3 border-b border-line px-3 py-1.5 last:border-b-0">
          <dt className="truncate text-fg-muted">{key}</dt>
          <dd className="text-accent-text">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Chips({ items, mono = true }: { items: string[]; mono?: boolean }) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <li
          key={item}
          className={cn(
            "rounded-md border border-line bg-surface px-1.5 py-0.5 text-[11px] text-fg-muted",
            mono && "font-mono",
          )}
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

const QUESTION_TYPE_COPY: Record<JevQuestion["type"], string> = {
  choice: "One of a fixed set, with a probability for each",
  score: "A number on an ordered scale, with a distribution",
  noul: "A yes/no probability between 0 and 1",
};

function QuestionCard({ name, question }: { name: string; question: JevQuestion }) {
  const outcomes =
    question.type === "choice"
      ? Object.keys(question.criteria)
      : question.type === "score"
        ? question.criteria.map((label, index) => `${index} ${label}`)
        : ["0.0 … 1.0"];
  return (
    <li className="flex flex-col rounded-xl border border-line bg-surface p-4 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <code className="truncate font-mono text-[13px] font-semibold text-fg">{name}</code>
        <span className="rounded-md bg-accent-soft px-1.5 py-0.5 font-mono text-[11px] font-medium text-accent-text">
          {question.type}
        </span>
      </div>
      <p className="mt-2 flex-1 text-[13px] leading-5 text-fg-muted">{question.instructions}</p>
      <div className="mt-3">
        <Chips items={outcomes} />
      </div>
      <p className="mt-3 border-t border-line pt-2.5 text-[11px] text-fg-subtle">{QUESTION_TYPE_COPY[question.type]}</p>
    </li>
  );
}

export function HowItWorks() {
  return (
    <section id="how-it-works" aria-labelledby="how-it-works-title" className="scroll-mt-20 border-t border-line">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <SectionHeading
          id="how-it-works-title"
          eyebrow="How it works"
          title="From PR context to actionable signals."
          description="No walls of generated text. Just structured decisions your workflow can use."
        />

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-line bg-surface p-5 shadow-card sm:p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-fg">Traditional AI review</h3>
              <span className="text-xs text-fg-subtle">Unstructured</span>
            </div>
            <div className="mt-5">
              <Flow
                tone="muted"
                steps={[
                  { title: "Pull Request", icon: <GitPullRequest /> },
                  { title: "Long generated response", icon: <Bot />, visual: <TextWall /> },
                  { title: "Human interprets the response", icon: <User /> },
                  { title: "Human decides what to do", icon: <User /> },
                ]}
              />
            </div>
          </div>

          <div className="relative rounded-xl border border-accent-line bg-surface p-5 shadow-lift sm:p-6">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-fg">
                <JevMark className="size-4 text-accent-text" />
                With Jev
              </h3>
              <span className="text-xs font-medium text-accent-text">Structured</span>
            </div>
            <div className="mt-5">
              <Flow
                tone="jev"
                steps={[
                  { title: "Pull Request", icon: <GitPullRequest /> },
                  {
                    title: "Structured questions",
                    icon: <ListChecks />,
                    visual: <Chips items={["type: choice", "risk: score", "needs_human_review: noul", "needs_tests: noul"]} />,
                  },
                  { title: "Structured decisions (example values)", icon: <JevMark />, visual: <MiniJson /> },
                  {
                    title: "Deterministic workflow",
                    icon: <Workflow />,
                    visual: <Chips mono={false} items={["label: high-risk", "request reviewers", "gate merge"]} />,
                  },
                ]}
              />
            </div>
          </div>
        </div>

        <div className="mt-4">
          <WorkflowDiagram />
        </div>

        <div className="mt-14">
          <h3 className="text-lg font-semibold tracking-tight text-fg">The questions this app asks Jev</h3>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-fg-muted">
            Every analysis sends the same four typed questions. Each answer type has a fixed shape,
            so the UI — and any automation — can consume it without parsing prose.
          </p>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(PR_REVIEW_QUESTIONS).map(([name, question]) => (
              <QuestionCard key={name} name={name} question={question} />
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
