import { PR_REVIEW_QUESTIONS } from "@/lib/jev/questions";
import type {
  JevDecisionResponse,
  NoulAnswer,
  PrReviewQuestions,
  ProbabilityDistribution,
} from "@/lib/jev/types";
import { ASSESSMENT_THRESHOLDS, type AssessmentThresholds } from "./config";
import { clamp, formatPercent, formatRaw, titleCase, toPercent } from "./format";

/**
 * Jev response → UI-ready review model.
 *
 * Everything here is a faithful re-expression of Jev's answers. The only
 * interpretation added is (a) human-readable labels and (b) likely/uncertain
 * bands for noul probabilities, both driven by explicit config.
 */

export type RiskTone = "low" | "moderate" | "high" | "critical";
export type Tone = "accent" | "neutral" | RiskTone;
export type Assessment = "likely" | "uncertain" | "unlikely";

export interface DistributionEntry {
  key: string;
  label: string;
  probability: number;
  percent: number;
  /** Highest probability in the distribution (first one wins ties). */
  isTop: boolean;
  tone: Tone;
}

export interface TypeDecision {
  choice: string;
  label: string;
  summary: string;
  /** The question's criterion text for the chosen category, if defined. */
  criterion: string | null;
  confidence: number;
  distribution: DistributionEntry[];
}

export interface RiskLevel {
  index: number;
  label: string;
  tone: RiskTone;
}

export interface RiskDecision {
  score: number;
  /** Score clamped to the scale, for positioning. */
  clampedScore: number;
  max: number;
  /** clampedScore / max, in [0, 1]. */
  position: number;
  confidence: number;
  levels: RiskLevel[];
  lower: RiskLevel;
  upper: RiskLevel;
  nearest: RiskLevel;
  mostProbable: DistributionEntry;
  interpretation: string;
  distribution: DistributionEntry[];
}

export interface ProbabilityDecision {
  field: string;
  probability: number;
  percent: number;
  assessment: Assessment;
  assessmentLabel: string;
}

export interface SummaryItem {
  id: "type" | "risk" | "review" | "tests";
  eyebrow: string;
  value: string;
  detail: string;
  tone: Tone;
}

export interface DecisionSignal {
  group: "PR type" | "Risk" | "Human review" | "Additional tests";
  /** JSON path inside the Jev response. */
  field: string;
  /** Value as it appears in the raw JSON. */
  value: string;
  reading: string;
  highlight: boolean;
}

export interface ReviewModel {
  type: TypeDecision;
  risk: RiskDecision;
  humanReview: ProbabilityDecision;
  tests: ProbabilityDecision;
  summary: SummaryItem[];
  signals: DecisionSignal[];
}

// ---------------------------------------------------------------------------
// PR type
// ---------------------------------------------------------------------------

const TYPE_COPY: Record<string, { label: string; noun: string }> = {
  bug: { label: "Bug fix", noun: "a bug fix" },
  feature: { label: "Feature", noun: "a new feature" },
  refactor: { label: "Refactor", noun: "a refactor" },
  documentation: { label: "Documentation", noun: "a documentation change" },
  other: { label: "Other", noun: "outside the standard categories" },
};

export function typeLabel(choice: string): string {
  return TYPE_COPY[choice]?.label ?? titleCase(choice);
}

function markTop<T extends { probability: number }>(entries: T[]): (T & { isTop: boolean })[] {
  let topIndex = -1;
  entries.forEach((entry, index) => {
    if (topIndex === -1 || entry.probability > entries[topIndex].probability) topIndex = index;
  });
  return entries.map((entry, index) => ({ ...entry, isTop: index === topIndex }));
}

function buildTypeDecision(
  answer: JevDecisionResponse["data"]["answers"]["type"],
  questions: PrReviewQuestions,
): TypeDecision {
  const criteriaOrder = Object.keys(questions.type.criteria);
  const keys = Object.keys(answer.probabilities).sort((a, b) => {
    const ai = criteriaOrder.indexOf(a);
    const bi = criteriaOrder.indexOf(b);
    return (ai === -1 ? Infinity : ai) - (bi === -1 ? Infinity : bi);
  });

  const distribution = markTop(
    keys.map((key) => ({
      key,
      label: typeLabel(key),
      probability: clamp(answer.probabilities[key], 0, 1),
      percent: toPercent(answer.probabilities[key]),
      tone: (key === answer.choice ? "accent" : "neutral") as Tone,
    })),
  );

  const copy = TYPE_COPY[answer.choice];
  return {
    choice: answer.choice,
    label: typeLabel(answer.choice),
    summary: copy
      ? `Jev classified this pull request as ${copy.noun}.`
      : `Jev classified this pull request as “${answer.choice}”.`,
    criterion: questions.type.criteria[answer.choice] ?? null,
    confidence: answer.confidence,
    distribution,
  };
}

