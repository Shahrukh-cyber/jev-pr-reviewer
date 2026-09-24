import { readJevConfig, requestJevDecision } from "@/lib/jev/client";
import { buildDecisionRequest } from "@/lib/jev/questions";
import { SAMPLE_JEV_RESPONSE } from "@/lib/jev/sample";
import type { AnalyzeFailure, AnalyzeSuccess } from "@/lib/review/api";
import {
  ANALYZE_ERROR_COPY,
  ANALYZE_ERROR_STATUS,
  type AnalyzeErrorKind,
} from "@/lib/review/errors";
import { isDemoContext, validatePrContext, type FieldErrors } from "@/lib/review/validation";

const NO_STORE = { "Cache-Control": "no-store" };

function failure(kind: AnalyzeErrorKind, fieldErrors?: FieldErrors) {
  const body: AnalyzeFailure = {
    ok: false,
    error: { kind, ...ANALYZE_ERROR_COPY[kind], ...(fieldErrors && { fieldErrors }) },
  };
  return Response.json(body, { status: ANALYZE_ERROR_STATUS[kind], headers: NO_STORE });
}

/**
 * POST /api/analyze
 * Validates PR context, forwards a structured decision request to Jev,
 * and returns Jev's raw response. The Jev API key never leaves the server.
 */
export async function POST(request: Request) {
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return failure("invalid_input", { form: "The request body must be JSON." });
  }

  const validation = validatePrContext(input);
  if (!validation.success) return failure("invalid_input", validation.fieldErrors);

  const decisionRequest = buildDecisionRequest(validation.data);

  const sample = (fallbackFrom?: AnalyzeErrorKind) => {
    const body: AnalyzeSuccess = {
      ok: true,
      source: "sample",
      raw: SAMPLE_JEV_RESPONSE,
      request: decisionRequest,
      durationMs: 0,
      receivedAt: new Date().toISOString(),
      ...(fallbackFrom && { fallbackFrom }),
    };
    return Response.json(body, { headers: NO_STORE });
  };

  if (process.env.JEV_USE_SAMPLE_RESPONSE === "true") return sample();

  const result = await requestJevDecision(decisionRequest, readJevConfig());
  if (!result.ok) {
    // Keep presentations deterministic: the unmodified demo PR falls back to the
    // documented example (labeled as such in the UI). Any other input reports the error.
    if (isDemoContext(validation.data)) return sample(result.kind);
    return failure(result.kind);
  }

  const body: AnalyzeSuccess = {
    ok: true,
    source: "jev",
    raw: result.raw,
    request: decisionRequest,
    durationMs: result.durationMs,
    receivedAt: new Date().toISOString(),
  };
  return Response.json(body, { headers: NO_STORE });
}
