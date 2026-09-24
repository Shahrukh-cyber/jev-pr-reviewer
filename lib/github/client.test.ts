import { describe, expect, it } from "vitest";
import { GitHubApiError, GitHubClient } from "./client";
import { FakeGitHub } from "./fake-github";

describe("GitHubClient", () => {
  it("follows pagination links", async () => {
    const gh = new FakeGitHub();
    gh.addPull({
      number: 1,
      title: "t",
      body: null,
      headSha: "a".repeat(40),
      files: Array.from({ length: 205 }, (_, i) => ({ filename: `f${i}`, status: "added", additions: 1, deletions: 0 })),
    });
    const client = new GitHubClient({ baseUrl: gh.base, fetchImpl: gh.fetch });
    const files = await client.paginate("/repos/acme/app/pulls/1/files");
    expect(files).toHaveLength(205);
  });

  it("uses ETags for conditional requests", async () => {
    const gh = new FakeGitHub();
    gh.addPull({ number: 1, title: "t", body: null, headSha: "a".repeat(40), files: [] });
    let notModified = 0;
    const fetchImpl = async (input: string, init: RequestInit) => {
      const response = await gh.fetch(input, init);
      if (response.status === 304) notModified++;
      return response;
    };
    const client = new GitHubClient({ baseUrl: gh.base, fetchImpl, etagCache: new Map() });
    const first = await client.request("GET", "/repos/acme/app/pulls/1");
    const second = await client.request("GET", "/repos/acme/app/pulls/1");
    expect(second).toEqual(first);
    expect(notModified).toBe(1);
  });

  it("classifies errors", async () => {
    const respond = (status: number, headers: Record<string, string> = {}) => async () =>
      new Response(JSON.stringify({ message: "nope" }), { status, headers });
    const kind = async (status: number, headers?: Record<string, string>) => {
      const client = new GitHubClient({ fetchImpl: respond(status, headers) });
      try {
        await client.request("GET", "/x");
      } catch (error) {
        return error instanceof GitHubApiError ? error.kind : "other";
      }
    };
    expect(await kind(401)).toBe("unauthorized");
    expect(await kind(404)).toBe("not_found");
    expect(await kind(422)).toBe("validation");
    expect(await kind(403, { "x-ratelimit-remaining": "0" })).toBe("rate_limited");
    expect(await kind(403)).toBe("forbidden");
    expect(await kind(502)).toBe("server");
  });

  it("sends the token only as an Authorization header", async () => {
    let seen: Headers | null = null;
    const client = new GitHubClient({
      token: "t0ken",
      fetchImpl: async (_url, init) => {
        seen = new Headers(init.headers);
        return Response.json({});
      },
    });
    await client.request("GET", "/x");
    expect(seen!.get("authorization")).toBe("Bearer t0ken");
  });
});
