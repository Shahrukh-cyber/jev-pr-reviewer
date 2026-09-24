export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** 0.856 → 86 */
export function toPercent(probability: number): number {
  return Math.round(clamp(probability, 0, 1) * 100);
}

export function formatPercent(probability: number): string {
  return `${toPercent(probability)}%`;
}

/** Formats a raw number the way it appears in JSON, trimmed to at most 4 decimals. */
export function formatRaw(value: number): string {
  return String(Number(value.toFixed(4)));
}

export function titleCase(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function formatDuration(ms: number): string {
  return ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(1)} s`;
}
