import { parseJevResponse } from "@/lib/jev/schema";
import { formatPercent } from "@/lib/review/format";
import { toReviewModel, typeLabel } from "@/lib/review/model";
import { reviewRecordSchema, type ReviewRecord, type StoredAnalysis } from "./record";

/**
 * The PR comment is both the human-readable summary and the storage for the
 * review record: the record is embedded as base64 JSON inside an HTML comment
 * (base64 so PR text containing "-->" can never break out of it).
 */

export const REVIEW_MARKER = "<!-- jev-pr-review -->";
const DATA_PREFIX = "<!-- jev-pr-review:data:v1 ";
const DATA_SUFFIX = " -->";
const DATA_PATTERN = /<!-- jev-pr-review:data:v1 ([A-Za-z0-9+/=]+) -->/;

/** GitHub's comment limit is 65,536 characters; keep headroom. */
export const COMMENT_BUDGET = 60_000;

export function encodeRecord(record: ReviewRecord): string {
  return `${DATA_PREFIX}${Buffer.from(JSON.stringify(record), "utf8").toString("base64")}${DATA_SUFFIX}`;
}

export function decodeRecord(body: string): ReviewRecord | null {
  const match = body.match(DATA_PATTERN);
  if (!match) return null;
  try {
    const json: unknown = JSON.parse(Buffer.from(match[1], "base64").toString("utf8"));
    const parsed = reviewRecordSchema.safeParse(json);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function isReviewComment(body: string | null | undefined): boolean {
  return typeof body === "string" && body.includes(REVIEW_MARKER);
}

const shortSha = (value: string) => value.slice(0, 7);
const utc = (iso: string) => `${new Date(iso).toISOString().slice(0, 16).replace("T", " ")} UTC`;
const escapeCell = (value: string) => value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");

function analysisSection(analysis: StoredAnalysis): string[] {
  const parsed = parseJevResponse(analysis.response);
  if (!parsed.ok) return ["> ⚠️ The stored Jev response could not be read."];
  const model = toReviewModel(parsed.decision);
  const { risk } = model;
  const distribution = [...risk.distribution]
    .sort((a, b) => b.probability - a.probability)
    .map((entry) => `${entry.label} ${entry.percent}%`)
    .join(" · ");

  const lines = [
    "| Decision | Jev result | Detail |",
    "| --- | --- | --- |",
    `| Classification | **${escapeCell(model.type.label)}** | ${formatPercent(model.type.confidence)} confidence |`,
    `| Engineering risk | **${risk.score.toFixed(2)} / ${risk.max}** · ${risk.mostProbable.label} probability ${risk.mostProbable.percent}% | ${distribution} · ${formatPercent(risk.confidence)} confidence |`,
    `| Human review | **${model.humanReview.percent}%** probability | ${model.humanReview.assessmentLabel} |`,
    `| Additional tests | **${model.tests.percent}%** probability | ${model.tests.assessmentLabel} |`,
    "",
  ];

  if (analysis.labels.length > 0) {
    lines.push(
      `**Workflow labels:** ${analysis.labels.map((label) => `\`${label}\``).join(" ")} — derived by Jev PR Reviewer from the decision above using configured thresholds; Jev does not return labels.`,
      "",
    );
  }

  const { context } = analysis;
  const yesNo = (value: boolean) => (value ? "yes" : "no");
  lines.push(
    "<details><summary>PR context sent to Jev</summary>",
    "",
    `- **Files changed:** ${context.filesChanged} (+${context.linesAdded} / −${context.linesRemoved})`,
    `- **Tests added:** ${yesNo(context.testsAdded)} · **Authentication changes:** ${yesNo(context.hasAuthenticationChanges)} · **Database changes:** ${yesNo(context.hasDatabaseChanges)} _(path heuristics)_`,
    "",
    "</details>",
  );
  return lines;
}

function historySection(record: ReviewRecord): string[] {
  if (record.history.length < 2) return [];
  return [
    "",
    "<details><summary>Review history</summary>",
    "",
    "| Commit | Analyzed | Type | Risk | Review | Tests |",
    "| --- | --- | --- | --- | --- | --- |",
    ...record.history.map(
      (entry) =>
        `| \`${shortSha(entry.headSha)}\` | ${utc(entry.analyzedAt)} | ${escapeCell(typeLabel(entry.typeChoice))} | ${entry.riskScore.toFixed(2)} | ${formatPercent(entry.humanReview)} | ${formatPercent(entry.tests)} |`,
    ),
    "",
    "</details>",
  ];
}