// ---------------------------------------------------------------------------
// Risk
// ---------------------------------------------------------------------------

const RISK_TONES: RiskTone[] = ["low", "moderate", "high", "critical"];

function riskTone(index: number, max: number): RiskTone {
  if (max <= 0) return "low";
  return RISK_TONES[Math.round((clamp(index, 0, max) / max) * (RISK_TONES.length - 1))];
}

function riskLevels(legend: Record<string, string> | undefined, criteria: string[]): RiskLevel[] {
  const entries: [number, string][] =
    legend && Object.keys(legend).length > 0
      ? Object.entries(legend)
          .map(([key, label]): [number, string] => [Number(key), label])
          .filter(([index]) => Number.isInteger(index) && index >= 0)
          .sort(([a], [b]) => a - b)
      : criteria.map((label, index): [number, string] => [index, label]);
  const max = entries.length > 0 ? entries[entries.length - 1][0] : 0;
  return entries.map(([index, label]) => ({ index, label, tone: riskTone(index, max) }));
}

function levelAt(levels: RiskLevel[], index: number): RiskLevel {
  return (
    levels.find((level) => level.index === index) ?? {
      index,
      label: `Level ${index}`,
      tone: riskTone(index, levels.at(-1)?.index ?? index),
    }
  );
}

/** Describes where a fractional score sits relative to the named levels. */
export function interpretRiskScore(score: number, levels: RiskLevel[]) {
  const max = levels.at(-1)?.index ?? 0;
  const clampedScore = clamp(score, 0, max);
  const lower = levelAt(levels, Math.floor(clampedScore));
  const upper = levelAt(levels, Math.ceil(clampedScore));
  const nearest = levelAt(levels, Math.round(clampedScore));

  let interpretation: string;
  if (lower.index === upper.index) {
    interpretation = `At the ${lower.label} level`;
  } else if (Math.abs(clampedScore - lower.index - 0.5) < 0.05) {
    interpretation = `Midway between ${lower.label} and ${upper.label}`;
  } else {
    interpretation = `Between ${lower.label} and ${upper.label}, closer to ${nearest.label}`;
  }

  return { clampedScore, max, lower, upper, nearest, interpretation };
}

function buildRiskDecision(
  answer: JevDecisionResponse["data"]["answers"]["risk"],
  questions: PrReviewQuestions,
): RiskDecision {
  const levels = riskLevels(answer.legend, questions.risk.criteria);
  const { clampedScore, max, lower, upper, nearest, interpretation } = interpretRiskScore(
    answer.score,
    levels,
  );

  const distribution = markTop(
    Object.keys(answer.probabilities)
      .sort((a, b) => Number(a) - Number(b))
      .map((key) => {
        const level = levelAt(levels, Number(key));
        return {
          key,
          label: answer.legend?.[key] ?? level.label,
          probability: clamp(answer.probabilities[key], 0, 1),
          percent: toPercent(answer.probabilities[key]),
          tone: level.tone as Tone,
        };
      }),
  );

  const mostProbable = distribution.find((entry) => entry.isTop) ?? {
    key: String(nearest.index),
    label: nearest.label,
    probability: 0,
    percent: 0,
    isTop: true,
    tone: nearest.tone,
  };

  return {
    score: answer.score,
    clampedScore,
    max,
    position: max > 0 ? clampedScore / max : 0,
    confidence: answer.confidence,
    levels,
    lower,
    upper,
    nearest,
    mostProbable,
    interpretation,
    distribution,
  };
}

// ---------------------------------------------------------------------------
// Noul probabilities
// ---------------------------------------------------------------------------

export function assess(probability: number, thresholds: AssessmentThresholds): Assessment {
  if (probability >= thresholds.likely) return "likely";
  if (probability <= thresholds.unlikely) return "unlikely";
  return "uncertain";
}

