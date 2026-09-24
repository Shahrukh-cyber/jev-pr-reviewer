import type { JevDecisionRequest } from "@/lib/jev/types";
import type { AnalyzeErrorKind } from "./errors";
import type { FieldErrors } from "./validation";

/** Response contract of this app's POST /api/analyze route. */

export type DecisionSource = "jev" | "sample";

export interface AnalyzeSuccess {
  ok: true;
  source: DecisionSource;
  /** Jev's response body, unmodified. */
  raw: unknown;
  /** The exact body that was sent to Jev (or would have been, for samples). */
  request: JevDecisionRequest;
  durationMs: number;
  receivedAt: string;
  /** Set when Jev failed and the demo PR fell back to the documented example response. */
  fallbackFrom?: AnalyzeErrorKind;
}

export interface AnalyzeFailure {
  ok: false;
  error: {
    kind: AnalyzeErrorKind;
    title: string;
    message: string;
    retryable: boolean;
    fieldErrors?: FieldErrors;
  };
}

export type AnalyzeResponse = AnalyzeSuccess | AnalyzeFailure;
