import { describe, expect, it, vi } from "vitest";
import { GitHubClient } from "@/lib/github/client";
import { FakeGitHub } from "@/lib/github/fake-github";
import { decodeRecord, REVIEW_MARKER } from "./comment";
import { SHA_A, SHA_B, jevResponse } from "./fixtures";
import { runReview } from "./run-review";

const JEV = { url: "https://jev.test/decisions", apiKey: "jev-secret", timeoutMs: 1000 };

function setup() {
  const gh = new FakeGitHub();
  gh.addPull({
    number: 42,
    title: "Fix JWT refresh bug",
    body: "Fixes expired token refresh.",
    headSha: SHA_A,
    files: [
      { filename: "src/auth/middleware.ts", status: "modified", additions: 50, deletions: 20 },
      { filename: "src/auth/token.ts", status: "modified", additions: 20, deletions: 4 },
      { filename: "tests/auth/token.test.ts", status: "added", additions: 12, deletions: 0 },
    ],
  });
  const github = new GitHubClient({ token: "gh-token", baseUrl: gh.base, fetchImpl: gh.fetch });
  const jevRequests: unknown[] = [];
  let jevReply: () => Response = () => Response.json(jevResponse());
  const jevFetch = vi.fn(async (_url: string, init: RequestInit) => {
    jevRequests.push(JSON.parse(String(init.body)));
    return jevReply();
  });
  const logs: string[] = [];
  const run = (overrides: Partial<Parameters<typeof runReview>[0]> = {}) =>
    runReview({
      github,
      owner: "acme",
      repo: "app",
      pullNumber: 42,
      jev: JEV,
      jevFetch,
      runUrl: "https://github.com/acme/app/actions/runs/9",
      reviewerUrl: null,
      sleep: async () => {},
      log: (message) => logs.push(message),
      ...overrides,
    });
  return { gh, run, jevRequests, logs, setJevReply: (reply: () => Response) => (jevReply = reply) };
}

const botComments = (gh: FakeGitHub) => (gh.comments.get(42) ?? []).filter((c) => c.body.includes(REVIEW_MARKER));