const ASSESSMENT_LABEL: Record<Assessment, string> = {
  likely: "Likely needed",
  uncertain: "Uncertain",
  unlikely: "Likely not needed",
};

function buildProbabilityDecision(
  field: string,
  answer: NoulAnswer,
  thresholds: AssessmentThresholds,
): ProbabilityDecision {
  const probability = clamp(answer.noul, 0, 1);
  const assessment = assess(probability, thresholds);
  return {
    field,
    probability,
    percent: toPercent(probability),
    assessment,
    assessmentLabel: ASSESSMENT_LABEL[assessment],
  };
}

const ASSESSMENT_TONE: Record<Assessment, Tone> = {
  likely: "accent",
  uncertain: "neutral",
  unlikely: "neutral",
};

// ---------------------------------------------------------------------------
// Signals
// ---------------------------------------------------------------------------

function distributionSignals(
  field: string,
  probabilities: ProbabilityDistribution,
  entries: DistributionEntry[],
  group: DecisionSignal["group"],
): DecisionSignal[] {
  return [...entries]
    .sort((a, b) => b.probability - a.probability)
    .map((entry) => ({
      group,
      field: `${field}["${entry.key}"]`,
      value: formatRaw(probabilities[entry.key]),
      reading: `${entry.label} · ${entry.percent}%${entry.isTop ? " (most probable)" : ""}`,
      highlight: entry.isTop,
    }));
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export function toReviewModel(
  decision: JevDecisionResponse,
  questions: PrReviewQuestions = PR_REVIEW_QUESTIONS,
  thresholds: AssessmentThresholds = ASSESSMENT_THRESHOLDS,
): ReviewModel {
  const { answers } = decision.data;
  const type = buildTypeDecision(answers.type, questions);
  const risk = buildRiskDecision(answers.risk, questions);
  const humanReview = buildProbabilityDecision(
    "answers.needs_human_review.noul",
    answers.needs_human_review,
    thresholds,
  );
  const tests = buildProbabilityDecision("answers.needs_tests.noul", answers.needs_tests, thresholds);

  const summary: SummaryItem[] = [
    {
      id: "type",
      eyebrow: "PR type",
      value: type.label,
      detail: `${formatPercent(type.confidence)} confidence`,
      tone: "accent",
    },
    {
      id: "risk",
      eyebrow: "Engineering risk",
      value: risk.nearest.label,
      detail: `Score ${risk.score.toFixed(2)} / ${risk.max}`,
      tone: risk.nearest.tone,
    },
    {
      id: "review",
      eyebrow: "Human review",
      value: humanReview.assessmentLabel,
      detail: `${humanReview.percent}% probability`,
      tone: ASSESSMENT_TONE[humanReview.assessment],
    },
    {
      id: "tests",
      eyebrow: "Additional tests",
      value: tests.assessmentLabel,
      detail: `${tests.percent}% probability`,
      tone: ASSESSMENT_TONE[tests.assessment],
    },
  ];

  const signals: DecisionSignal[] = [
    {
      group: "PR type",
      field: "answers.type.choice",
      value: JSON.stringify(answers.type.choice),
      reading: type.label,
      highlight: true,
    },
    {
      group: "PR type",
      field: "answers.type.confidence",
      value: formatRaw(answers.type.confidence),
      reading: `${formatPercent(answers.type.confidence)} confidence`,
      highlight: false,
    },
    {
      group: "Risk",
      field: "answers.risk.score",
      value: formatRaw(answers.risk.score),
      reading: `${risk.interpretation} (scale 0–${risk.max})`,
      highlight: true,
    },
    {
      group: "Risk",
      field: "answers.risk.confidence",
      value: formatRaw(answers.risk.confidence),
      reading: `${formatPercent(answers.risk.confidence)} confidence`,
      highlight: false,
    },
    ...distributionSignals(
      "answers.risk.probabilities",
      answers.risk.probabilities,
      risk.distribution,
      "Risk",
    ),
    {
      group: "Human review",
      field: humanReview.field,
      value: formatRaw(answers.needs_human_review.noul),
      reading: `${humanReview.percent}% probability that careful human review is needed`,
      highlight: true,
    },
    {
      group: "Additional tests",
      field: tests.field,
      value: formatRaw(answers.needs_tests.noul),
      reading: `${tests.percent}% probability that more automated tests are needed`,
      highlight: true,
    },
  ];

  return { type, risk, humanReview, tests, summary, signals };
}
