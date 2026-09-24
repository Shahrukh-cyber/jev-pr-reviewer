import { SAMPLE_JEV_RESPONSE } from "@/lib/jev/sample";
import type { JevDecisionResponse } from "@/lib/jev/types";
import type { StoredAnalysis } from "./record";

/** Test fixtures shared by review tests. */

export const SHA_A = "a".repeat(40);
export const SHA_B = "b".repeat(40);

export function jevResponse(patch: { score?: number; review?: number; tests?: number; choice?: string } = {}): JevDecisionResponse {
  const answers = SAMPLE_JEV_RESPONSE.data.answers;
  return {
    code: 0,
    message: "ok",
    data: {
      answers: {
        type: { ...answers.type, choice: patch.choice ?? answers.type.choice },
        risk: { ...answers.risk, score: patch.score ?? answers.risk.score },
        needs_human_review: { type: "noul", noul: patch.review ?? answers.needs_human_review.noul },
        needs_tests: { type: "noul", noul: patch.tests ?? answers.needs_tests.noul },
      },
    },
  };
}

export function analysis(headSha: string, analyzedAt: string, response: unknown = jevResponse()): StoredAnalysis {
  return {
    headSha,
    analyzedAt,
    durationMs: 1200,
    context: {
      title: "Fix JWT refresh",
      description: "Refresh expired tokens.",
      descriptionTruncated: false,
      changedFiles: ["src/auth/token.ts"],
      changedFilesTruncated: false,
      filesChanged: 1,
      linesAdded: 10,
      linesRemoved: 2,
      testsAdded: false,
      hasAuthenticationChanges: true,
      hasDatabaseChanges: false,
    },
    detection: { tests: [], authentication: ["src/auth/token.ts"], database: [] },
    response,
    labels: ["bug", "high-risk", "needs-review"],
    runUrl: "https://github.com/o/r/actions/runs/1",
  };
}