describe("runReview", () => {
  it("sends the real PR context to Jev and publishes one comment, labels and history", async () => {
    const { gh, run, jevRequests } = setup();
    const result = await run();

    expect(result.ok).toBe(true);
    expect(jevRequests).toHaveLength(1);
    expect(jevRequests[0]).toMatchObject({
      state: {
        pr_title: "Fix JWT refresh bug",
        pr_description: "Fixes expired token refresh.",
        changed_files: ["src/auth/middleware.ts", "src/auth/token.ts", "tests/auth/token.test.ts"],
        files_changed: 3,
        lines_added: 82,
        lines_removed: 24,
        tests_added: true,
        has_authentication_changes: true,
        has_database_changes: false,
      },
      questions: { risk: { type: "score" } },
    });

    const comments = botComments(gh);
    expect(comments).toHaveLength(1);
    const record = decodeRecord(comments[0].body);
    expect(record?.latest).toMatchObject({ headSha: SHA_A, labels: ["bug", "high-risk", "needs-review"] });
    expect(record?.latest?.response).toEqual(jevResponse());
    expect(record?.attempt?.status).toBe("completed");
    expect([...(gh.issueLabels.get(42) ?? [])].sort()).toEqual(["bug", "high-risk", "needs-review"]);
    expect(gh.repoLabels.has("high-risk")).toBe(true);
    expect(result.summary).toContain("## Jev PR Review");
  });

  it("updates the same comment on re-runs and new commits (no duplicates)", async () => {
    const { gh, run } = setup();
    await run();
    await run(); // same commit re-run
    let record = decodeRecord(botComments(gh)[0].body);
    expect(botComments(gh)).toHaveLength(1);
    expect(record?.history).toHaveLength(1);

    gh.pulls.get(42)!.headSha = SHA_B;
    await run();
    expect(botComments(gh)).toHaveLength(1);
    record = decodeRecord(botComments(gh)[0].body);
    expect(record?.history.map((entry) => entry.headSha)).toEqual([SHA_B, SHA_A]);
    expect(gh.requests.filter((r) => r.method === "POST" && r.path.endsWith("/issues/42/comments"))).toHaveLength(1);
  });

  it("removes only labels it applied earlier, never human ones", async () => {
    const { gh, run, setJevReply } = setup();
    await run();
    gh.issueLabels.get(42)!.add("priority"); // added by a person

    setJevReply(() => Response.json(jevResponse({ score: 0.2, review: 0.1, choice: "refactor" })));
    gh.pulls.get(42)!.headSha = SHA_B;
    await run();
    expect([...(gh.issueLabels.get(42) ?? [])].sort()).toEqual(["low-risk", "priority", "refactor"]);
  });

  it("paginates changed files beyond one page", async () => {
    const { gh, run, jevRequests } = setup();
    gh.pulls.get(42)!.files = Array.from({ length: 250 }, (_, i) => ({
      filename: `src/module-${i}.ts`,
      status: "modified",
      additions: 1,
      deletions: 1,
    }));
    await run();
    const state = (jevRequests[0] as { state: { changed_files: string[]; files_changed: number } }).state;
    expect(state.changed_files).toHaveLength(250);
    expect(state.files_changed).toBe(250);
    expect(gh.requests.filter((r) => r.path.endsWith("/pulls/42/files"))).toHaveLength(3);
  });

  it("ignores lookalike comments from other users", async () => {
    const { gh, run } = setup();
    gh.addComment(42, "mallory", `${REVIEW_MARKER}\nfake review`);
    await run();
    expect(botComments(gh).filter((c) => c.user.login === "github-actions[bot]")).toHaveLength(1);
    expect(gh.comments.get(42)!.find((c) => c.user.login === "mallory")?.body).toContain("fake review");
  });

  it("reports Jev failures visibly and keeps the previous review", async () => {
    const { gh, run, setJevReply, logs } = setup();
    await run();
    gh.pulls.get(42)!.headSha = SHA_B;
    setJevReply(() => new Response(JSON.stringify({ code: -1, message: "busy", data: null }), { status: 503 }));

    const result = await run();
    expect(result.ok).toBe(false);
    const record = decodeRecord(botComments(gh)[0].body);
    expect(record?.attempt).toMatchObject({ status: "failed", headSha: SHA_B, error: { kind: "upstream_error" } });
    expect(record?.latest?.headSha).toBe(SHA_A);
    expect(botComments(gh)[0].body).toContain("Review unavailable");
    expect(logs.some((line) => line.includes("retrying"))).toBe(true);
  });

  it("never logs secrets", async () => {
    const { run, logs } = setup();
    await run();
    const output = logs.join("\n");
    expect(output).not.toContain("jev-secret");
    expect(output).not.toContain("gh-token");
    expect(output).toContain("Changed files: 3 (+82 / -24)");
    expect(output).toContain("Risk score: 1.84");
  });

  it("dry run reads and analyzes without writing", async () => {
    const { gh, run } = setup();
    const result = await run({ dryRun: true });
    expect(result.ok).toBe(true);
    expect(botComments(gh)).toHaveLength(0);
    expect(gh.requests.some((r) => r.method !== "GET")).toBe(false);
  });
});

describe("runReview failure copy", () => {
  it("tells the workflow owner to fix the repository secret on 401", async () => {
    const gh = new FakeGitHub();
    gh.addPull({ number: 5, title: "t", body: null, headSha: SHA_A, files: [] });
    const github = new GitHubClient({ token: "t", baseUrl: gh.base, fetchImpl: gh.fetch });
    const result = await runReview({
      github,
      owner: "acme",
      repo: "app",
      pullNumber: 5,
      jev: { ...JEV, apiKey: undefined },
      jevFetch: async () => new Response(JSON.stringify({ code: -1, message: "Sign in", data: null }), { status: 401 }),
      runUrl: null,
      reviewerUrl: null,
      log: () => {},
    });
    expect(result.ok).toBe(false);
    expect(result.record.attempt?.error?.message).toContain("JEV_API_KEY repository secret");
    expect(result.record.attempt?.error?.message).not.toContain("server environment");
  });
});
