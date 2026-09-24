import { isTestFile } from "./detection";

export type FileKind = "test" | "code" | "style" | "markup" | "data" | "config" | "doc" | "image" | "other";

export interface FileInfo {
  path: string;
  directory: string;
  name: string;
  extension: string;
  kind: FileKind;
}

const EXTENSION_KINDS: Record<string, FileKind> = {
  ts: "code", tsx: "code", js: "code", jsx: "code", mjs: "code", cjs: "code",
  py: "code", go: "code", rs: "code", java: "code", kt: "code", rb: "code",
  php: "code", cs: "code", swift: "code", c: "code", cpp: "code", h: "code",
  sql: "data", json: "data", csv: "data", prisma: "data", graphql: "data",
  css: "style", scss: "style", sass: "style", less: "style",
  html: "markup", vue: "markup", svelte: "markup", xml: "markup",
  yml: "config", yaml: "config", toml: "config", ini: "config", env: "config", lock: "config",
  md: "doc", mdx: "doc", txt: "doc", rst: "doc",
  png: "image", jpg: "image", jpeg: "image", gif: "image", svg: "image", webp: "image",
};

const CONFIG_NAMES = /^(dockerfile|makefile|\.gitignore|\.env.*|package\.json|tsconfig.*\.json)$/i;

export function describeFile(path: string): FileInfo {
  const normalized = path.replace(/\\/g, "/");
  const slash = normalized.lastIndexOf("/");
  const directory = slash >= 0 ? normalized.slice(0, slash + 1) : "";
  const name = slash >= 0 ? normalized.slice(slash + 1) : normalized;
  const dot = name.lastIndexOf(".");
  const extension = dot > 0 ? name.slice(dot + 1).toLowerCase() : "";

  let kind: FileKind = EXTENSION_KINDS[extension] ?? "other";
  if (CONFIG_NAMES.test(name)) kind = "config";
  if (isTestFile(normalized)) kind = "test";

  return { path, directory, name, extension, kind };
}

/** Splits free text (e.g. a pasted `git diff --name-only`) into unique paths. */
export function parseFileList(text: string): string[] {
  return [
    ...new Set(
      text
        .split(/[\r\n,]+/)
        .map((line) => line.trim().replace(/^[-*]\s+/, ""))
        .filter(Boolean),
    ),
  ];
}
