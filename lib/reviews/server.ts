import { GitHubApiError, GitHubClient } from "@/lib/github/client";
import { REPO_SEGMENT, toPullRequestInfo } from "@/lib/github/types";
import { parseJevResponse } from "@/lib/jev/schema";
import { toReviewModel } from "@/lib/review/model";
import type { LiveErrorKind, LiveErrorResponse, PullListItem, PullListResponse, PullReviewResponse, ReviewedRepository } from "./api";
import { DEFAULT_REVIEW_AUTHOR, findReviewComment, getPull, listPulls } from "./github-store";
import { deriveLifecycle } from "./lifecycle";

/** Server-only: reads GITHUB_TOKEN. Never import from client components. */

const LIST_LIMIT = 12;

/**
 * GITHUB_OWNER + GITHUB_REPOSITORY (name), or GITHUB_REPOSITORY as "owner/name".
 * Only the configured repository can be queried, so the server's token can't
 * be used as an open proxy to arbitrary repositories.
 */
export function readRepositoryConfig(env: NodeJS.ProcessEnv = process.env): ReviewedRepository | null {
  const repository = env.GITHUB_REPOSITORY?.trim() ?? "";
  const [first, second] = repository.split("/");
  const owner = second ? first : env.GITHUB_OWNER?.trim();
  const name = second ?? first;
  if (!owner || !name || !REPO_SEGMENT.test(owner) || !REPO_SEGMENT.test(name)) return null;
  return { owner, name };
}

export function isConfiguredRepository(owner: string, name: string, env: NodeJS.ProcessEnv = process.env): boolean {
  const config = readRepositoryConfig(env);
  return config !== null && config.owner.toLowerCase() === owner.toLowerCase() && config.name.toLowerCase() === name.toLowerCase();
}

// Shared across requests so polling mostly hits 304s, which GitHub doesn't count against the rate limit.
const etagCache = new Map<string, { etag: string; body: unknown; link: string | null }>();

function client(env: NodeJS.ProcessEnv = process.env): GitHubClient {
  if (etagCache.size > 500) etagCache.clear();
  return new GitHubClient({
    token: env.GITHUB_TOKEN?.trim() || undefined,
    // GitHub Enterprise Server: e.g. https://github.example.com/api/v3
    baseUrl: env.GITHUB_API_URL?.trim() || undefined,
    etagCache,
  });
}

const author = (env: NodeJS.ProcessEnv = process.env) => env.JEV_REVIEW_COMMENT_AUTHOR?.trim() || DEFAULT_REVIEW_AUTHOR;

export async function loadPullReview(owner: string, name: string, number: number): Promise<PullReviewResponse> {
  const github = client();
  const [pull, stored] = await Promise.all([
    getPull(github, owner, name, number),
    findReviewComment(github, owner, name, number, author()),
  ]);
  const info = toPullRequestInfo(owner, name, pull);
  const record = stored?.record ?? null;
  return {
    ok: true,
    pull: info,
    record,
    lifecycle: deriveLifecycle(info, record),
    comment: stored ? { url: stored.comment.html_url, updatedAt: stored.comment.updated_at } : null,
    fetchedAt: new Date().toISOString(),
    authenticated: Boolean(process.env.GITHUB_TOKEN?.trim()),
  };
}

export async function loadPullList(owner: string, name: string): Promise<PullListResponse> {
  const github = client();
  const pulls = await listPulls(github, owner, name, LIST_LIMIT);
  const items = await Promise.all(
    pulls.map(async (pull): Promise<PullListItem> => {
      const info = toPullRequestInfo(owner, name, pull);
      const stored = await findReviewComment(github, owner, name, pull.number, author());
      const record = stored?.record ?? null;
      const parsed = record?.latest ? parseJevResponse(record.latest.response) : null;
      let summary: PullListItem["summary"] = null;
      if (record?.latest && parsed?.ok) {
        const model = toReviewModel(parsed.decision);
        summary = {
          typeLabel: model.type.label,
          riskScore: model.risk.score,
          riskLabel: model.risk.nearest.label,
          analyzedAt: record.latest.analyzedAt,
          headSha: record.latest.headSha,
        };
      }
      return { pull: info, status: deriveLifecycle(info, record).status, summary };
    }),
  );
  return {
    ok: true,
    repository: { owner, name },
    pulls: items,
    fetchedAt: new Date().toISOString(),
    authenticated: Boolean(process.env.GITHUB_TOKEN?.trim()),
  };
}

const ERROR_COPY: Record<LiveErrorKind, { status: number; title: string; message: string }> = {
  not_configured: {
    status: 503,
    title: "No repository connected",
    message: "Set GITHUB_OWNER and GITHUB_REPOSITORY in the server environment to show real Pull Requests.",
  },
  forbidden_repository: {
    status: 403,
    title: "Repository not available",
    message: "This dashboard only serves the repository configured on the server.",
  },
  invalid_request: { status: 400, title: "Invalid request", message: "The Pull Request number is not valid." },
  not_found: {
    status: 404,
    title: "Pull Request not found",
    message: "It may not exist, or the repository is private and the server has no GITHUB_TOKEN with read access.",
  },
  rate_limited: {
    status: 429,
    title: "GitHub rate limit reached",
    message: "Wait a few minutes, or set GITHUB_TOKEN on the server for a higher limit.",
  },
  unauthorized: {
    status: 502,
    title: "GitHub rejected the server's token",
    message: "Check that GITHUB_TOKEN is valid and can read this repository.",
  },
  unavailable: { status: 502, title: "GitHub is unavailable", message: "GitHub could not be reached right now. Try again." },
};

export function liveError(kind: LiveErrorKind): Response {
  const { status, title, message } = ERROR_COPY[kind];
  const body: LiveErrorResponse = { ok: false, error: { kind, title, message } };
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export function liveErrorFrom(error: unknown): Response {
  if (error instanceof GitHubApiError) {
    console.error(`[github] ${error.kind} ${error.status}: ${error.message}`);
    if (error.kind === "not_found") return liveError("not_found");
    if (error.kind === "rate_limited") return liveError("rate_limited");
    if (error.kind === "unauthorized" || error.kind === "forbidden") return liveError("unauthorized");
    return liveError("unavailable");
  }
  console.error("[github] unexpected error", error instanceof Error ? error.message : error);
  return liveError("unavailable");
}
