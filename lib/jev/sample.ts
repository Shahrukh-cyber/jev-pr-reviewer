import type { JevDecisionResponse } from "./types";

/**
 * Jev's documented example response for the demo JWT PR.
 * Served only when JEV_USE_SAMPLE_RESPONSE=true, and always labeled as a
 * sample in the UI — it is not generated from the submitted input.
 */
export const SAMPLE_JEV_RESPONSE: JevDecisionResponse = {
  code: 0,
  message: "ok",
  data: {
    answers: {
      type: {
        type: "choice",
        choice: "bug",
        confidence: 1,
        probabilities: {
          refactor: 0,
          feature: 0,
          documentation: 0,
          other: 0,
          bug: 1,
        },
      },
      risk: {
        type: "score",
        score: 1.84,
        confidence: 0.68,
        legend: {
          "0": "Low",
          "1": "Moderate",
          "2": "High",
          "3": "Critical",
        },
        probabilities: {
          "0": 0,
          "1": 0.23,
          "2": 0.69,
          "3": 0.08,
        },
      },
      needs_human_review: {
        type: "noul",
        noul: 0.86,
      },
      needs_tests: {
        type: "noul",
        noul: 0.46,
      },
    },
  },
};
