import {
  File,
  FileCode,
  FileCog,
  FileImage,
  FileJson,
  FileText,
  FlaskConical,
  Palette,
  type LucideProps,
} from "lucide-react";
import type { FileKind } from "@/lib/review/files";

const ICONS: Record<FileKind, typeof File> = {
  test: FlaskConical,
  code: FileCode,
  style: Palette,
  markup: FileCode,
  data: FileJson,
  config: FileCog,
  doc: FileText,
  image: FileImage,
  other: File,
};

export function FileIcon({ kind, ...props }: { kind: FileKind } & LucideProps) {
  const Icon = ICONS[kind];
  return <Icon aria-hidden {...props} />;
}
