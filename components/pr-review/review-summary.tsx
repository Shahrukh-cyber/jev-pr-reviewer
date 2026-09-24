import { Eyebrow, TONE_STYLES } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import type { ReviewModel } from "@/lib/review/model";

/** One-line, data-driven summary. Every clause maps to a Jev value. */
function summarySentence(model: ReviewModel): string {
  const { type, risk, humanReview, tests } = model;
  const review =
    humanReview.assessment === "likely"
      ? "careful human review is likely needed"
      : humanReview.assessment === "unlikely"
        ? "careful human review is unlikely to be needed"
        : "the need for careful human review is uncertain";
  const testing =
    tests.assessment === "likely"
      ? "additional tests are likely needed"
      : tests.assessment === "unlikely"
        ? "additional tests are unlikely to be needed"
        : "the need for additional tests is uncertain";
  return `${type.label} with a risk score of ${risk.score.toFixed(2)} — ${risk.interpretation.charAt(0).toLowerCase()}${risk.interpretation.slice(1)}. Jev indicates ${review} (${humanReview.percent}%) and ${testing} (${tests.percent}%).`;
}

export function ReviewSummary({ model }: { model: ReviewModel }) {
  return (
    <section aria-label="Executive summary" className="motion-safe:animate-rise">
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line shadow-card sm:grid-cols-4 [&>div]:bg-surface">
        {model.summary.map((item) => (
          <div key={item.id} className="p-4">
            <dt>
              <Eyebrow>{item.eyebrow}</Eyebrow>
            </dt>
            <dd className="mt-1.5">
              <span className={cn("flex items-center gap-2 text-[15px] font-semibold", TONE_STYLES[item.tone].text)}>
                <span aria-hidden className={cn("size-2 shrink-0 rounded-full", TONE_STYLES[item.tone].dot)} />
                {item.value}
              </span>
              <span className="mt-0.5 block text-xs text-fg-subtle tabular-nums">{item.detail}</span>
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-sm leading-6 text-pretty text-fg-muted">{summarySentence(model)}</p>
    </section>
  );
}
