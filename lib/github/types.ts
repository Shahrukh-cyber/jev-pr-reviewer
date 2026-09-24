import { z } from "zod";

/** Only the GitHub REST fields this app reads. Unknown fields are ignored. */

const userSchema = z.object({ login: z.string(), type: z.string().optional() });

export const githubPullSchema = z.object({
  number: z.number().int(),
  title: z.string(),
  body: z.string().nullable(),
  html_url: z.string(),
  state: z.enum(["open", "closed"]),
  draft: z.boolean().optional(),
  merged_at: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
  user: userSchema.nullable(),
  head: z.object({ ref: z.string(), sha: z.string() }),
  base: z.object({ ref: z.string() }),
  // Present on the single-PR endpoint, absent on the list endpoint.
  additions: z.number().int().optional(),
  deletions: z.number().int().optional(),
  changed_files: z.number().int().optional(),
});
export type GitHubPull = z.infer<typeof githubPullSchema>;

export const githubPullFileSchema = z.object({
  filename: z.string(),
  status: z.string(),
  additions: z.number().int(),
  deletions: z.number().int(),
});
export type GitHubPullFile = z.infer<typeof githubPullFileSchema>;

export const githubCommentSchema = z.object({
  id: z.number().int(),
  body: z.string().nullable().optional(),
  user: userSchema.nullable(),
  html_url: z.string(),
  updated_at: z.string(),
});
export type GitHubComment = z.infer<typeof githubCommentSchema>;

export type PullState = "open" | "draft" | "merged" | "closed";

/** App-level view of a GitHub Pull Request. */
export interface PullRequestInfo {
  repository: { owner: string; name: string };
  number: number;
  title: string;
  description: string;
  url: string;
  author: string | null;
  state: PullState;
  baseBranch: string;
  headBranch: string;
  headSha: string;
  createdAt: string;
  updatedAt: string;
}

export function toPullRequestInfo(owner: string, name: string, pull: GitHubPull): PullRequestInfo {
  const state: PullState = pull.merged_at
    ? "merged"
    : pull.state === "closed"
      ? "closed"
      : pull.draft
        ? "draft"
        : "open";
  return {
    repository: { owner, name },
    number: pull.number,
    title: pull.title,
    description: pull.body ?? "",
    url: pull.html_url,
    author: pull.user?.login ?? null,
    state,
    baseBranch: pull.base.ref,
    headBranch: pull.head.ref,
    headSha: pull.head.sha,
    createdAt: pull.created_at,
    updatedAt: pull.updated_at,
  };
}

/** GitHub owner/repo names: alphanumerics, hyphens, underscores and dots. */
export const REPO_SEGMENT = /^[A-Za-z0-9_.-]{1,100}$/;
