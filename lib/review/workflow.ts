import type { JevDecisionResponse } from "@/lib/jev/types";
import { DEFAULT_WORKFLOW_CONFIG, type WorkflowConfig } from "./config";
import { formatRaw } from "./format";

/**
 * Deterministic mapping from Jev's structured decision to *simulated*
 * GitHub workflow signals. Jev does not return labels — this app derives
 * them with the explicit rules below so the mapping is auditable.
 */

export interface WorkflowSignal {
  id: "type" | "risk" | "review" | "tests";
  /** Candidate GitHub label, or null when no label maps to the value. */
  label: string | null;
  applied: boolean;
  /** Human-readable rule, e.g. `needs_human_review.noul ≥ 0.70`. */
  rule: string;
  /** Jev value(s) the rule was evaluated against. */
  observed: string;
}

export interface SuggestedAction {
  id: "request-review" | "block-auto-merge" | "require-tests" | "auto-merge-eligible";
  label: string;
  triggeredBy: string[];
}

export interface WorkflowPreview {
  signals: WorkflowSignal[];
  labels: string[];
  actions: SuggestedAction[];
}

const threshold = (value: number) => value.toFixed(2);

export function deriveWorkflow(
  decision: JevDecisionResponse,
  config: WorkflowConfig = DEFAULT_WORKFLOW_CONFIG,
): WorkflowPreview {
  const { type, risk, needs_human_review, needs_tests } = decision.data.answers;

  const typeLabel = config.typeLabels[type.choice] ?? null;
  const typeSignal: WorkflowSignal = {
    id: "type",
    label: typeLabel,
    applied: typeLabel !== null && type.confidence >= config.minTypeConfidence,
    rule: `type.choice = ${JSON.stringify(type.choice)} and type.confidence ≥ ${threshold(config.minTypeConfidence)}`,
    observed: `${JSON.stringify(type.choice)}, confidence ${formatRaw(type.confidence)}`,
  };

  const riskRule = config.riskLabels.find((rule) => risk.score >= rule.minScore);
  const riskSignal: WorkflowSignal = {
    id: "risk",
    label: riskRule?.label ?? null,
    applied: riskRule !== undefined,
    rule: riskRule ? `risk.score ≥ ${threshold(riskRule.minScore)}` : "no risk rule matched",
    observed: `score ${formatRaw(risk.score)}`,
  };

  const reviewSignal: WorkflowSignal = {
    id: "review",
    label: "needs-review",
    applied: needs_human_review.noul >= config.needsReviewThreshold,
    rule: `needs_human_review.noul ≥ ${threshold(config.needsReviewThreshold)}`,
    observed: formatRaw(needs_human_review.noul),
  };

  const testsSignal: WorkflowSignal = {
    id: "tests",
    label: "needs-tests",
    applied: needs_tests.noul >= config.needsTestsThreshold,
    rule: `needs_tests.noul ≥ ${threshold(config.needsTestsThreshold)}`,
    observed: formatRaw(needs_tests.noul),
  };

  const signals = [typeSignal, riskSignal, reviewSignal, testsSignal];
  const labels = signals.flatMap((signal) =>
    signal.applied && signal.label ? [signal.label] : [],
  );

  const actions: SuggestedAction[] = [];
  if (reviewSignal.applied) {
    actions.push({
      id: "request-review",
      label: "Request review from code owners",
      triggeredBy: ["needs-review"],
    });
  }
  if (riskSignal.applied && riskSignal.label && config.blockingRiskLabels.includes(riskSignal.label)) {
    actions.push({
      id: "block-auto-merge",
      label: "Block auto-merge until approved",
      triggeredBy: [riskSignal.label],
    });
  }
  if (testsSignal.applied) {
    actions.push({
      id: "require-tests",
      label: "Require additional test coverage before merge",
      triggeredBy: ["needs-tests"],
    });
  }
  if (
    actions.length === 0 &&
    riskSignal.applied &&
    riskSignal.label &&
    config.autoMergeRiskLabels.includes(riskSignal.label)
  ) {
    actions.push({
      id: "auto-merge-eligible",
      label: "Eligible for auto-merge after CI passes",
      triggeredBy: [riskSignal.label],
    });
  }

  return { signals, labels, actions };
}
