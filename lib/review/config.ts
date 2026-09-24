/**
 * Thresholds used to *interpret* Jev's probabilities in the UI and to derive
 * simulated workflow signals. These are this app's choices, not Jev output.
 */

export interface AssessmentThresholds {
  /** probability ≥ likely → "likely" */
  likely: number;
  /** probability ≤ unlikely → "unlikely"; anything between is "uncertain" */
  unlikely: number;
}

export const ASSESSMENT_THRESHOLDS: AssessmentThresholds = {
  likely: 0.7,
  unlikely: 0.3,
};

export interface RiskLabelRule {
  /** Applied when risk.score ≥ minScore (rules are checked top-down). */
  minScore: number;
  label: string;
}

export interface WorkflowConfig {
  /** GitHub label per PR type. `null` means no label for that type. */
  typeLabels: Record<string, string | null>;
  /** Minimum type confidence before a type label is applied. */
  minTypeConfidence: number;
  /** Ordered from highest to lowest score. */
  riskLabels: RiskLabelRule[];
  needsReviewThreshold: number;
  needsTestsThreshold: number;
  /** Risk labels that should block auto-merge. */
  blockingRiskLabels: string[];
  /** Risk labels that allow auto-merge when no other signal is raised. */
  autoMergeRiskLabels: string[];
}

export const DEFAULT_WORKFLOW_CONFIG: WorkflowConfig = {
  typeLabels: {
    bug: "bug",
    feature: "feature",
    refactor: "refactor",
    documentation: "documentation",
    other: null,
  },
  minTypeConfidence: 0.6,
  riskLabels: [
    { minScore: 2.5, label: "critical-risk" },
    { minScore: 1.5, label: "high-risk" },
    { minScore: 0.5, label: "moderate-risk" },
    { minScore: 0, label: "low-risk" },
  ],
  needsReviewThreshold: 0.7,
  needsTestsThreshold: 0.7,
  blockingRiskLabels: ["high-risk", "critical-risk"],
  autoMergeRiskLabels: ["low-risk"],
};
