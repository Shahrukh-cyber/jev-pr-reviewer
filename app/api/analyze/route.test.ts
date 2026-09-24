import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SAMPLE_JEV_RESPONSE } from "@/lib/jev/sample";
import type { AnalyzeResponse } from "@/lib/review/api";
import { DEMO_FORM, formValuesToInput } from "@/lib/review/validation";
import { POST } from "./route";

const post = (body: unknown) =>
  POST(
    new Request("http://localhost/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("POST /api/analyze", () => {
  it("rejects invalid JSON", async () => {
    const response = await post("{not json");
    expect(response.status).toBe(400);
    const body = (await response.json()) as AnalyzeResponse;
    expect(!body.ok && body.error.kind).toBe("invalid_input");
  });

  it("returns field errors for invalid context", async () => {
    const response = await post({ ...formValuesToInput(DEMO_FORM), title: "" });
    expect(response.status).toBe(400);
    const body = (await response.json()) as AnalyzeResponse;
    expect(!body.ok && body.error.fieldErrors?.title).toBeTruthy();
  });

  it("returns a labeled sample response in sample mode without calling Jev", async () => {
    vi.stubEnv("JEV_USE_SAMPLE_RESPONSE", "true");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const response = await post(formValuesToInput(DEMO_FORM));
    const body = (await response.json()) as AnalyzeResponse;
    expect(body.ok && body.source).toBe("sample");
    expect(body.ok && body.raw).toEqual(SAMPLE_JEV_RESPONSE);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("proxies Jev's raw response unmodified", async () => {
    vi.stubEnv("JEV_USE_SAMPLE_RESPONSE", "false");
    vi.stubEnv("JEV_API_KEY", "k");
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(SAMPLE_JEV_RESPONSE)));

    const response = await post(formValuesToInput(DEMO_FORM));
    const body = (await response.json()) as AnalyzeResponse;
    expect(response.status).toBe(200);
    expect(body.ok && body.source).toBe("jev");
    expect(body.ok && body.raw).toEqual(SAMPLE_JEV_RESPONSE);
    expect(body.ok && body.request.state.pr_title).toBe("Fix JWT refresh bug");
  });

  it("hides upstream error details", async () => {
    vi.stubEnv("JEV_USE_SAMPLE_RESPONSE", "false");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("stack trace: db password=hunter2", { status: 500 })),
    );

    const response = await post({ ...formValuesToInput(DEMO_FORM), title: "Add billing export" });
    expect(response.status).toBe(502);
    const text = await response.text();
    expect(text).not.toContain("hunter2");
    expect(JSON.parse(text).error.kind).toBe("upstream_error");
  });

  it("falls back to the labeled example response for the unmodified demo PR when Jev fails", async () => {
    vi.stubEnv("JEV_USE_SAMPLE_RESPONSE", "false");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 429 })));

    const response = await post(formValuesToInput(DEMO_FORM));
    const body = (await response.json()) as AnalyzeResponse;
    expect(response.status).toBe(200);
    expect(body.ok && body.source).toBe("sample");
    expect(body.ok && body.fallbackFrom).toBe("rate_limited");
  });
});
