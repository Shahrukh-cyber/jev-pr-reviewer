/**
 * In-memory fake of the GitHub REST endpoints the app uses, for tests.
 * Implements pagination via `Link` headers and ETags like the real API.
 */

export interface FakeComment {
  id: number;
  body: string;
  user: { login: string; type: string };
  html_url: string;
  updated_at: string;
}

export interface FakePull {
  number: number;
  title: string;
  body: string | null;
  headSha: string;
  files: { filename: string; status: string; additions: number; deletions: number }[];
  state?: "open" | "closed";
}

export class FakeGitHub {
  readonly base = "https://api.github.test";
  pulls = new Map<number, FakePull>();
  comments = new Map<number, FakeComment[]>();
  issueLabels = new Map<number, Set<string>>();
  repoLabels = new Set<string>(["bug"]);
  requests: { method: string; path: string }[] = [];
  private nextId = 1000;
  private clock = Date.parse("2026-09-24T10:00:00Z");

  constructor(
    readonly owner = "acme",
    readonly repo = "app",
  ) {}

  addPull(pull: FakePull) {
    this.pulls.set(pull.number, pull);
    this.comments.set(pull.number, this.comments.get(pull.number) ?? []);
    this.issueLabels.set(pull.number, this.issueLabels.get(pull.number) ?? new Set());
  }

  addComment(number: number, login: string, body: string): FakeComment {
    const comment = {
      id: this.nextId++,
      body,
      user: { login, type: login.endsWith("[bot]") ? "Bot" : "User" },
      html_url: `https://github.com/${this.owner}/${this.repo}/pull/${number}#issuecomment-${this.nextId}`,
      updated_at: new Date((this.clock += 1000)).toISOString(),
    };
    this.comments.get(number)?.push(comment);
    return comment;
  }

  private pullJson(pull: FakePull) {
    return {
      number: pull.number,
      title: pull.title,
      body: pull.body,
      html_url: `https://github.com/${this.owner}/${this.repo}/pull/${pull.number}`,
      state: pull.state ?? "open",
      draft: false,
      merged_at: null,
      created_at: "2026-09-24T09:00:00Z",
      updated_at: "2026-09-24T09:30:00Z",
      user: { login: "octocat", type: "User" },
      head: { ref: "feature/jwt", sha: pull.headSha },
      base: { ref: "main" },
      additions: pull.files.reduce((sum, file) => sum + file.additions, 0),
      deletions: pull.files.reduce((sum, file) => sum + file.deletions, 0),
      changed_files: pull.files.length,
    };
  }

  private page(url: URL, items: unknown[]) {
    const perPage = Number(url.searchParams.get("per_page") ?? 30);
    const page = Number(url.searchParams.get("page") ?? 1);
    const slice = items.slice((page - 1) * perPage, page * perPage);
    const headers: Record<string, string> = {};
    if (page * perPage < items.length) {
      const next = new URL(url);
      next.searchParams.set("page", String(page + 1));
      headers.link = `<${next.toString()}>; rel="next"`;
    }
    return { body: slice, headers };
  }

  fetch = async (input: string, init: RequestInit = {}): Promise<Response> => {
    const url = new URL(input);
    const method = init.method ?? "GET";
    const path = url.pathname;
    this.requests.push({ method, path });
    const json = (body: unknown, status = 200, headers: Record<string, string> = {}) => {
      const text = JSON.stringify(body);
      const etag = `"${text.length}-${[...text].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)}"`;
      const requestHeaders = new Headers(init.headers);
      if (method === "GET" && requestHeaders.get("if-none-match") === etag) return new Response(null, { status: 304 });
      return new Response(text, { status, headers: { "content-type": "application/json", etag, ...headers } });
    };
    const body = init.body ? JSON.parse(String(init.body)) : undefined;
    const prefix = `/repos/${this.owner}/${this.repo}`;
    if (!path.startsWith(prefix)) return json({ message: "Not Found" }, 404);
    const rest = path.slice(prefix.length);

    let match: RegExpMatchArray | null;
    if (method === "GET" && rest === "/pulls") {
      return json([...this.pulls.values()].reverse().map((pull) => this.pullJson(pull)));
    }
    if ((match = rest.match(/^\/pulls\/(\d+)$/)) && method === "GET") {
      const pull = this.pulls.get(Number(match[1]));
      return pull ? json(this.pullJson(pull)) : json({ message: "Not Found" }, 404);
    }
    if ((match = rest.match(/^\/pulls\/(\d+)\/files$/)) && method === "GET") {
      const pull = this.pulls.get(Number(match[1]));
      if (!pull) return json({ message: "Not Found" }, 404);
      const { body: items, headers } = this.page(url, pull.files);
      return json(items, 200, headers);
    }
    if ((match = rest.match(/^\/issues\/(\d+)\/comments$/))) {
      const number = Number(match[1]);
      if (method === "GET") {
        const { body: items, headers } = this.page(url, this.comments.get(number) ?? []);
        return json(items, 200, headers);
      }
      if (method === "POST") return json(this.addComment(number, "github-actions[bot]", body.body), 201);
    }
    if ((match = rest.match(/^\/issues\/comments\/(\d+)$/)) && method === "PATCH") {
      for (const list of this.comments.values()) {
        const comment = list.find((item) => item.id === Number(match![1]));
        if (comment) {
          comment.body = body.body;
          comment.updated_at = new Date((this.clock += 1000)).toISOString();
          return json(comment);
        }
      }
      return json({ message: "Not Found" }, 404);
    }
    if ((match = rest.match(/^\/issues\/(\d+)\/labels$/))) {
      const labels = this.issueLabels.get(Number(match[1])) ?? new Set<string>();
      if (method === "POST") for (const label of body.labels as string[]) labels.add(label);
      return json([...labels].map((name) => ({ name })));
    }
    if ((match = rest.match(/^\/issues\/(\d+)\/labels\/(.+)$/)) && method === "DELETE") {
      const labels = this.issueLabels.get(Number(match[1]));
      const name = decodeURIComponent(match[2]);
      if (!labels?.has(name)) return json({ message: "Label does not exist" }, 404);
      labels.delete(name);
      return json([...labels].map((label) => ({ name: label })));
    }
    if (rest === "/labels" && method === "POST") {
      if (this.repoLabels.has(body.name)) return json({ message: "Validation Failed" }, 422);
      this.repoLabels.add(body.name);
      return json({ name: body.name }, 201);
    }
    return json({ message: `Unhandled ${method} ${rest}` }, 500);
  };
}
