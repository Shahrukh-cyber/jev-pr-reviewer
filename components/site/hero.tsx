import { ArrowRight, Braces, GitPullRequest, Workflow } from "lucide-react";
import { Fragment } from "react";
import { buttonClasses } from "@/components/ui/button";
import { JevMark } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

const PIPELINE = [
  { title: "PR Context", detail: "title, files, diff stats", Icon: GitPullRequest, jev: false },
  { title: "Jev", detail: "structured questions", Icon: JevMark, jev: true },
  { title: "Structured Decision", detail: "type · risk · review · tests", Icon: Braces, jev: false },
  { title: "Developer Action", detail: "labels, reviewers, gates", Icon: Workflow, jev: false },
];

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden border-b border-line">
      <div
        aria-hidden
        className="bg-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_70%_60%_at_30%_0%,black,transparent)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/4 h-80 w-[36rem] rounded-full bg-accent/10 blur-3xl dark:bg-accent/15"
      />
      <div className="relative mx-auto max-w-7xl px-4 pt-14 pb-12 sm:px-6 sm:pt-20 lg:px-8">
        <p className="motion-safe:animate-rise inline-flex items-center gap-2 rounded-full border border-line bg-surface px-2.5 py-1 text-xs font-medium text-fg-muted shadow-card">
          <GitPullRequest className="size-3.5 text-accent-text" aria-hidden />
          PR triage with structured decisions
        </p>
        <h1
          id="hero-title"
          className="motion-safe:animate-rise mt-5 max-w-3xl text-4xl leading-[1.08] font-semibold tracking-[-0.03em] text-balance text-fg sm:text-5xl lg:text-[3.5rem]"
          style={{ animationDelay: "60ms" }}
        >
          Turn Pull Requests into structured engineering decisions.
        </h1>
        <p
          className="motion-safe:animate-rise mt-5 max-w-2xl text-base leading-7 text-pretty text-fg-muted sm:text-lg"
          style={{ animationDelay: "120ms" }}
        >
          Jev analyzes PR context and returns structured decisions for risk, type, human review,
          and testing — ready to power automated developer workflows.
        </p>
        <div
          className="motion-safe:animate-rise mt-8 flex flex-wrap items-center gap-3"
          style={{ animationDelay: "180ms" }}
        >
          <a href="#review" className={buttonClasses("primary", "lg")}>
            Review a Pull Request
            <ArrowRight aria-hidden />
          </a>
          <a href="#how-it-works" className={buttonClasses("secondary", "lg")}>
            How it works
          </a>
        </div>

        <ol
          aria-label="Decision pipeline"
          className="motion-safe:animate-rise mt-12 grid grid-cols-2 gap-3 sm:flex sm:items-stretch sm:gap-0"
          style={{ animationDelay: "240ms" }}
        >
          {PIPELINE.map((step, index) => (
            <Fragment key={step.title}>
              {index > 0 && (
                <li aria-hidden className="relative hidden w-10 shrink-0 self-center sm:block lg:w-16">
                  <div className="h-px w-full bg-line-strong" />
                  <span
                    className="motion-safe:animate-travel absolute top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent opacity-0"
                    style={{ animationDelay: `${index * 0.45}s` }}
                  />
                </li>
              )}
              <li
                className={cn(
                  "flex min-w-0 flex-1 items-center gap-3 rounded-xl border px-3.5 py-3",
                  step.jev
                    ? "border-accent-line bg-accent-soft shadow-lift"
                    : "border-line bg-surface shadow-card",
                )}
              >
                <span
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-lg",
                    step.jev ? "bg-accent text-accent-fg" : "border border-line bg-surface-2 text-fg-muted",
                  )}
                >
                  <step.Icon className="size-4" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className={cn("block text-sm font-semibold", step.jev ? "text-accent-text" : "text-fg")}>
                    {step.title}
                  </span>
                  <span className="block text-xs text-fg-subtle sm:truncate">{step.detail}</span>
                </span>
              </li>
            </Fragment>
          ))}
        </ol>
      </div>
    </section>
  );
}
