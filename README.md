# Jev PR Reviewer

**Turn Pull Requests into structured engineering decisions.**

A PR triage dashboard powered by [Jev](https://www.jevai.org)'s structured decision API. Jev answers four typed questions about a Pull Request — PR type, risk score, human-review probability, test probability — and the dashboard renders those answers as a visual engineering review, plus the deterministic workflow signals derived from them.

It works in two modes that share the exact same review UI:

| Mode | Data source | Use it for |
| --- | --- | --- |
| **Demo** | PR context entered in the form (or **Load Demo PR**), sent to Jev by the Next.js server | Presentations; works without GitHub, and the demo PR still renders if Jev is down |
| **Live PRs** | Real GitHub Pull Requests, analyzed by the **Jev PR Review** GitHub Action | The real workflow: push → PR → Action → Jev → dashboard |

## Getting started

```bash
pnpm install
cp .env.example .env.local   # then set JEV_API_KEY (and GITHUB_* for Live PRs)
pnpm dev
```

| Variable | Default | Purpose |
| --- | --- | --- |
| `JEV_API_URL` | `https://www.jevai.org/api/v1/decisions` | Jev decision endpoint |
| `JEV_API_KEY` | — | Sent server-side as `Authorization: Bearer <key>`. **Required** — Jev returns 401 without it. |
| `JEV_TIMEOUT_MS` | `30000` | Upstream request timeout |
| `JEV_USE_SAMPLE_RESPONSE` | `false` | `true` returns Jev's documented example response without calling the API. |
| `GITHUB_OWNER` / `GITHUB_REPOSITORY` | — | Repository shown in **Live PRs** mode (`GITHUB_REPOSITORY` may also be `owner/name`). |
| `GITHUB_TOKEN` | — | Read-only token for the dashboard. Optional for public repos; without it GitHub allows 60 requests/hour, so auto-refresh is off. |
| `JEV_REVIEW_COMMENT_AUTHOR` | `github-actions[bot]` | Only review comments by this account are trusted. |

## Scripts

| Command | |
| --- | --- |
| `pnpm dev` | Dev server |
| `pnpm build` | Production build |
| `pnpm test` | Unit tests (Vitest) |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | ESLint |
| `pnpm jev:review` | Run the PR review job (used by the GitHub Action; see below) |

## Demo Mode

**Load Demo PR → Analyze with Jev.** The form's context goes to `POST /api/analyze`, which validates it, calls Jev with the API key held on the server, and returns Jev's response unmodified. If Jev is unavailable, the *unmodified* demo PR falls back to Jev's documented example response and the UI says so ("Jev was unavailable"); any other input shows the error. Demo results carry a **DEMO** badge and are never presented as a GitHub PR.

## Real GitHub PR Review

```
GitHub PR (opened / new commits / reopened)
   ↓
GitHub Actions — .github/workflows/jev-pr-review.yml
   ↓
Collect PR context — GitHub API: PR metadata, all changed files (paginated), diff stats,
                     path heuristics for tests / auth / database
   ↓
Jev API — POST /api/v1/decisions (same questions as the dashboard: lib/jev/questions.ts)
   ↓
Structured decision — validated against the Jev response schema
   ↓
Publish — one PR comment (updated in place) holding the summary + the review record,
          workflow labels, job summary
   ↓
Next.js dashboard — reads the comment via the GitHub API → Live PRs mode
```

### Why GitHub is the persistence layer

GitHub's runners can't reach a dashboard running on `localhost`, and a database would be a lot of machinery for a handful of reviews. So the Action stores each review **in its own PR comment**: a readable Markdown summary plus the full record (PR context, the unmodified Jev response, applied labels, and a per-commit history) embedded as base64 JSON in an HTML comment. The dashboard reads that comment through the GitHub API.

- **Nothing to secure inbound:** there is no write endpoint on the dashboard. It only reads, and only for the configured repository.
- **Can't be spoofed by commenters:** only comments authored by `github-actions[bot]` (the workflow's `GITHUB_TOKEN` identity) are trusted, and the embedded record is schema-validated.
- **Idempotent:** the workflow finds its existing comment by the `<!-- jev-pr-review -->` marker and updates it; it never posts a second one. History is keyed by commit SHA, so re-running the same commit replaces its entry and a new commit adds one (the last 10 are kept).
- **Size-safe:** GitHub comments are capped at 65,536 characters. If a huge PR exceeds that, the stored history, then a long description, then the file list are shortened, and each is flagged as truncated in the record and the UI. Jev always receives the full context.

### What the workflow does

