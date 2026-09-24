import type { AnalyzeErrorKind } from "@/lib/review/errors";
import { parseJevResponse } from "./schema";
import type { JevDecisionRequest, JevDecisionResponse } from "./types";

/** Server-only: this module reads credentials and must never be imported by client components. */

export interface JevClientConfig {
  url: string;
  apiKey?: string;
  timeoutMs: number;
}

export const DEFAULT_JEV_API_URL = "https://www.jevai.org/api/v1/decisions";
export const DEFAULT_TIMEOUT_MS = 30_000;

export function readJevConfig(env: NodeJS.ProcessEnv = process.env): JevClientConfig {
  const timeout = Number(env.JEV_TIMEOUT_MS);
  return {
    url: env.JEV_API_URL?.trim() || DEFAULT_JEV_API_URL,
    apiKey: env.JEV_API_KEY?.trim() || undefined,
    timeoutMs: Number.isFinite(timeout) && timeout > 0 ? timeout : DEFAULT_TIMEOUT_MS,
  };
}

export type JevCallResult =
  | {
      ok: true;
      /** The response body exactly as Jev returned it. */
      raw: unknown;
      decision: JevDecisionResponse;
      durationMs: number;
    }
  | {
      ok: false;
      kind: Exclude<AnalyzeErrorKind, "invalid_input" | "client_network">;
      status?: number;
      /** Server-suggested wait before retrying (from Retry-After), when provided. */
      retryAfterMs?: number;
    };

export interface RetryOptions {
  /** Total attempts including the first (default 1: no retries). */
  attempts?: number;
  /** Base delay for exponential backoff (default 2000 ms). */
  baseDelayMs?: number;
  sleep?: (ms: number) => Promise<void>;
  onRetry?: (info: { attempt: number; kind: string; delayMs: number }) => void;
}

const RETRYABLE = new Set(["rate_limited", "timeout", "unreachable", "upstream_error"]);
const MAX_RETRY_DELAY_MS = 30_000;

function parseRetryAfter(value: string | null): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, date - Date.now()) : undefined;
}

type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

function log(event: string, details: Record<string, unknown>) {
  // Details never include the API key or request headers.
  console.error(`[jev] ${event}`, details);
}

function isAbortLike(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === "TimeoutError" || error.name === "AbortError")
  );
}

/**
 * Calls Jev, optionally retrying transient failures (429, 5xx, timeouts,
 * network errors) with exponential backoff that honors Retry-After.
 */
export async function requestJevDecision(
  body: JevDecisionRequest,
  config: JevClientConfig,
  fetchImpl: FetchLike = fetch,
  retry: RetryOptions = {},
): Promise<JevCallResult> {
  const attempts = Math.max(1, retry.attempts ?? 1);
  const sleep = retry.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  let result = await requestOnce(body, config, fetchImpl);
  for (let attempt = 2; attempt <= attempts && !result.ok && RETRYABLE.has(result.kind); attempt++) {
    const backoff = (retry.baseDelayMs ?? 2000) * 2 ** (attempt - 2);
    const delayMs = Math.min(MAX_RETRY_DELAY_MS, result.retryAfterMs ?? backoff);
    retry.onRetry?.({ attempt, kind: result.kind, delayMs });
    await sleep(delayMs);
    result = await requestOnce(body, config, fetchImpl);
  }
  return result;
}

async function requestOnce(
  body: JevDecisionRequest,
  config: JevClientConfig,
  fetchImpl: FetchLike,
): Promise<JevCallResult> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (config.apiKey) headers.Authorization = `Bearer ${config.apiKey}`;

  const startedAt = performance.now();
  let response: Response;
  try {
    response = await fetchImpl(config.url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(config.timeoutMs),
      cache: "no-store",
    });
  } catch (error) {
    if (isAbortLike(error)) {
      log("timeout", { timeoutMs: config.timeoutMs });
      return { ok: false, kind: "timeout" };
    }
    log("unreachable", { error: error instanceof Error ? error.message : String(error) });
    return { ok: false, kind: "unreachable" };
  }

  let text: string;
  try {
    text = await response.text();
  } catch (error) {
    if (isAbortLike(error)) {
      log("timeout", { timeoutMs: config.timeoutMs, phase: "body" });
      return { ok: false, kind: "timeout" };
    }
    log("unreachable", { phase: "body", status: response.status });
    return { ok: false, kind: "unreachable" };
  }
  const durationMs = Math.round(performance.now() - startedAt);

  if (!response.ok) {
    log("http_error", { status: response.status, body: text.slice(0, 300), durationMs });
    if (response.status === 401 || response.status === 403) {
      return { ok: false, kind: "unauthorized", status: response.status };
    }
    if (response.status === 429) {
      return {
        ok: false,
        kind: "rate_limited",
        status: response.status,
        retryAfterMs: parseRetryAfter(response.headers.get("retry-after")),
      };
    }
    return { ok: false, kind: "upstream_error", status: response.status };
  }

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    log("malformed_json", { status: response.status, body: text.slice(0, 300) });
    return { ok: false, kind: "malformed_response", status: response.status };
  }

  const parsed = parseJevResponse(raw);
  if (!parsed.ok) {
    log(parsed.reason === "not_ok" ? "not_ok" : "invalid_shape", {
      issues: parsed.issues.slice(0, 10),
    });
    return {
      ok: false,
      kind: parsed.reason === "not_ok" ? "upstream_error" : "malformed_response",
      status: response.status,
    };
  }

  return { ok: true, raw, decision: parsed.decision, durationMs };
}
