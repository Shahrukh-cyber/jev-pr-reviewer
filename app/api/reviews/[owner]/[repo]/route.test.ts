import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FakeGitHub } from "@/lib/github/fake-github";
import type { LiveErrorResponse, PullListResponse, PullReviewResponse } from "@/lib/reviews/api";
import { renderComment } from "@/lib/reviews/comment";
import { SHA_A, SHA_B, analysis } from "@/lib/reviews/fixtures";
import { completeAnalysis, emptyRecord } from "@/lib/reviews/record";
import { GET as getPull } from "./[number]/route";
import { GET as listPulls } from "./route";

const params = <T,>(value: T) => ({ params: Promise.resolve(value) });
const request = new Request("http://localhost/api/reviews");

let gh: FakeGitHub;
beforeEach(() => {
  gh = new FakeGitHub("acme", "app");
  gh.addPull({ number: 7, title: "Fix JWT refresh", body: null, headSha: SHA_A, files: [] });
  gh.addPull({ number: 8, title: "Docs", body: "", headSha: SHA_B, files: [] });
  gh.addComment(7, "github-actions[bot]", renderComment(completeAnalysis(emptyRecord("acme", "app", 7), analysis(SHA_A, "2026-09-24T10:00:00Z"))));
  vi.stubGlobal("fetch", (input: string, init?: RequestInit) => gh.fetch(input.replace("https://api.github.com", gh.base), init));
  vi.stubEnv("GITHUB_OWNER", "acme");
  vi.stubEnv("GITHUB_REPOSITORY", "app");
  vi.stubEnv("GITHUB_TOKEN", "");
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("GET /api/reviews/:owner/:repo", () => {
  it("lists PRs with review status and decision summary", async () => {
    const response = await listPulls(request, params({ owner: "acme", repo: "app" }));
    const body = (await response.json()) as PullListResponse;
    expect(body.ok).toBe(true);
    const byNumber = Object.fromEntries(body.pulls.map((item) => [item.pull.number, item]));
    expect(byNumber[7]).toMatchObject({ status: "ready", summary: { typeLabel: "Bug fix", riskLabel: "High", riskScore: 1.84 } });
    expect(byNumber[8]).toMatchObject({ status: "waiting", summary: null });
  });

  it("refuses repositories other than the configured one", async () => {
    const response = await listPulls(request, params({ owner: "someone", repo: "else" }));
    expect(response.status).toBe(403);
  });

  it("explains when no repository is configured", async () => {
    vi.stubEnv("GITHUB_REPOSITORY", "");
    const response = await listPulls(request, params({ owner: "acme", repo: "app" }));
    expect(response.status).toBe(503);
    expect(((await response.json()) as LiveErrorResponse).error.kind).toBe("not_configured");
  });
});

describe("GET /api/reviews/:owner/:repo/:number", () => {
  it("returns the PR, stored record and lifecycle", async () => {
    const response = await getPull(request, params({ owner: "acme", repo: "app", number: "7" }));
    const body = (await response.json()) as PullReviewResponse;
    expect(body.pull).toMatchObject({ number: 7, title: "Fix JWT refresh", author: "octocat", headBranch: "feature/jwt", baseBranch: "main" });
    expect(body.lifecycle.status).toBe("ready");
    expect(body.record?.latest?.headSha).toBe(SHA_A);
    expect(body.comment?.url).toContain("issuecomment");
  });

  it("validates the PR number and maps GitHub 404s", async () => {
    expect((await getPull(request, params({ owner: "acme", repo: "app", number: "abc" }))).status).toBe(400);
    expect((await getPull(request, params({ owner: "acme", repo: "app", number: "999" }))).status).toBe(404);
  });
});
