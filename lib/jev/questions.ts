import type { PrContext } from "@/lib/review/validation";
import type { JevDecisionRequest, PrReviewQuestions } from "./types";

/**
 * The structured questions this app asks Jev about every Pull Request.
 * Changing a question here changes both the request and the review UI.
 */
export const PR_REVIEW_QUESTIONS: PrReviewQuestions = {
  type: {
    type: "choice",
    instructions: "Classify the type of this pull request.",
    criteria: {
      bug: "Fixes an existing bug",
      feature: "Adds new functionality",
      refactor: "Changes implementation without changing behavior",
      documentation: "Primarily documentation changes",
      other: "Does not fit the other categories",
    },
  },
  risk: {
    type: "score",
    instructions: "Score the engineering risk of this pull request.",
    criteria: ["Low", "Moderate", "High", "Critical"],
  },
  needs_human_review: {
    type: "noul",
    instructions:
      "Does this pull request require careful human review before merging?",
  },
  needs_tests: {
    type: "noul",
    instructions:
      "Should additional automated tests be required before merging this pull request?",
  },
};

/** Converts validated PR context into the exact body sent to Jev. */
export function buildDecisionRequest(context: PrContext): JevDecisionRequest {
  return {
    state: {
      pr_title: context.title,
      pr_description: context.description,
      changed_files: context.changedFiles,
      files_changed: context.filesChanged,
      tests_added: context.testsAdded,
      lines_added: context.linesAdded,
      lines_removed: context.linesRemoved,
      has_database_changes: context.hasDatabaseChanges,
      has_authentication_changes: context.hasAuthenticationChanges,
    },
    questions: PR_REVIEW_QUESTIONS,
  };
}
