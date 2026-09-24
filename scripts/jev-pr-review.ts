/**
 * Entry point for the "Jev PR Review" GitHub Action (and local runs).
 *
 * In GitHub Actions it reads the PR from the event payload. Locally:
 *   GITHUB_REPOSITORY=owner/repo GITHUB_TOKEN=<token> pnpm jev:review --pr 12 [--dry-run]
 *
 * Secrets are read from the environment and never logged.
 */
import { appendFileSync, readFileSync } from "node:fs";
import { readJevConfig } from "@/lib/jev/client";
import { GitHubClient } from "@/lib/github/client";
import { runReview } from "@/lib/reviews/run-review";

function fail(message: string): never {
  console.error(`::error::${message}`);
  process.exit(1);
}

function argValue(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function pullNumberFromEvent(): number | undefined {
  const path = process.env.GITHUB_EVENT_PATH;
  if (!path) return undefined;
  try {
    const event = JSON.parse(readFileSync(path, "utf8")) as { pull_request?: { number?: unknown } };
    return typeof event.pull_request?.number === "number" ? event.pull_request.number : undefined;
  } catch {
    return undefined;
  }
}

async function main() {
  const [owner, repo] = (process.env.GITHUB_REPOSITORY ?? "").split("/");
  if (!owner || !repo) fail("GITHUB_REPOSITORY must be set to owner/repo.");

  const pullNumber = Number(argValue("--pr") ?? pullNumberFromEvent());
  if (!Number.isInteger(pullNumber) || pullNumber <= 0) fail("No pull request number (run on pull_request events or pass --pr <number>).");

  const dryRun = process.argv.includes("--dry-run");
  const token = process.env.GITHUB_TOKEN?.trim() || undefined;
  // Writes need a token; a dry run of a public repository can read anonymously.
  if (!token && !dryRun) fail("GITHUB_TOKEN is required.");

  const jev = readJevConfig();
  if (!jev.apiKey) console.log("::warning::JEV_API_KEY is not set; Jev will likely reject the request.");

  const server = process.env.GITHUB_SERVER_URL ?? "https://github.com";
  const runId = process.env.GITHUB_RUN_ID;
  const runUrl = runId ? `${server}/${owner}/${repo}/actions/runs/${runId}` : null;

  const result = await runReview({
    github: new GitHubClient({ token, baseUrl: process.env.GITHUB_API_URL }),
    owner,
    repo,
    pullNumber,
    jev,
    runUrl,
    reviewerUrl: process.env.JEV_REVIEWER_URL?.trim() || null,
    commentAuthor: process.env.JEV_REVIEW_COMMENT_AUTHOR?.trim() || undefined,
    dryRun,
  });

  for (const warning of result.warnings) console.log(`::warning::${warning}`);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${result.summary}\n`);
  else console.log(`\n${result.summary}\n`);

  if (!result.ok) fail(result.record.attempt?.error?.message ?? "Jev PR review failed.");
}

main().catch((error: unknown) => fail(error instanceof Error ? error.message : String(error)));
