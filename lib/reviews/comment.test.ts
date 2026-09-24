import { describe, expect, it } from "vitest";
import { COMMENT_BUDGET, REVIEW_MARKER, decodeRecord, encodeRecord, isReviewComment, renderComment, renderSummary } from "./comment";
import { SHA_A, SHA_B, analysis, jevResponse } from "./fixtures";
import { completeAnalysis, emptyRecord, failAttempt, startAttempt } from "./record";

const T1 = "2026-09-24T10:00:00.000Z";

describe("record encoding", () => {
  it("round-trips through the comment body", () => {
    const record = completeAnalysis(emptyRecord("o", "r", 7), analysis(SHA_A, T1));
    const body = renderComment(record);
    expect(body.startsWith(REVIEW_MARKER)).toBe(true);
    expect(isReviewComment(body)).toBe(true);
    expect(decodeRecord(body)).toEqual(record);
  });

  it("survives PR text that tries to break out of the HTML comment", () => {
    const hostile = analysis(SHA_A, T1);
    hostile.context.description = "--> <!-- jev-pr-review:data:v1 AAAA --> <script>";
    const record = completeAnalysis(emptyRecord("o", "r", 7), hostile);
    expect(decodeRecord(renderComment(record))?.latest?.context.description).toBe(hostile.context.description);
  });

  it("rejects missing, corrupt or wrongly-shaped data", () => {
    expect(decodeRecord("hello")).toBeNull();
    expect(decodeRecord("<!-- jev-pr-review:data:v1 bm90IGpzb24= -->")).toBeNull();
    const wrong = encodeRecord({ ...emptyRecord("o", "r", 7), version: 2 } as never);
    expect(decodeRecord(wrong)).toBeNull();
  });
});

describe("renderSummary", () => {
  it("shows the actual Jev values, not fixed examples", () => {
    const record = completeAnalysis(
      emptyRecord("o", "r", 7),
      analysis(SHA_A, T1, jevResponse({ choice: "feature", score: 0.42, review: 0.31, tests: 0.77 })),
    );
    const summary = renderSummary(record, { reviewerUrl: "https://reviewer.example.com" });
    expect(summary).toContain("**Feature**");
    expect(summary).toContain("**0.42 / 3**");
    expect(summary).toContain("**31%** probability");
    expect(summary).toContain("**77%** probability");
    expect(summary).not.toContain("1.84");
    expect(summary).toContain("https://reviewer.example.com/?mode=live&pr=7");
    expect(summary).toContain("Jev does not return labels");
  });

  it("shows pending and failed states with the previous review", () => {
    let record = completeAnalysis(emptyRecord("o", "r", 7), analysis(SHA_A, T1));
    record = startAttempt(record, { headSha: SHA_B, runUrl: null, now: T1 });
    expect(renderSummary(record)).toContain("Analyzing commit `bbbbbbb`");
    expect(renderSummary(record)).toContain("Previous review");

    record = failAttempt(record, { headSha: SHA_B, runUrl: "https://run", now: T1, kind: "timeout", message: "Jev took too long." });
    expect(renderSummary(record)).toContain("Review unavailable for commit `bbbbbbb`");
    expect(renderSummary(record)).toContain("[View workflow run](https://run)");
  });
});

describe("renderComment size budget", () => {
  it("truncates explicitly instead of exceeding GitHub's limit", () => {
    const big = analysis(SHA_A, T1);
    big.context.changedFiles = Array.from({ length: 3000 }, (_, i) => `packages/module-${i}/src/very/long/path/file-${i}.ts`);
    big.context.filesChanged = 3000;
    big.context.description = "x".repeat(20_000);
    const body = renderComment(completeAnalysis(emptyRecord("o", "r", 7), big));
    expect(body.length).toBeLessThanOrEqual(COMMENT_BUDGET);
    const decoded = decodeRecord(body);
    expect(decoded?.latest?.context.changedFilesTruncated).toBe(true);
    expect(decoded?.latest?.context.descriptionTruncated).toBe(true);
    expect(decoded?.latest?.context.filesChanged).toBe(3000);
  });
});
