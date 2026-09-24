import { DEFAULT_WORKFLOW_CONFIG, type WorkflowConfig } from "./config";

/** GitHub label appearance for labels this app manages. Hex without "#". */
export const LABEL_STYLES: Record<string, { color: string; description: string }> = {
  bug: { color: "d73a4a", description: "Jev classified this PR as a bug fix" },
  feature: { color: "0969da", description: "Jev classified this PR as a feature" },
  refactor: { color: "8250df", description: "Jev classified this PR as a refactor" },
  documentation: { color: "0075ca", description: "Jev classified this PR as documentation" },
  "low-risk": { color: "1a7f37", description: "Jev risk score below the moderate threshold" },
  "moderate-risk": { color: "bf8700", description: "Jev risk score in the moderate band" },
  "high-risk": { color: "e16f24", description: "Jev risk score in the high band" },
  "critical-risk": { color: "cf222e", description: "Jev risk score in the critical band" },
  "needs-review": { color: "8250df", description: "Jev: careful human review likely needed" },
  "needs-tests": { color: "bf8700", description: "Jev: additional automated tests likely needed" },
};

/**
 * Every label the workflow may apply. Labels in this set that no longer
 * apply are removed on re-analysis; labels outside it are never touched.
 */
export function managedLabels(config: WorkflowConfig = DEFAULT_WORKFLOW_CONFIG): string[] {
  const labels = new Set<string>();
  for (const label of Object.values(config.typeLabels)) if (label) labels.add(label);
  for (const rule of config.riskLabels) labels.add(rule.label);
  labels.add("needs-review");
  labels.add("needs-tests");
  return [...labels];
}
