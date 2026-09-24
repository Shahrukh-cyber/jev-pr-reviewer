/**
 * Minimal GitHub REST client shared by the GitHub Action (writes) and the
 * Next.js server (reads). No SDK dependency; plain fetch.
 */

type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

export type GitHubErrorKind =
  | "unauthorized"
  | "forbidden"
  | "rate_limited"
  | "not_found"
  | "validation"
  | "server"
  | "network";

export class GitHubApiError extends Error {
  constructor(
    readonly kind: GitHubErrorKind,
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "GitHubApiError";
  }
}

interface CacheEntry {
  etag: string;
  body: unknown;
  link: string | null;
}

export interface GitHubClientOptions {
  token?: string;
  baseUrl?: string;
  fetchImpl?: FetchLike;
  /** Enables conditional GETs (If-None-Match). 304s don't count against the rate limit. */
  etagCache?: Map<string, CacheEntry>;
  timeoutMs?: number;
}

export const GITHUB_PAGE_SIZE = 100;
/** GitHub caps the "list pull request files" endpoint at 3000 files. */
export const GITHUB_MAX_PR_FILES = 3000;

function classify(status: number, headers: Headers): GitHubErrorKind {
  if (status === 401) return "unauthorized";
  if (status === 404) return "not_found";
  if (status === 422) return "validation";
  if (status === 429 || (status === 403 && headers.get("x-ratelimit-remaining") === "0")) return "rate_limited";
  if (status === 403) return "forbidden";
  return "server";
}

function nextPageUrl(link: string | null): string | null {
  if (!link) return null;
  for (const part of link.split(",")) {
    const match = part.match(/<([^>]+)>;\s*rel="next"/);
    if (match) return match[1];
  }
  return null;
}

export class GitHubClient {
  private readonly token?: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: FetchLike;
  private readonly etagCache?: Map<string, CacheEntry>;
  private readonly timeoutMs: number;

  constructor(options: GitHubClientOptions = {}) {
    this.token = options.token;
    this.baseUrl = (options.baseUrl ?? "https://api.github.com").replace(/\/$/, "");
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.etagCache = options.etagCache;
    this.timeoutMs = options.timeoutMs ?? 15_000;
  }

  private url(path: string): string {
    return path.startsWith("http") ? path : `${this.baseUrl}${path}`;
  }

  private async send(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<{ body: unknown; link: string | null }> {
    const url = this.url(path);
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "jev-pr-reviewer",
    };
    if (this.token) headers.Authorization = `Bearer ${this.token}`;
    if (body !== undefined) headers["Content-Type"] = "application/json";

    const cached = method === "GET" ? this.etagCache?.get(url) : undefined;
    if (cached) headers["If-None-Match"] = cached.etag;

    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(this.timeoutMs),
        cache: "no-store",
      });
    } catch (error) {
      throw new GitHubApiError("network", 0, error instanceof Error ? error.message : "Network error");
    }

    if (response.status === 304 && cached) return { body: cached.body, link: cached.link };

    const text = await response.text();
    if (!response.ok) {
      let message = `GitHub ${method} ${path} failed with ${response.status}`;
      try {
        const parsed = JSON.parse(text) as { message?: unknown };
        if (typeof parsed.message === "string") message = `${message}: ${parsed.message}`;
      } catch {
        // Non-JSON error body; keep the generic message.
      }
      throw new GitHubApiError(classify(response.status, response.headers), response.status, message);
    }

    const parsed: unknown = text ? JSON.parse(text) : null;
    const link = response.headers.get("link");
    const etag = response.headers.get("etag");
    if (method === "GET" && etag && this.etagCache) this.etagCache.set(url, { etag, body: parsed, link });
    return { body: parsed, link };
  }

  async request(method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE", path: string, body?: unknown): Promise<unknown> {
    return (await this.send(method, path, body)).body;
  }

  /** Follows `Link: rel="next"` until exhausted or `maxItems` is reached. */
  async paginate(path: string, maxItems = Infinity): Promise<unknown[]> {
    const items: unknown[] = [];
    const separator = path.includes("?") ? "&" : "?";
    let next: string | null = `${path}${separator}per_page=${GITHUB_PAGE_SIZE}`;
    while (next && items.length < maxItems) {
      const page: { body: unknown; link: string | null } = await this.send("GET", next);
      if (!Array.isArray(page.body)) {
        throw new GitHubApiError("server", 200, `Expected an array from ${path}`);
      }
      items.push(...page.body);
      next = nextPageUrl(page.link);
    }
    return items.slice(0, maxItems);
  }
}
