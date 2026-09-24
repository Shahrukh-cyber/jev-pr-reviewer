import { FolderGit2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { describeFile } from "@/lib/review/files";
import { FileIcon } from "./file-icon";

export function ChangedFiles({ files, total, truncated = false }: { files: string[]; total: number; truncated?: boolean }) {
  const unlisted = Math.max(0, total - files.length);
  return (
    <Card aria-labelledby="files-title" className="flex min-w-0 flex-col motion-safe:animate-rise" style={{ animationDelay: "300ms" }}>
      <CardHeader
        id="files-title"
        icon={<FolderGit2 />}
        title="Changed Files"
        description={`${files.length} listed${unlisted ? ` · ${unlisted} more not listed${truncated ? " (GitHub/storage limit)" : ""}` : ""}`}
      />
      <ul className="mt-4 max-h-72 flex-1 overflow-y-auto border-t border-line">
        {files.map((path) => {
          const file = describeFile(path);
          return (
            <li key={path} className="flex items-center gap-2.5 border-b border-line px-5 py-2.5 last:border-b-0">
              <FileIcon kind={file.kind} className="size-4 shrink-0 text-fg-subtle" />
              <span className="min-w-0 flex-1 truncate font-mono text-[12.5px]" title={path}>
                <span className="text-fg-subtle">{file.directory}</span>
                <span className="font-medium text-fg">{file.name}</span>
              </span>
              {file.kind === "test" ? (
                <Badge tone="low">test</Badge>
              ) : (
                file.extension && <Badge className="font-mono">.{file.extension}</Badge>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
