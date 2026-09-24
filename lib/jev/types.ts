/**
 * Types for Jev's structured decision API (POST /api/v1/decisions).
 *
 * A request pairs a free-form `state` with a set of typed `questions`;
 * the response answers each question with a typed, machine-readable answer.
 */

/** Maps an outcome key (a choice name, or a risk level index like "2") to a probability in [0, 1]. */
export type ProbabilityDistribution = Record<string, number>;

// ---------------------------------------------------------------------------
// Questions
// ---------------------------------------------------------------------------

export interface ChoiceQuestion {
  type: "choice";
  instructions: string;
  /** Choice key → description of when that choice applies. */
  criteria: Record<string, string>;
}

export interface ScoreQuestion {
  type: "score";
  instructions: string;
  /** Ordered level labels. Index `i` corresponds to score `i`. */
  criteria: string[];
}

/** A yes/no question whose answer is a probability ("noul"). */
export interface NoulQuestion {
  type: "noul";
  instructions: string;
}

export type JevQuestion = ChoiceQuestion | ScoreQuestion | NoulQuestion;

// ---------------------------------------------------------------------------
// Request
// ---------------------------------------------------------------------------

/** The Pull Request context sent to Jev as `state`. */
export interface PrState {
  pr_title: string;
  pr_description: string;
  changed_files: string[];
  files_changed: number;
  tests_added: boolean;
  lines_added: number;
  lines_removed: number;
  has_database_changes: boolean;
  has_authentication_changes: boolean;
}

export interface PrReviewQuestions {
  type: ChoiceQuestion;
  risk: ScoreQuestion;
  needs_human_review: NoulQuestion;
  needs_tests: NoulQuestion;
}

export interface JevDecisionRequest {
  state: PrState;
  questions: PrReviewQuestions;
}

// ---------------------------------------------------------------------------
// Response
// ---------------------------------------------------------------------------

export interface ChoiceAnswer {
  type: "choice";
  choice: string;
  confidence: number;
  probabilities: ProbabilityDistribution;
}

/** Answer to a `score` question. For PR review this is the risk score (0–3). */
export interface RiskAnswer {
  type: "score";
  /** May be fractional, e.g. 1.84 sits between level 1 and level 2. */
  score: number;
  confidence: number;
  /** Level index (as a string) → label, e.g. { "2": "High" }. */
  legend?: Record<string, string>;
  probabilities: ProbabilityDistribution;
}

export interface NoulAnswer {
  type: "noul";
  /** Probability in [0, 1] that the answer is "yes". */
  noul: number;
}

export interface PrReviewAnswers {
  type: ChoiceAnswer;
  risk: RiskAnswer;
  needs_human_review: NoulAnswer;
  needs_tests: NoulAnswer;
}

export interface JevDecisionResponse {
  code: number;
  message: string;
  data: {
    answers: PrReviewAnswers;
  };
}
