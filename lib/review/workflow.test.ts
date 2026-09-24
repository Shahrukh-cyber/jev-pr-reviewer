import { describe, expect, it } from "vitest";
import { SAMPLE_JEV_RESPONSE } from "@/lib/jev/sample";
import type { JevDecisionResponse } from "@/lib/jev/types";
import { DEFAULT_WORKFLOW_CONFIG } from "./config";
import { deriveWorkflow } from "./workflow";

function decision(overrides: {
  choice?: string;
  typeConfidence?: number;
  score?: number;
  review?: number;
  tests?: number;
}): JevDecisionResponse {
  const answers = SAMPLE_JEV_RESPONSE.data.answers;
  return {
    ...SAMPLE_JEV_RESPONSE,
    data: {
      answers: {
        type: {
          ...answers.type,
          choice: overrides.choice ?? answers.type.choice,
          confidence: overrides.typeConfidence ?? answers.type.confidence,
        },
        risk: { ...answers.risk, score: overrides.score ?? answers.risk.score },
        needs_human_review: { type: "noul", noul: overrides.review ?? answers.needs_human_review.noul },
        needs_tests: { type: "noul", noul: overrides.tests ?? answers.needs_tests.noul },
      },
    },
  };
}

describe("deriveWorkflow", () => {
  it("derives bug, high-risk and needs-review for the sample decision", () => {
    const preview = deriveWorkflow(SAMPLE_JEV_RESPONSE);
    expect(preview.labels).toEqual(["bug", "high-risk", "needs-review"]);
    expect(preview.signals.find((s) => s.id === "tests")?.applied).toBe(false);
    expect(preview.actions.map((a) => a.id)).toEqual(["request-review", "block-auto-merge"]);
  });

  it("is deterministic", () => {
    expect(deriveWorkflow(SAMPLE_JEV_RESPONSE)).toEqual(deriveWorkflow(SAMPLE_JEV_RESPONSE));
  });

  it("maps risk scores to labels via ordered thresholds", () => {
    expect(deriveWorkflow(decision({ score: 0.2 })).labels).toContain("low-risk");
    expect(deriveWorkflow(decision({ score: 0.5 })).labels).toContain("moderate-risk");
    expect(deriveWorkflow(decision({ score: 1.49 })).labels).toContain("moderate-risk");
    expect(deriveWorkflow(decision({ score: 2.7 })).labels).toContain("critical-risk");
  });

  it("applies needs-tests at the threshold", () => {
    expect(deriveWorkflow(decision({ tests: 0.7 })).labels).toContain("needs-tests");
    expect(deriveWorkflow(decision({ tests: 0.69 })).labels).not.toContain("needs-tests");
  });

  it("skips the type label when confidence is too low or no label maps", () => {
    expect(deriveWorkflow(decision({ typeConfidence: 0.4 })).labels).not.toContain("bug");
    expect(deriveWorkflow(decision({ choice: "other" })).labels).not.toContain("other");
  });

  it("marks low-risk PRs with no other signals as auto-merge eligible", () => {
    const preview = deriveWorkflow(decision({ score: 0.1, review: 0.1, tests: 0.1 }));
    expect(preview.actions.map((a) => a.id)).toEqual(["auto-merge-eligible"]);
  });

  it("respects custom thresholds", () => {
    const preview = deriveWorkflow(SAMPLE_JEV_RESPONSE, {
      ...DEFAULT_WORKFLOW_CONFIG,
      needsReviewThreshold: 0.9,
      needsTestsThreshold: 0.4,
    });
    expect(preview.labels).not.toContain("needs-review");
    expect(preview.labels).toContain("needs-tests");
  });
});