export interface RenderOptions {
  /** Public URL of the Jev PR Reviewer dashboard, if deployed. */
  reviewerUrl?: string | null;
}

/** Human-readable summary without the embedded data (also used for the job summary). */
export function renderSummary(record: ReviewRecord, options: RenderOptions = {}): string {
  const { latest, attempt } = record;
  const lines = ["## Jev PR Review", ""];

  if (attempt?.status === "pending") {
    lines.push(`⏳ **Analyzing commit \`${shortSha(attempt.headSha)}\` with Jev…**`, "");
  } else if (attempt?.status === "failed") {
    lines.push(
      `⚠️ **Review unavailable for commit \`${shortSha(attempt.headSha)}\`** — ${attempt.error?.message ?? "the analysis failed."}${attempt.runUrl ? ` [View workflow run](${attempt.runUrl})` : ""}`,
      "",
    );
  }

  if (latest) {
    const current = attempt?.status === "completed" && attempt.headSha === latest.headSha;
    lines.push(
      current
        ? `**Commit** \`${shortSha(latest.headSha)}\` · analyzed ${utc(latest.analyzedAt)}`
        : `_Previous review — commit \`${shortSha(latest.headSha)}\`, analyzed ${utc(latest.analyzedAt)}_`,
      "",
      ...analysisSection(latest),
      ...historySection(record),
    );
  }

  const links = ["Analyzed by [Jev](https://www.jevai.org)."];
  if (options.reviewerUrl) {
    const url = new URL(options.reviewerUrl);
    url.searchParams.set("mode", "live");
    url.searchParams.set("pr", String(record.pullNumber));
    links.push(`[View detailed review in Jev PR Reviewer](${url.toString()})`);
  }
  const runUrl = latest?.runUrl ?? attempt?.runUrl;
  if (runUrl) links.push(`[Workflow run](${runUrl})`);
  lines.push("", "---", links.join(" · "));
  return lines.join("\n");
}

/**
 * Full comment body: marker + summary + embedded record. If the body would
 * exceed GitHub's limit, history is trimmed, then a long description, then the
 * stored file list — each marked truncated, never silently.
 */
export function renderComment(record: ReviewRecord, options: RenderOptions = {}): string {
  const build = (value: ReviewRecord) => `${REVIEW_MARKER}\n${renderSummary(value, options)}\n\n${encodeRecord(value)}\n`;

  let current = record;
  let body = build(current);
  if (body.length <= COMMENT_BUDGET) return body;

  current = { ...current, history: current.history.slice(0, 3) };
  body = build(current);

  if (body.length > COMMENT_BUDGET && current.latest && current.latest.context.description.length > 2000) {
    const { context } = current.latest;
    current = {
      ...current,
      latest: {
        ...current.latest,
        context: { ...context, description: `${context.description.slice(0, 2000)}…`, descriptionTruncated: true },
      },
    };
    body = build(current);
  }

  while (body.length > COMMENT_BUDGET && current.latest && current.latest.context.changedFiles.length > 0) {
    const files = current.latest.context.changedFiles;
    current = {
      ...current,
      latest: {
        ...current.latest,
        context: {
          ...current.latest.context,
          changedFiles: files.slice(0, Math.floor(files.length * 0.75)),
          changedFilesTruncated: true,
        },
      },
    };
    body = build(current);
  }
  return body;
}
