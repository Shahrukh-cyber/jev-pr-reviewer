import { requestJevDecision, type JevClientConfig } from "@/lib/jev/client";
import { buildDecisionRequest } from "@/lib/jev/questions";
import { GitHubApiError, type GitHubClient } from "@/lib/github/client";
import { ANALYZE_ERROR_COPY } from "@/lib/review/errors";
import { formatRaw } from "@/lib/review/format";
import { deriveWorkflow } from "@/lib/review/workflow";
import { renderComment, renderSummary } from "./comment";
import { buildPullContext } from "./context";
import {
  DEFAULT_REVIEW_AUTHOR,
  findReviewComment,
  getPull,
  getPullFiles,
  syncLabels,
  upsertReviewComment,
} from "./github-store";
import { completeAnalysis, emptyRecord, failAttempt, startAttempt, type ReviewRecord } from "./record";

type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

export interface RunReviewOptions {
  github: GitHubClient;
  owner: string;
  repo: string;
  pullNumber: number;
  jev: JevClientConfig;
  jevFetch?: FetchLike;
  runUrl: string | null;
  reviewerUrl: string | null;
  commentAuthor?: string;
  /** Read from GitHub and call Jev, but don't write comments or labels. */
  dryRun?: boolean;
  jevAttempts?: number;
  sleep?: (ms: number) => Promise<void>;
  log?: (message: string) => void;
  now?: () => Date;
}

export interface RunReviewResult {
  ok: boolean;
  record: ReviewRecord;
  /** Markdown for the GitHub job summary. */
  summary: string;
  warnings: string[];
}

/**
 * The GitHub Action's job: collect real PR context → ask Jev → publish the
 * structured decision as a PR comment (the persistent store) and labels.
 */
export async function runReview(options: RunReviewOptions): Promise<RunReviewResult> {
  const { github, owner, repo, pullNumber, runUrl, reviewerUrl, dryRun = false } = options;
  const log = options.log ?? console.log;
  const now = () => (options.now?.() ?? new Date()).toISOString();
  const author = options.commentAuthor ?? DEFAULT_REVIEW_AUTHOR;
  const warnings: string[] = [];

  let commentId: number | null = null;
  const publish = async (record: ReviewRecord) => {
    if (dryRun) return;
    const comment = await upsertReviewComment(github, owner, repo, pullNumber, commentId, renderComment(record, { reviewerUrl }));
    commentId = comment.id;
  };

  const existing = await findReviewComment(github, owner, repo, pullNumber, author);
  commentId = existing?.comment.id ?? null;
  const previous = existing?.record ?? emptyRecord(owner, repo, pullNumber);
  if (existing && !existing.record) warnings.push("Existing review comment had unreadable data; starting a fresh record.");

  log(`Collecting PR context for ${owner}/${repo}#${pullNumber}...`);
  const pull = await getPull(github, owner, repo, pullNumber);
  const headSha = pull.head.sha;

  let record = startAttempt(previous, { headSha, runUrl, now: now() });
  await publish(record);

  try {
    const { files, truncated } = await getPullFiles(github, owner, repo, pullNumber, pull.changed_files);
    const { context, detection } = buildPullContext(pull, files);

    log(`Head commit: ${headSha.slice(0, 7)}`);
    log(`Changed files: ${context.filesChanged} (+${context.linesAdded} / -${context.linesRemoved})`);
    if (truncated) {
      const message = `GitHub listed ${files.length} of ${context.filesChanged} files (API limit); totals are exact, path list is partial.`;
      warnings.push(message);
      log(`Warning: ${message}`);
    }
    log(`Tests detected: ${context.testsAdded}${detection.tests.length ? ` (${detection.tests.slice(0, 3).join(", ")})` : ""}`);
    log(`Authentication changes: ${context.hasAuthenticationChanges}`);
    log(`Database changes: ${context.hasDatabaseChanges}`);

    log("Sending request to Jev...");
    const request = buildDecisionRequest(context);
    const result = await requestJevDecision(request, options.jev, options.jevFetch, {
      attempts: options.jevAttempts ?? 3,
      sleep: options.sleep,
      onRetry: ({ attempt, kind, delayMs }) => log(`Jev request ${kind}; retrying (attempt ${attempt}) in ${Math.round(delayMs / 1000)}s...`),
    });

    if (!result.ok) {
      const copy = ANALYZE_ERROR_COPY[result.kind];
      log(`Jev analysis failed: ${result.kind}${result.status ? ` (HTTP ${result.status})` : ""}. ${copy.message}`);
      record = failAttempt(record, { headSha, runUrl, now: now(), kind: result.kind, message: `${copy.title}. ${copy.message}` });
      await publish(record);
      return { ok: false, record, summary: renderSummary(record, { reviewerUrl }), warnings };
    }

    const { answers } = result.decision.data;
    log("Jev analysis completed.");
    log(`Type: ${answers.type.choice} (confidence ${formatRaw(answers.type.confidence)})`);
    log(`Risk score: ${formatRaw(answers.risk.score)} (confidence ${formatRaw(answers.risk.confidence)})`);
    log(`Review probability: ${formatRaw(answers.needs_human_review.noul)}`);
    log(`Tests probability: ${formatRaw(answers.needs_tests.noul)}`);

    const { labels } = deriveWorkflow(result.decision);
    if (!dryRun) {
      try {
        const { added, removed } = await syncLabels(github, owner, repo, pullNumber, labels, previous.latest?.labels ?? []);
        log(`Labels: ${labels.join(", ") || "none"}${added.length ? ` (added ${added.join(", ")})` : ""}${removed.length ? ` (removed ${removed.join(", ")})` : ""}`);
      } catch (error) {
        const message = `Could not update labels: ${error instanceof Error ? error.message : String(error)}`;
        warnings.push(message);
        log(`Warning: ${message}`);
      }
    }

    log("Publishing review...");
    record = completeAnalysis(record, {
      headSha,
      analyzedAt: now(),
      durationMs: result.durationMs,
      context,
      detection,
      response: result.raw,
      labels,
      runUrl,
    });
    await publish(record);
    log(dryRun ? "Dry run: review not published." : "Review published successfully.");
    return { ok: true, record, summary: renderSummary(record, { reviewerUrl }), warnings };
  } catch (error) {
    const message =
      error instanceof GitHubApiError
        ? `GitHub API error (${error.kind}, HTTP ${error.status}).`
        : "Unexpected error while running the review.";
    log(`${message} ${error instanceof Error ? error.message : ""}`);
    record = failAttempt(record, { headSha, runUrl, now: now(), kind: "github_error", message });
    try {
      await publish(record);
    } catch {
      // Best effort: the failure is still reported through the job's exit code.
    }
    return { ok: false, record, summary: renderSummary(record, { reviewerUrl }), warnings };
  }
}
