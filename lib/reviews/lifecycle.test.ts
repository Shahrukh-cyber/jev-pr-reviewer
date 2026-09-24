import { describe, expect, it } from "vitest";
import { SHA_A, SHA_B, analysis } from "./fixtures";
import { STALLED_AFTER_MS, deriveLifecycle, shouldPoll } from "./lifecycle";
import { completeAnalysis, emptyRecord, failAttempt, startAttempt } from "./record";

const NOW = Date.parse("2026-09-24T10:05:00.000Z");
const T = "2026-09-24T10:00:00.000Z";
const open = (headSha: string) => ({ headSha, state: "open" as const });

describe("deriveLifecycle", () => {
  it("waits when there is no review", () => {
    expect(deriveLifecycle(open(SHA_A), null, NOW).status).toBe("waiting");
  });

  it("is analyzing while the current commit's attempt is pending", () => {
    const record = startAttempt(emptyRecord("o", "r", 1), { headSha: SHA_A, runUrl: null, now: T });
    expect(deriveLifecycle(open(SHA_A), record, NOW).status).toBe("analyzing");
  });

  it("treats a long-pending attempt as stalled", () => {
    const record = startAttempt(emptyRecord("o", "r", 1), { headSha: SHA_A, runUrl: null, now: T });
    const lifecycle = deriveLifecycle(open(SHA_A), record, Date.parse(T) + STALLED_AFTER_MS + 1);
    expect(lifecycle.status).toBe("failed");
    expect(lifecycle.error?.kind).toBe("stalled");
  });

  it("is ready when the latest analysis matches the head commit", () => {
    const record = completeAnalysis(emptyRecord("o", "r", 1), analysis(SHA_A, T));
    expect(deriveLifecycle(open(SHA_A), record, NOW)).toMatchObject({ status: "ready", isCurrent: true });
  });

  it("is outdated after new commits until the workflow starts", () => {
    const record = completeAnalysis(emptyRecord("o", "r", 1), analysis(SHA_A, T));
    expect(deriveLifecycle(open(SHA_B), record, NOW)).toMatchObject({ status: "outdated", isCurrent: false });
  });

  it("is failed when the current commit's analysis failed", () => {
    let record = completeAnalysis(emptyRecord("o", "r", 1), analysis(SHA_A, T));
    record = failAttempt(record, { headSha: SHA_B, runUrl: null, now: T, kind: "rate_limited", message: "Slow down" });
    expect(deriveLifecycle(open(SHA_B), record, NOW)).toMatchObject({ status: "failed", error: { kind: "rate_limited" } });
  });
});

describe("shouldPoll", () => {
  it("polls pending states for open PRs only", () => {
    expect(shouldPoll("analyzing", "open")).toBe(true);
    expect(shouldPoll("waiting", "draft")).toBe(true);
    expect(shouldPoll("ready", "open")).toBe(false);
    expect(shouldPoll("failed", "open")).toBe(false);
    expect(shouldPoll("outdated", "merged")).toBe(false);
  });
});
