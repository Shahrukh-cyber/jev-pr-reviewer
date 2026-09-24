import { describe, expect, it } from "vitest";
import { SHA_A, SHA_B, analysis, jevResponse } from "./fixtures";
import { HISTORY_LIMIT, completeAnalysis, emptyRecord, failAttempt, reviewRecordSchema, startAttempt } from "./record";

const T1 = "2026-09-24T10:00:00.000Z";
const T2 = "2026-09-24T10:30:00.000Z";

describe("review record", () => {
  it("tracks a pending attempt then a completed analysis", () => {
    let record = startAttempt(emptyRecord("o", "r", 42), { headSha: SHA_A, runUrl: null, now: T1 });
    expect(record.attempt?.status).toBe("pending");
    record = completeAnalysis(record, analysis(SHA_A, T1));
    expect(record.attempt).toMatchObject({ status: "completed", headSha: SHA_A });
    expect(record.latest?.headSha).toBe(SHA_A);
    expect(record.history).toHaveLength(1);
    expect(record.history[0]).toMatchObject({ typeChoice: "bug", riskScore: 1.84, humanReview: 0.86, tests: 0.46 });
    expect(reviewRecordSchema.safeParse(record).success).toBe(true);
  });

  it("is idempotent per commit: re-analyzing the same SHA replaces its entry", () => {
    let record = completeAnalysis(emptyRecord("o", "r", 42), analysis(SHA_A, T1));
    record = completeAnalysis(record, analysis(SHA_A, T2, jevResponse({ score: 1.2 })));
    expect(record.history).toHaveLength(1);
    expect(record.history[0].riskScore).toBe(1.2);
  });

  it("keeps history newest-first across commits, capped", () => {
    let record = completeAnalysis(emptyRecord("o", "r", 42), analysis(SHA_A, T1));
    record = completeAnalysis(record, analysis(SHA_B, T2, jevResponse({ score: 0.9 })));
    expect(record.history.map((entry) => entry.headSha)).toEqual([SHA_B, SHA_A]);

    for (let i = 0; i < HISTORY_LIMIT + 3; i++) {
      const sha = i.toString(16).padStart(40, "c");
      record = completeAnalysis(record, analysis(sha, new Date(Date.parse(T2) + (i + 1) * 60_000).toISOString()));
    }
    expect(record.history).toHaveLength(HISTORY_LIMIT);
  });

  it("keeps the last successful analysis when a later attempt fails", () => {
    let record = completeAnalysis(emptyRecord("o", "r", 42), analysis(SHA_A, T1));
    record = startAttempt(record, { headSha: SHA_B, runUrl: null, now: T2 });
    record = failAttempt(record, { headSha: SHA_B, runUrl: null, now: T2, kind: "timeout", message: "Timed out" });
    expect(record.latest?.headSha).toBe(SHA_A);
    expect(record.attempt).toMatchObject({ status: "failed", headSha: SHA_B, error: { kind: "timeout" } });
  });

  it("does not add history for an unreadable Jev response", () => {
    const record = completeAnalysis(emptyRecord("o", "r", 42), analysis(SHA_A, T1, { nope: true }));
    expect(record.history).toHaveLength(0);
  });
});
