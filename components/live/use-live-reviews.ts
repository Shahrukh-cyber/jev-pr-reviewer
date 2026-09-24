"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LiveErrorResponse, PullListResponse, PullReviewResponse, ReviewedRepository } from "@/lib/reviews/api";
import { shouldPoll, type ReviewStatus } from "@/lib/reviews/lifecycle";

/** Polling cadence. Without a server GITHUB_TOKEN, GitHub allows only 60 requests/hour. */
const DETAIL_POLL_MS = { authenticated: 10_000, anonymous: 60_000 };
const LIST_POLL_MS = { authenticated: 30_000, anonymous: null };
/** Stop polling a pending review after this long; the user can refresh manually. */
export const MAX_POLL_MS = 15 * 60_000;

export type LiveError = LiveErrorResponse["error"];

export type ListState =
  | { status: "loading" }
  | { status: "ready"; data: PullListResponse }
  | { status: "error"; error: LiveError };

export type DetailState =
  | { number: number | null; status: "loading" }
  | { number: number; status: "ready"; data: PullReviewResponse; checkedAt: number; pollingStopped: boolean }
  | { number: number; status: "error"; error: LiveError };

const NETWORK_ERROR: LiveError = {
  kind: "unavailable",
  title: "Unable to reach the review server",
  message: "Check your connection and try again.",
};

async function fetchJson<T extends { ok: true }>(url: string, signal: AbortSignal): Promise<T | LiveErrorResponse> {
  try {
    const response = await fetch(url, { signal, cache: "no-store" });
    const body = (await response.json()) as T | LiveErrorResponse;
    if (typeof body === "object" && body !== null && "ok" in body) return body;
    return { ok: false, error: NETWORK_ERROR };
  } catch (error) {
    if (signal.aborted) throw error;
    return { ok: false, error: NETWORK_ERROR };
  }
}

const hidden = () => typeof document !== "undefined" && document.visibilityState === "hidden";

export function useLiveReviews(repository: ReviewedRepository | null, initialPr: number | null, active: boolean) {
  const [list, setList] = useState<ListState>({ status: "loading" });
  const [selected, setSelected] = useState<number | null>(initialPr);
  const [detail, setDetail] = useState<DetailState>({ number: initialPr, status: "loading" });
  const [listNonce, setListNonce] = useState(0);
  const [detailNonce, setDetailNonce] = useState(0);
  const lastStatus = useRef<ReviewStatus | null>(null);

  const base = repository
    ? `/api/reviews/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.name)}`
    : null;

  // Pull list (+ light polling so newly opened PRs appear on their own).
  useEffect(() => {
    if (!active || !base) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;

    const load = async () => {
      if (hidden()) {
        timer = setTimeout(load, 5_000);
        return;
      }
      let result: PullListResponse | LiveErrorResponse;
      try {
        result = await fetchJson<PullListResponse>(base, controller.signal);
      } catch {
        return; // aborted
      }
      if (result.ok) {
        setList({ status: "ready", data: result });
        setSelected((current) => current ?? result.pulls[0]?.pull.number ?? null);
        const interval = result.authenticated ? LIST_POLL_MS.authenticated : LIST_POLL_MS.anonymous;
        if (interval) timer = setTimeout(load, interval);
      } else {
        setList({ status: "error", error: result.error });
      }
    };
    load();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [active, base, listNonce]);

  // Selected PR detail, polled while its review is pending.
  useEffect(() => {
    if (!active || !base || selected === null) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const startedAt = Date.now();

    const load = async () => {
      if (hidden()) {
        timer = setTimeout(load, 5_000);
        return;
      }
      let result: PullReviewResponse | LiveErrorResponse;
      try {
        result = await fetchJson<PullReviewResponse>(`${base}/${selected}`, controller.signal);
      } catch {
        return; // aborted
      }
      if (!result.ok) {
        setDetail({ number: selected, status: "error", error: result.error });
        return;
      }

      const status = result.lifecycle.status;
      // Keep the list's status badges in step with the detail view.
      if (lastStatus.current !== null && lastStatus.current !== status) setListNonce((n) => n + 1);
      lastStatus.current = status;

      const poll = shouldPoll(status, result.pull.state);
      const expired = Date.now() - startedAt > MAX_POLL_MS;
      setDetail({ number: selected, status: "ready", data: result, checkedAt: Date.now(), pollingStopped: poll && expired });
      if (poll && !expired) {
        timer = setTimeout(load, result.authenticated ? DETAIL_POLL_MS.authenticated : DETAIL_POLL_MS.anonymous);
      }
    };
    load();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [active, base, selected, detailNonce]);

  const select = useCallback((number: number) => {
    lastStatus.current = null;
    setSelected(number);
    setDetail({ number, status: "loading" });
  }, []);

  const refresh = useCallback(() => {
    setListNonce((n) => n + 1);
    setDetailNonce((n) => n + 1);
  }, []);

  // A detail state for a different PR than the selected one means it's still loading.
  const current: DetailState = detail.number === selected ? detail : { number: selected, status: "loading" };

  return { list, selected, detail: current, select, refresh };
}
