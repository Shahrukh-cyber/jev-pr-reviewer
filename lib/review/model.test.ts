import { describe, expect, it } from "vitest";
import { SAMPLE_JEV_RESPONSE } from "@/lib/jev/sample";
import type { JevDecisionResponse } from "@/lib/jev/types";
import { formatPercent, toPercent } from "./format";
import { assess, interpretRiskScore, toReviewModel, type RiskLevel } from "./model";

function withAnswers(
  patch: Partial<JevDecisionResponse["data"]["answers"]>,
): JevDecisionResponse {
  return {
    ...SAMPLE_JEV_RESPONSE,
    data: { answers: { ...SAMPLE_JEV_RESPONSE.data.answers, ...patch } },
  };
}

const LEVELS: RiskLevel[] = [
  { index: 0, label: "Low", tone: "low" },
  { index: 1, label: "Moderate", tone: "moderate" },
  { index: 2, label: "High", tone: "high" },
  { index: 3, label: "Critical", tone: "critical" },
];

describe("probability conversion", () => {
  it("converts probabilities to rounded percentages", () => {
    expect(toPercent(0.86)).toBe(86);
    expect(toPercent(0.455)).toBe(46);
    expect(toPercent(1)).toBe(100);
    expect(formatPercent(0.46)).toBe("46%");
  });

  it("clamps out-of-range values", () => {
    expect(toPercent(-0.2)).toBe(0);
    expect(toPercent(1.3)).toBe(100);
  });
});

describe("risk score interpretation", () => {
  it("places 1.84 between Moderate and High, nearest High", () => {
    const result = interpretRiskScore(1.84, LEVELS);
    expect(result.lower.label).toBe("Moderate");
    expect(result.upper.label).toBe("High");
    expect(result.nearest.label).toBe("High");
    expect(result.interpretation).toBe("Between Moderate and High, closer to High");
  });

  it("handles integer scores as exact levels", () => {
    expect(interpretRiskScore(2, LEVELS).interpretation).toBe("At the High level");
    expect(interpretRiskScore(0, LEVELS).interpretation).toBe("At the Low level");
  });

  it("describes midpoints without picking a side", () => {
    expect(interpretRiskScore(1.5, LEVELS).interpretation).toBe(
      "Midway between Moderate and High",
    );
  });

  it("clamps scores outside the scale", () => {
    expect(interpretRiskScore(4.2, LEVELS).nearest.label).toBe("Critical");
    expect(interpretRiskScore(-1, LEVELS).clampedScore).toBe(0);
  });
});

describe("toReviewModel", () => {
  const model = toReviewModel(SAMPLE_JEV_RESPONSE);

  it("maps the PR type with a human-readable label", () => {
    expect(model.type.choice).toBe("bug");
    expect(model.type.label).toBe("Bug fix");
    expect(model.type.summary).toBe("Jev classified this pull request as a bug fix.");
    expect(model.type.confidence).toBe(1);
    expect(model.type.criterion).toBe("Fixes an existing bug");
  });

  it("orders the type distribution by question criteria, not response order", () => {
    expect(model.type.distribution.map((entry) => entry.key)).toEqual([
      "bug",
      "feature",
      "refactor",
      "documentation",
      "other",
    ]);
    expect(model.type.distribution.find((entry) => entry.isTop)?.key).toBe("bug");
    expect(model.type.distribution[0].percent).toBe(100);
  });

  it("keeps the fractional risk score and exposes the full distribution", () => {
    expect(model.risk.score).toBe(1.84);
    expect(model.risk.max).toBe(3);
    expect(model.risk.position).toBeCloseTo(1.84 / 3);
    expect(model.risk.confidence).toBe(0.68);
    expect(model.risk.distribution.map((e) => [e.label, e.percent])).toEqual([
      ["Low", 0],
      ["Moderate", 23],
      ["High", 69],
      ["Critical", 8],
    ]);
    expect(model.risk.mostProbable.label).toBe("High");
  });

  it("falls back to the question criteria when the legend is missing", () => {
    const { legend: _legend, ...risk } = SAMPLE_JEV_RESPONSE.data.answers.risk;
    void _legend;
    const noLegend = toReviewModel(withAnswers({ risk }));
    expect(noLegend.risk.levels.map((level) => level.label)).toEqual([
      "Low",
      "Moderate",
      "High",
      "Critical",
    ]);
    expect(noLegend.risk.nearest.label).toBe("High");
  });

  it("treats noul values as probabilities with an assessment band", () => {
    expect(model.humanReview.percent).toBe(86);
    expect(model.humanReview.assessment).toBe("likely");
    expect(model.tests.percent).toBe(46);
    expect(model.tests.assessment).toBe("uncertain");
  });

  it("builds a data-driven executive summary", () => {
    expect(model.summary.map((item) => item.value)).toEqual([
      "Bug fix",
      "High",
      "Likely needed",
      "Uncertain",
    ]);
    expect(model.summary[1].detail).toBe("Score 1.84 / 3");
  });

  it("lists decision signals with the raw Jev paths and values", () => {
    const byField = Object.fromEntries(model.signals.map((s) => [s.field, s.value]));
    expect(byField["answers.type.choice"]).toBe('"bug"');
    expect(byField["answers.risk.score"]).toBe("1.84");
    expect(byField['answers.risk.probabilities["2"]']).toBe("0.69");
    expect(byField["answers.needs_human_review.noul"]).toBe("0.86");
    expect(byField["answers.needs_tests.noul"]).toBe("0.46");
  });

  it("labels unknown type choices without inventing descriptions", () => {
    const custom = toReviewModel(
      withAnswers({
        type: { type: "choice", choice: "chore_task", confidence: 0.5, probabilities: { chore_task: 0.5 } },
      }),
    );
    expect(custom.type.label).toBe("Chore Task");
  });
});

describe("assess", () => {
  const thresholds = { likely: 0.7, unlikely: 0.3 };
  it("uses inclusive thresholds", () => {
    expect(assess(0.7, thresholds)).toBe("likely");
    expect(assess(0.69, thresholds)).toBe("uncertain");
    expect(assess(0.3, thresholds)).toBe("unlikely");
  });
});