1. Triggers on `pull_request` `opened`, `synchronize` (new commits), and `reopened`. A newer push cancels an in-flight review of an older commit.
2. Marks the comment as **Analyzing commit `abc1234`…** (the dashboard shows *Analyzing with Jev…*).
3. Reads the PR and **all** changed files (100 per page, following pagination up to GitHub's 3000-file cap; totals come from the PR object, so they stay exact even beyond that).
4. Derives `tests_added`, `has_authentication_changes`, and `has_database_changes` from file paths using the explicit, editable pattern lists in [`lib/review/detection.ts`](lib/review/detection.ts). These are heuristics, not code understanding. The files that triggered each signal are stored and shown in the dashboard.
5. Sends the request to Jev, retrying 429/5xx/timeouts up to 3 times with backoff (honoring `Retry-After`).
6. On success it applies labels, updates the comment with the review, and writes the job summary. On failure it records **Review unavailable** in the comment (keeping the last good review) and **fails the job**, so a failed analysis never looks like a successful one.

Logs show the collected signals and Jev's values (risk score, probabilities). They never show API keys, tokens, or headers.

### Labels

The labels are app-level mappings in [`lib/review/config.ts`](lib/review/config.ts). **Jev does not return labels.**

| Label | Rule |
| --- | --- |
| `bug` / `feature` / `refactor` / `documentation` | `type.choice`, when `type.confidence ≥ 0.60` (`other` maps to no label) |
| `critical-risk` / `high-risk` / `moderate-risk` / `low-risk` | `risk.score ≥ 2.5` / `≥ 1.5` / `≥ 0.5` / otherwise |
| `needs-review` | `needs_human_review.noul ≥ 0.70` |
| `needs-tests` | `needs_tests.noul ≥ 0.70` |

On re-analysis the workflow removes only labels it applied previously, never labels added by people. The job is **informational**: it passes whatever the risk is, and blocks merging only if you make "Jev PR Review" a required status check.

### Setup

1. **Repository secret** — *Settings → Secrets and variables → Actions → New repository secret*: `JEV_API_KEY`.
2. **Optional repository variables** — `JEV_API_URL` (defaults to the public endpoint) and `JEV_REVIEWER_URL` (your deployed dashboard URL, which adds a "View detailed review" link to the comment).
3. **Workflow permissions** are declared in the workflow (`contents: read`, `pull-requests: write`, `issues: write`); no repository settings change is needed.
4. **Dashboard** — set `GITHUB_OWNER`, `GITHUB_REPOSITORY`, and ideally a read-only `GITHUB_TOKEN` in `.env.local` (or your host's environment).

PRs from forks are skipped: GitHub gives them no secrets and a read-only token.

### Test it with a real PR

```bash
git checkout -b try-jev
echo "// touch" >> lib/review/format.ts
git commit -am "Tweak formatting helper"
git push -u origin try-jev
```

Open a PR for the branch on GitHub. Then:

- **GitHub → Actions → Jev PR Review** — watch the logs.
- **The PR** — the "Jev PR Review" check, the summary comment, and the labels.
- **Dashboard → Live PRs** — the PR appears in *Recent Pull Requests*. Its review goes from *Waiting* to *Analyzing* to *Review ready* (auto-refreshing with a `GITHUB_TOKEN`; otherwise click refresh). Push another commit to see *New commits since this review*, then a new entry in *Review History*.

To exercise the job from your machine without writing to GitHub:

```bash
GITHUB_REPOSITORY=owner/repo GITHUB_TOKEN=<token> JEV_API_KEY=<key> pnpm jev:review --pr 12 --dry-run
```

## Architecture

```
.github/workflows/jev-pr-review.yml   The GitHub Action
scripts/jev-pr-review.ts              Action entry point (env/event → runReview)
app/
  api/analyze/route.ts                Demo: validate → Jev → raw response
  api/reviews/[owner]/[repo]/…        Live: read PRs + stored reviews from GitHub
lib/
  jev/                                Jev contract: types, questions, schema, client (+retries), sample
  review/                             Pure transformation layer shared by both modes
    model.ts  workflow.ts  detection.ts  config.ts  labels.ts  validation.ts
  github/                             Minimal REST client (pagination, ETags) + payload schemas
  reviews/                            Review record, comment codec, lifecycle, GitHub store, runReview
components/
  pr-review/                          Form, states, decision cards, JSON viewer, mode switch
  live/                               PR list, PR header, lifecycle banners, history, polling hook
```

Both modes use the same `Jev response → toReviewModel → ReviewBody` path, so a real PR and the demo render identically. Every number on a live review comes from the stored Jev response for that PR's commit.

### Principles

- **Faithful to Jev.** The UI only re-expresses Jev's answers. The risk score is always shown as a fractional score *with* its distribution; noul values are shown as probabilities, never verdicts. "Why this result?" lists raw Jev fields — no generated explanations.
- **Interpretation is explicit.** "Likely / uncertain" bands and workflow labels are derived from thresholds in `lib/review/config.ts`, and the UI and comment say so.
- **Secrets stay on the server.** The browser talks only to this app's API routes. Upstream error details are logged server-side and never forwarded.
- **Honest states.** Loading stages, *Analyzing*, *New commits*, and *Review unavailable* reflect events that actually happened. Every review shows which commit it was for and when it was analyzed.
