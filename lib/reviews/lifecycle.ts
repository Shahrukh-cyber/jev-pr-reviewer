import type { PullState } from "@/lib/github/types";
import type { ReviewRecord } from "./record";

export type ReviewStatus =
  /** No analysis has started for this PR yet. */
  | "waiting"
  /** The workflow is analyzing the PR's current head commit. */
  | "analyzing"
  /** The latest analysis matches the PR's current head commit. */
  | "ready"
  /** New commits were pushed after the latest analysis; the workflow hasn't picked them up yet. */
  | "outdated"
  /** The analysis of the current head commit failed. */
  | "failed";

/** A pending attempt older than this is treated as stalled (workflow timeout is 10 minutes). */
export const STALLED_AFTER_MS = 15 * 60_000;

export interface Lifecycle {
  status: ReviewStatus;
  /** Whether the displayed analysis is for the PR's current head commit. */
  isCurrent: boolean;
  error: { kind: string; message: string } | null;
}

export function deriveLifecycle(
  pull: { headSha: string; state: PullState },
  record: ReviewRecord | null,
  now: number = Date.now(),
): Lifecycle {
  const latest = record?.latest ?? null;
  const attempt = record?.attempt ?? null;
  const isCurrent = latest?.headSha === pull.headSha;

  if (attempt?.headSha === pull.headSha) {
    if (attempt.status === "pending") {
      if (now - Date.parse(attempt.startedAt) > STALLED_AFTER_MS) {
        return {
          status: "failed",
          isCurrent,
          error: { kind: "stalled", message: "The analysis started but never finished. Re-run the workflow." },
        };
      }
      return { status: "analyzing", isCurrent, error: null };
    }
    if (attempt.status === "failed") return { status: "failed", isCurrent, error: attempt.error };
  }

  if (isCurrent) return { status: "ready", isCurrent, error: null };
  if (latest) return { status: "outdated", isCurrent: false, error: null };
  return { status: "waiting", isCurrent: false, error: null };
}

/** Whether the dashboard should keep polling for this PR. */
export function shouldPoll(status: ReviewStatus, state: PullState): boolean {
  return (state === "open" || state === "draft") && (status === "waiting" || status === "analyzing" || status === "outdated");
}
