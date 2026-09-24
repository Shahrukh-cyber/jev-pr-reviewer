export type AnalyzeErrorKind =
  | "invalid_input"
  | "unauthorized"
  | "rate_limited"
  | "timeout"
  | "unreachable"
  | "upstream_error"
  | "malformed_response"
  | "client_network";

export interface AnalyzeErrorCopy {
  title: string;
  message: string;
  retryable: boolean;
}

/** User-facing copy. Deliberately free of upstream error details. */
export const ANALYZE_ERROR_COPY: Record<AnalyzeErrorKind, AnalyzeErrorCopy> = {
  invalid_input: {
    title: "Check the Pull Request context",
    message: "Some fields are missing or invalid. Fix the highlighted fields and try again.",
    retryable: false,
  },
  unauthorized: {
    title: "Jev rejected the request credentials",
    message:
      "The server's Jev API key is missing or invalid. Set JEV_API_KEY in the server environment and restart.",
    retryable: false,
  },
  rate_limited: {
    title: "Jev is rate limiting requests",
    message: "Too many requests were sent in a short period. Wait a moment and try again.",
    retryable: true,
  },
  timeout: {
    title: "Jev took too long to respond",
    message: "The decision request timed out before Jev replied. Try again.",
    retryable: true,
  },
  unreachable: {
    title: "Unable to analyze this Pull Request",
    message: "Jev could not be reached right now.",
    retryable: true,
  },
  upstream_error: {
    title: "Unable to analyze this Pull Request",
    message: "Jev returned an error while building the decision.",
    retryable: true,
  },
  malformed_response: {
    title: "Jev's response couldn't be read",
    message:
      "The decision didn't match the expected structure, so it wasn't rendered. Try again.",
    retryable: true,
  },
  client_network: {
    title: "Unable to reach the review server",
    message: "Check your connection and try again.",
    retryable: true,
  },
};

export const ANALYZE_ERROR_STATUS: Record<AnalyzeErrorKind, number> = {
  invalid_input: 400,
  unauthorized: 502,
  rate_limited: 429,
  timeout: 504,
  unreachable: 502,
  upstream_error: 502,
  malformed_response: 502,
  client_network: 0,
};

export function isAnalyzeErrorKind(value: unknown): value is AnalyzeErrorKind {
  return typeof value === "string" && value in ANALYZE_ERROR_COPY;
}
