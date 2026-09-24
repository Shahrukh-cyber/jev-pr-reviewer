import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEMO_FORM, formValuesToInput, validatePrContext } from "@/lib/review/validation";
import { readJevConfig, requestJevDecision, type JevClientConfig } from "./client";
import { buildDecisionRequest } from "./questions";
import { SAMPLE_JEV_RESPONSE } from "./sample";
import { parseJevResponse } from "./schema";

const validation = validatePrContext(formValuesToInput(DEMO_FORM));
if (!validation.success) throw new Error("demo should be valid");
const body = buildDecisionRequest(validation.data);
const config: JevClientConfig = { url: "https://jev.test/decisions", apiKey: "secret-key", timeoutMs: 1000 };

const jsonResponse = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("parseJevResponse", () => {
  it("accepts the documented response", () => {
    const result = parseJevResponse(SAMPLE_JEV_RESPONSE);
    expect(result.ok).toBe(true);
  });

  it("does not mutate the raw value", () => {
    const raw = structuredClone(SAMPLE_JEV_RESPONSE);
    parseJevResponse(raw);
    expect(raw).toEqual(SAMPLE_JEV_RESPONSE);
  });

  it.each([
    ["null", null],
    ["missing data", { code: 0, message: "ok" }],
    ["missing answer", { code: 0, message: "ok", data: { answers: { type: SAMPLE_JEV_RESPONSE.data.answers.type } } }],
    [
      "probability > 1",
      {
        ...SAMPLE_JEV_RESPONSE,
        data: {
          answers: {
            ...SAMPLE_JEV_RESPONSE.data.answers,
            needs_tests: { type: "noul", noul: 1.4 },
          },
        },
      },
    ],
    [
      "string score",
      {
        ...SAMPLE_JEV_RESPONSE,
        data: {
          answers: {
            ...SAMPLE_JEV_RESPONSE.data.answers,
            risk: { ...SAMPLE_JEV_RESPONSE.data.answers.risk, score: "1.84" },
          },
        },
      },
    ],
  ])("rejects malformed payloads: %s", (_name, raw) => {
    const result = parseJevResponse(raw);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("invalid_shape");
  });

  it("rejects a non-zero Jev code", () => {
    const result = parseJevResponse({ ...SAMPLE_JEV_RESPONSE, code: -1, message: "nope" });
    expect(!result.ok && result.reason).toBe("not_ok");
  });
});

describe("requestJevDecision", () => {
  it("posts the decision request with a bearer token and returns the raw body", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(SAMPLE_JEV_RESPONSE));
    const result = await requestJevDecision(body, config, fetchImpl);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.raw).toEqual(SAMPLE_JEV_RESPONSE);

    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(config.url);
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer secret-key");
    expect(JSON.parse(init.body as string)).toEqual(body);
  });

  it("omits the Authorization header when no key is configured", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(SAMPLE_JEV_RESPONSE));
    await requestJevDecision(body, { ...config, apiKey: undefined }, fetchImpl);
    const [, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(init.headers).not.toHaveProperty("Authorization");
  });

  it.each([
    [401, "unauthorized"],
    [403, "unauthorized"],
    [429, "rate_limited"],
    [500, "upstream_error"],
    [503, "upstream_error"],
  ])("maps HTTP %i to %s", async (status, kind) => {
    const result = await requestJevDecision(body, config, async () =>
      jsonResponse({ code: -1, message: "error", data: null }, status),
    );
    expect(result).toEqual({ ok: false, kind, status });
  });

  it("maps invalid JSON to malformed_response", async () => {
    const result = await requestJevDecision(body, config, async () => new Response("<html>oops</html>"));
    expect(!result.ok && result.kind).toBe("malformed_response");
  });

  it("maps a well-formed but wrongly-shaped body to malformed_response", async () => {
    const result = await requestJevDecision(body, config, async () => jsonResponse({ hello: "world" }));
    expect(!result.ok && result.kind).toBe("malformed_response");
  });

  it("maps a 200 with a non-zero Jev code to upstream_error", async () => {
    const result = await requestJevDecision(body, config, async () =>
      jsonResponse({ ...SAMPLE_JEV_RESPONSE, code: 7, message: "busy" }),
    );
    expect(!result.ok && result.kind).toBe("upstream_error");
  });

  it("maps timeouts to timeout", async () => {
    const result = await requestJevDecision(body, config, async () => {
      throw new DOMException("The operation timed out.", "TimeoutError");
    });
    expect(result).toEqual({ ok: false, kind: "timeout" });
  });

  it("maps network failures to unreachable", async () => {
    const result = await requestJevDecision(body, config, async () => {
      throw new TypeError("fetch failed");
    });
    expect(result).toEqual({ ok: false, kind: "unreachable" });
  });

  it("never logs the API key", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await requestJevDecision(body, config, async () => jsonResponse({}, 500));
    expect(JSON.stringify(spy.mock.calls)).not.toContain("secret-key");
  });
});

describe("readJevConfig", () => {
  it("uses defaults and trims values", () => {
    expect(readJevConfig({} as NodeJS.ProcessEnv)).toEqual({
      url: "https://www.jevai.org/api/v1/decisions",
      apiKey: undefined,
      timeoutMs: 30_000,
    });
    expect(
      readJevConfig({ JEV_API_KEY: "  k  ", JEV_TIMEOUT_MS: "500" } as unknown as NodeJS.ProcessEnv),
    ).toMatchObject({ apiKey: "k", timeoutMs: 500 });
  });
});
