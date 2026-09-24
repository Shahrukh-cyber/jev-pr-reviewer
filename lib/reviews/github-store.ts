import { GITHUB_MAX_PR_FILES, GitHubApiError, type GitHubClient } from "@/lib/github/client";
import {
  githubCommentSchema,
  githubPullFileSchema,
  githubPullSchema,
  type GitHubComment,
  type GitHubPull,
  type GitHubPullFile,
} from "@/lib/github/types";
import { LABEL_STYLES } from "@/lib/review/labels";
import { decodeRecord, isReviewComment } from "./comment";
import type { ReviewRecord } from "./record";

/**
 * GitHub is the persistence layer: each PR's review lives in one comment
 * authored by the workflow's bot account.
 */

/** Comments by any other account are ignored, so nobody can inject a fake review. */
export const DEFAULT_REVIEW_AUTHOR = "github-actions[bot]";

const repoPath = (owner: string, repo: string) =>
  `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;

export async function getPull(client: GitHubClient, owner: string, repo: string, number: number): Promise<GitHubPull> {
  return githubPullSchema.parse(await client.request("GET", `${repoPath(owner, repo)}/pulls/${number}`));
}

export async function listPulls(client: GitHubClient, owner: string, repo: string, limit: number): Promise<GitHubPull[]> {
  const body = await client.request(
    "GET",
    `${repoPath(owner, repo)}/pulls?state=all&sort=updated&direction=desc&per_page=${Math.min(limit, 100)}`,
  );
  return githubPullSchema.array().parse(body);
}

export interface PullFiles {
  files: GitHubPullFile[];
  /** GitHub's API returns at most 3000 files; true when the PR has more. */
  truncated: boolean;
}

/** All changed files, following pagination (100 per page). */
export async function getPullFiles(
  client: GitHubClient,
  owner: string,
  repo: string,
  number: number,
  expectedCount?: number,
): Promise<PullFiles> {
  const items = await client.paginate(`${repoPath(owner, repo)}/pulls/${number}/files`, GITHUB_MAX_PR_FILES);
  const files = githubPullFileSchema.array().parse(items);
  return { files, truncated: expectedCount !== undefined && files.length < expectedCount };
}

export interface StoredReview {
  comment: GitHubComment;
  record: ReviewRecord | null;
}

export async function findReviewComment(
  client: GitHubClient,
  owner: string,
  repo: string,
  number: number,
  author: string = DEFAULT_REVIEW_AUTHOR,
): Promise<StoredReview | null> {
  const comments = githubCommentSchema
    .array()
    .parse(await client.paginate(`${repoPath(owner, repo)}/issues/${number}/comments`));
  const matches = comments.filter((comment) => comment.user?.login === author && isReviewComment(comment.body));
  if (matches.length === 0) return null;
  // Normally exactly one; if a race ever produced two, the most recently updated wins.
  const comment = matches.reduce((a, b) => (Date.parse(b.updated_at) > Date.parse(a.updated_at) ? b : a));
  return { comment, record: decodeRecord(comment.body ?? "") };
}

/** Updates the existing review comment, or creates it on first run. Never creates duplicates. */
export async function upsertReviewComment(
  client: GitHubClient,
  owner: string,
  repo: string,
  number: number,
  existingId: number | null,
  body: string,
): Promise<GitHubComment> {
  const result = existingId
    ? await client.request("PATCH", `${repoPath(owner, repo)}/issues/comments/${existingId}`, { body })
    : await client.request("POST", `${repoPath(owner, repo)}/issues/${number}/comments`, { body });
  return githubCommentSchema.parse(result);
}

/**
 * Applies `desired` labels and removes labels this workflow applied before
 * that no longer apply. Labels added by people are never removed.
 */
export async function syncLabels(
  client: GitHubClient,
  owner: string,
  repo: string,
  number: number,
  desired: string[],
  previouslyApplied: string[],
): Promise<{ added: string[]; removed: string[] }> {
  const base = repoPath(owner, repo);
  const current = new Set(
    ((await client.request("GET", `${base}/issues/${number}/labels`)) as { name: string }[]).map((label) => label.name),
  );

  const removed: string[] = [];
  for (const label of previouslyApplied) {
    if (!desired.includes(label) && current.has(label)) {
      try {
        await client.request("DELETE", `${base}/issues/${number}/labels/${encodeURIComponent(label)}`);
        removed.push(label);
      } catch (error) {
        if (!(error instanceof GitHubApiError && error.kind === "not_found")) throw error;
      }
    }
  }

  const added = desired.filter((label) => !current.has(label));
  for (const label of added) {
    const style = LABEL_STYLES[label];
    try {
      await client.request("POST", `${base}/labels`, {
        name: label,
        color: style?.color ?? "ededed",
        description: style?.description ?? "Applied by Jev PR Reviewer",
      });
    } catch (error) {
      // 422 = label already exists in the repository; that's fine.
      if (!(error instanceof GitHubApiError && error.kind === "validation")) throw error;
    }
  }
  if (added.length > 0) await client.request("POST", `${base}/issues/${number}/labels`, { labels: added });

  return { added, removed };
}
