import type { PullRequestInfo } from "@/lib/github/types";
import type { Lifecycle, ReviewStatus } from "./lifecycle";
import type { ReviewRecord } from "./record";

/** Response contracts of GET /api/reviews/... (safe to import from client components). */

export interface ReviewedRepository {
  owner: string;
  name: string;
}

export interface PullListItem {
  pull: PullRequestInfo;
  status: ReviewStatus;
  /** Compact decision summary from the latest analysis, if any. */
  summary: {
    typeLabel: string;
    riskScore: number;
    riskLabel: string;
    analyzedAt: string;
    headSha: string;
  } | null;
}

export interface PullListResponse {
  ok: true;
  repository: ReviewedRepository;
  pulls: PullListItem[];
  fetchedAt: string;
  /** Whether the server calls GitHub with a token (affects safe polling rates). */
  authenticated: boolean;
}

export interface PullReviewResponse {
  ok: true;
  pull: PullRequestInfo;
  /** The stored review, exactly as the workflow published it; null if none yet. */
  record: ReviewRecord | null;
  lifecycle: Lifecycle;
  comment: { url: string; updatedAt: string } | null;
  fetchedAt: string;
  authenticated: boolean;
}

export type LiveErrorKind =
  | "not_configured"
  | "forbidden_repository"
  | "invalid_request"
  | "not_found"
  | "rate_limited"
  | "unauthorized"
  | "unavailable";

export interface LiveErrorResponse {
  ok: false;
  error: { kind: LiveErrorKind; title: string; message: string };
}
