import { z } from "zod";
import type { JevDecisionResponse } from "./types";

const probability = z.number().finite().min(0).max(1);

const distributionSchema = z.record(z.string(), probability);

const choiceAnswerSchema = z.object({
  type: z.literal("choice"),
  choice: z.string().min(1),
  confidence: probability,
  probabilities: distributionSchema,
});

const riskAnswerSchema = z.object({
  type: z.literal("score"),
  score: z.number().finite(),
  confidence: probability,
  legend: z.record(z.string(), z.string()).optional(),
  probabilities: distributionSchema,
});

const noulAnswerSchema = z.object({
  type: z.literal("noul"),
  noul: probability,
});

export const jevDecisionResponseSchema = z.object({
  code: z.number(),
  message: z.string(),
  data: z.object({
    answers: z.object({
      type: choiceAnswerSchema,
      risk: riskAnswerSchema,
      needs_human_review: noulAnswerSchema,
      needs_tests: noulAnswerSchema,
    }),
  }),
});

// Compile-time guarantee that the schema and the hand-written types agree.
type SchemaOutput = z.infer<typeof jevDecisionResponseSchema>;
const schemaMatchesTypes: (value: SchemaOutput) => JevDecisionResponse = (
  value,
) => value;
void schemaMatchesTypes;

export type ParseResult =
  | { ok: true; decision: JevDecisionResponse }
  | { ok: false; reason: "not_ok" | "invalid_shape"; issues: string[] };

/**
 * Validates an untrusted Jev payload. Never mutates the input, so the raw
 * value can still be shown verbatim to developers.
 */
export function parseJevResponse(raw: unknown): ParseResult {
  const result = jevDecisionResponseSchema.safeParse(raw);
  if (!result.success) {
    return {
      ok: false,
      reason: "invalid_shape",
      issues: result.error.issues.map(
        (issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`,
      ),
    };
  }
  if (result.data.code !== 0) {
    return {
      ok: false,
      reason: "not_ok",
      issues: [`code ${result.data.code}: ${result.data.message}`],
    };
  }
  return { ok: true, decision: result.data };
}
