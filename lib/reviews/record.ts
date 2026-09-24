import { z } from "zod";
import { parseJevResponse } from "@/lib/jev/schema";
import type { AnalyzeErrorKind } from "@/lib/review/errors";

/**
 * The persisted review for one Pull Request. The GitHub Action writes it
 * (inside its PR comment) and the dashboard reads it. Versioned so the
 * format can evolve.
 */

export const HISTORY_LIMIT = 10;

const sha = z.string().regex(/^[0-9a-f]{7,64}$/i);
const isoDate = z.string().refine((value) => !Number.isNaN(Date.parse(value)), "Invalid date");

export const storedContextSchema = z.object({
  title: z.string(),
  description: z.string(),
  /** True when the stored description was shortened to fit GitHub's comment limit (Jev received it in full). */
  descriptionTruncated: z.boolean().default(false),
  changedFiles: z.array(z.string()),
  /** True when `changedFiles` lists fewer paths than `filesChanged` (GitHub/storage limits). */
  changedFilesTruncated: z.boolean().default(false),
  filesChanged: z.number().int().nonnegative(),
  linesAdded: z.number().int().nonnegative(),
  linesRemoved: z.number().int().nonnegative(),
  testsAdded: z.boolean(),
  hasAuthenticationChanges: z.boolean(),
  hasDatabaseChanges: z.boolean(),
});
export type StoredContext = z.infer<typeof storedContextSchema>;

/** Which files triggered each heuristic signal (capped), for transparency. */
const detectionSchema = z.object({
  tests: z.array(z.string()),
  authentication: z.array(z.string()),
  database: z.array(z.string()),
});

export const analysisSchema = z.object({
  headSha: sha,
  analyzedAt: isoDate,
  durationMs: z.number().nonnegative(),
  context: storedContextSchema,
  detection: detectionSchema,
  /** Jev's response body, unmodified. Validated again before rendering. */
  response: z.unknown(),
  /** Workflow labels this app derived and applied (not returned by Jev). */
  labels: z.array(z.string()),
  runUrl: z.string().nullable(),
});
export type StoredAnalysis = z.infer<typeof analysisSchema>;

export const attemptSchema = z.object({
  headSha: sha,
  status: z.enum(["pending", "completed", "failed"]),
  startedAt: isoDate,
  finishedAt: isoDate.nullable(),
  runUrl: z.string().nullable(),
  error: z.object({ kind: z.string(), message: z.string() }).nullable(),
});
export type ReviewAttempt = z.infer<typeof attemptSchema>;

export const historyEntrySchema = z.object({
  headSha: sha,
  analyzedAt: isoDate,
  typeChoice: z.string(),
  riskScore: z.number(),
  humanReview: z.number(),
  tests: z.number(),
  labels: z.array(z.string()),
});
export type HistoryEntry = z.infer<typeof historyEntrySchema>;

export const reviewRecordSchema = z.object({
  version: z.literal(1),
  repository: z.object({ owner: z.string(), name: z.string() }),
  pullNumber: z.number().int().positive(),
  latest: analysisSchema.nullable(),
  attempt: attemptSchema.nullable(),
  history: z.array(historyEntrySchema),
});
export type ReviewRecord = z.infer<typeof reviewRecordSchema>;

export function emptyRecord(owner: string, name: string, pullNumber: number): ReviewRecord {
  return { version: 1, repository: { owner, name }, pullNumber, latest: null, attempt: null, history: [] };
}

export function startAttempt(
  record: ReviewRecord,
  input: { headSha: string; runUrl: string | null; now: string },
): ReviewRecord {
  return {
    ...record,
    attempt: {
      headSha: input.headSha,
      status: "pending",
      startedAt: input.now,
      finishedAt: null,
      runUrl: input.runUrl,
      error: null,
    },
  };
}

/** Records a successful analysis. Re-analyzing the same commit replaces its history entry. */
export function completeAnalysis(record: ReviewRecord, analysis: StoredAnalysis): ReviewRecord {
  const parsed = parseJevResponse(analysis.response);
  const history = record.history.filter((entry) => entry.headSha !== analysis.headSha);
  if (parsed.ok) {
    const { answers } = parsed.decision.data;
    history.unshift({
      headSha: analysis.headSha,
      analyzedAt: analysis.analyzedAt,
      typeChoice: answers.type.choice,
      riskScore: answers.risk.score,
      humanReview: answers.needs_human_review.noul,
      tests: answers.needs_tests.noul,
      labels: analysis.labels,
    });
  }
  history.sort((a, b) => Date.parse(b.analyzedAt) - Date.parse(a.analyzedAt));
  return {
    ...record,
    latest: analysis,
    attempt: {
      headSha: analysis.headSha,
      status: "completed",
      startedAt: record.attempt?.headSha === analysis.headSha ? record.attempt.startedAt : analysis.analyzedAt,
      finishedAt: analysis.analyzedAt,
      runUrl: analysis.runUrl,
      error: null,
    },
    history: history.slice(0, HISTORY_LIMIT),
  };
}

/** Records a failed attempt. The last successful analysis is kept (and shown as outdated). */
export function failAttempt(
  record: ReviewRecord,
  input: { headSha: string; runUrl: string | null; now: string; kind: AnalyzeErrorKind | "github_error"; message: string },
): ReviewRecord {
  return {
    ...record,
    attempt: {
      headSha: input.headSha,
      status: "failed",
      startedAt: record.attempt?.headSha === input.headSha ? record.attempt.startedAt : input.now,
      finishedAt: input.now,
      runUrl: input.runUrl,
      error: { kind: input.kind, message: input.message },
    },
  };
}
