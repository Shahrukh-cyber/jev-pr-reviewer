"use client";

import { Check, ChevronRight, ChevronsDownUp, ChevronsUpDown, Copy } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

const TOKEN = {
  key: "text-[#0550ae] dark:text-[#79c0ff]",
  string: "text-[#116329] dark:text-[#7ee787]",
  number: "text-[#953800] dark:text-[#ffa657]",
  literal: "text-[#8250df] dark:text-[#d2a8ff]",
  punct: "text-fg-subtle",
};

function isContainer(value: unknown): value is Json[] | { [key: string]: Json } {
  return typeof value === "object" && value !== null;
}

function containerPaths(value: unknown, path = "$", out: string[] = []): string[] {
  if (!isContainer(value)) return out;
  out.push(path);
  for (const [key, child] of Object.entries(value)) containerPaths(child, `${path}.${key}`, out);
  return out;
}

function Primitive({ value }: { value: Json }) {
  if (typeof value === "string") return <span className={TOKEN.string}>{JSON.stringify(value)}</span>;
  if (typeof value === "number") return <span className={TOKEN.number}>{String(value)}</span>;
  return <span className={TOKEN.literal}>{String(value)}</span>;
}

interface NodeProps {
  name?: string;
  value: Json;
  path: string;
  depth: number;
  last: boolean;
  collapsed: Set<string>;
  onToggle: (path: string) => void;
}

function JsonNode({ name, value, path, depth, last, collapsed, onToggle }: NodeProps) {
  const indent = { paddingLeft: `${depth * 1.1 + 1.25}rem` };
  const comma = last ? null : <span className={TOKEN.punct}>,</span>;
  const label =
    name !== undefined ? (
      <>
        <span className={TOKEN.key}>{JSON.stringify(name)}</span>
        <span className={TOKEN.punct}>: </span>
      </>
    ) : null;

  if (!isContainer(value)) {
    return (
      <div style={indent} className="whitespace-pre">
        {label}
        <Primitive value={value} />
        {comma}
      </div>
    );
  }

  const isArray = Array.isArray(value);
  const entries: [string, Json][] = isArray
    ? value.map((child, index) => [String(index), child])
    : Object.entries(value);
  const [open, close] = isArray ? ["[", "]"] : ["{", "}"];
  const isCollapsed = collapsed.has(path);
  const summary = `${entries.length} ${isArray ? (entries.length === 1 ? "item" : "items") : entries.length === 1 ? "key" : "keys"}`;

  if (entries.length === 0) {
    return (
      <div style={indent} className="whitespace-pre">
        {label}
        <span className={TOKEN.punct}>{open + close}</span>
        {comma}
      </div>
    );
  }

  return (
    <div>
      <div style={indent} className="relative whitespace-pre">
        <button
          type="button"
          onClick={() => onToggle(path)}
          aria-expanded={!isCollapsed}
          aria-label={`${isCollapsed ? "Expand" : "Collapse"} ${name ?? "root"}`}
          className="absolute top-1/2 grid size-4 -translate-x-[1.15rem] -translate-y-1/2 place-items-center rounded text-fg-subtle hover:bg-surface-3 hover:text-fg"
        >
          <ChevronRight aria-hidden className={cn("size-3 transition-transform", !isCollapsed && "rotate-90")} />
        </button>
        {label}
        <span className={TOKEN.punct}>{open}</span>
        {isCollapsed && (
          <>
            <button
              type="button"
              onClick={() => onToggle(path)}
              className="mx-1 rounded bg-surface-3 px-1.5 text-[11px] text-fg-muted hover:text-fg"
            >
              {summary}
            </button>
            <span className={TOKEN.punct}>{close}</span>
            {comma}
          </>
        )}
      </div>
      {!isCollapsed && (
        <>
          {entries.map(([key, child], index) => (
            <JsonNode
              key={key}
              name={isArray ? undefined : key}
              value={child}
              path={`${path}.${key}`}
              depth={depth + 1}
              last={index === entries.length - 1}
              collapsed={collapsed}
              onToggle={onToggle}
            />
          ))}
          <div style={indent} className="whitespace-pre">
            <span className={TOKEN.punct}>{close}</span>
            {comma}
          </div>
        </>
      )}
    </div>
  );
}

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
    setTimeout(() => setStatus("idle"), 1800);
  };
  return (
    <Button size="sm" variant="ghost" onClick={copy} aria-label={`${label} JSON`}>
      {status === "copied" ? <Check aria-hidden className="text-risk-low" /> : <Copy aria-hidden />}
      <span aria-live="polite">{status === "copied" ? "Copied" : status === "failed" ? "Copy failed" : label}</span>
    </Button>
  );
}

interface JsonViewerProps {
  value: unknown;
  label: string;
  className?: string;
  /** Paths (e.g. "$.questions") collapsed initially. */
  initiallyCollapsed?: string[];
}

export function JsonViewer({ value, label, className, initiallyCollapsed = [] }: JsonViewerProps) {
  const [collapsed, setCollapsed] = useState(() => new Set(initiallyCollapsed));
  const text = useMemo(() => JSON.stringify(value, null, 2), [value]);
  const allPaths = useMemo(() => containerPaths(value).filter((path) => path !== "$"), [value]);

  const toggle = useCallback((path: string) => {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  return (
    <div className={cn("overflow-hidden rounded-lg border border-line bg-surface-2/50", className)}>
      <div className="flex items-center justify-between gap-2 border-b border-line bg-surface px-2 py-1.5">
        <span className="px-1.5 font-mono text-[11px] text-fg-subtle">{label}</span>
        <div className="flex items-center gap-0.5">
          <Button size="sm" variant="ghost" onClick={() => setCollapsed(new Set())} aria-label="Expand all">
            <ChevronsUpDown aria-hidden />
            <span className="hidden sm:inline">Expand</span>
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setCollapsed(new Set(allPaths))} aria-label="Collapse all">
            <ChevronsDownUp aria-hidden />
            <span className="hidden sm:inline">Collapse</span>
          </Button>
          <CopyButton text={text} />
        </div>
      </div>
      <div
        role="region"
        aria-label={label}
        tabIndex={0}
        className="max-h-[28rem] overflow-auto py-3 pr-4 font-mono text-[12.5px] leading-6"
      >
        <JsonNode value={value as Json} path="$" depth={0} last collapsed={collapsed} onToggle={toggle} />
      </div>
    </div>
  );
}
