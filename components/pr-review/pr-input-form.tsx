"use client";

import {
  CircleAlert,
  Database,
  FlaskConical,
  GitPullRequest,
  KeyRound,
  Plus,
  RotateCcw,
  Wand2,
  X,
} from "lucide-react";
import { useState, type ClipboardEvent, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { SwitchRow } from "@/components/ui/switch";
import { cn } from "@/lib/cn";
import { describeFile, parseFileList } from "@/lib/review/files";
import { LIMITS, type FieldErrors, type PrContextField, type PrFormValues } from "@/lib/review/validation";
import { AnalysisButton } from "./analysis-button";
import { FileIcon } from "./file-icon";

export const FIELD_IDS: Record<PrContextField, string> = {
  title: "pr-title",
  description: "pr-description",
  changedFiles: "pr-file-input",
  filesChanged: "pr-files-changed",
  linesAdded: "pr-lines-added",
  linesRemoved: "pr-lines-removed",
  testsAdded: "pr-tests-added",
  hasAuthenticationChanges: "pr-auth-changes",
  hasDatabaseChanges: "pr-db-changes",
};

const inputClasses = (invalid: boolean) =>
  cn(
    "block w-full rounded-lg border bg-surface px-3 text-sm text-fg shadow-card transition-colors placeholder:text-fg-subtle/80 focus:outline-none focus-visible:outline-none focus:ring-3",
    invalid
      ? "border-risk-critical/60 focus:border-risk-critical focus:ring-risk-critical/15"
      : "border-line hover:border-line-strong focus:border-accent focus:ring-accent/15",
  );

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 flex items-center gap-1 text-xs text-[var(--risk-critical-text)]">
      <CircleAlert aria-hidden className="size-3.5 shrink-0" />
      {message}
    </p>
  );
}

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-[13px] font-medium text-fg">
          {label}
        </label>
        {hint && <span className="text-[11px] text-fg-subtle tabular-nums">{hint}</span>}
      </div>
      {children}
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

function NumberField({
  id,
  label,
  value,
  onChange,
  error,
  prefix,
  prefixClass,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  prefix?: string;
  prefixClass?: string;
}) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-medium text-fg">
        {label}
      </label>
      <div className="relative">
        {prefix && (
          <span aria-hidden className={cn("pointer-events-none absolute inset-y-0 left-3 grid place-items-center font-mono text-sm", prefixClass)}>
            {prefix}
          </span>
        )}
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cn(inputClasses(Boolean(error)), "h-9 font-mono tabular-nums", prefix && "pl-7")}
        />
      </div>
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

function ChangedFilesEditor({
  files,
  onChange,
  error,
}: {
  files: string[];
  onChange: (files: string[]) => void;
  error?: string;
}) {
  const [draft, setDraft] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const inputId = FIELD_IDS.changedFiles;

  const add = (paths: string[]) => {
    const fresh = paths.filter((path) => !files.includes(path));
    if (paths.length > 0 && fresh.length === 0) {
      setNote("That file is already listed.");
      return;
    }
    if (files.length + fresh.length > LIMITS.filesMax) {
      setNote(`List at most ${LIMITS.filesMax} files.`);
      return;
    }
    setNote(null);
    if (fresh.length > 0) onChange([...files, ...fresh]);
    setDraft("");
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !(event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      add(parseFileList(draft));
    } else if (event.key === "Backspace" && draft === "" && files.length > 0) {
      onChange(files.slice(0, -1));
    }
  };

  const onPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const text = event.clipboardData.getData("text");
    if (/[\r\n]/.test(text)) {
      event.preventDefault();
      add(parseFileList(text));
    }
  };

  const describedBy = [`${inputId}-hint`, error && `${inputId}-error`].filter(Boolean).join(" ");

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <label htmlFor={inputId} className="text-[13px] font-medium text-fg">
          Changed files
        </label>
        <span className="text-[11px] text-fg-subtle tabular-nums">
          {files.length} {files.length === 1 ? "file" : "files"}
        </span>
      </div>
      <div
        className={cn(
          "overflow-hidden rounded-lg border bg-surface shadow-card",
          error ? "border-risk-critical/60" : "border-line",
        )}
      >
        {files.length > 0 && (
          <ul aria-label="Changed files" className="max-h-52 divide-y divide-line overflow-y-auto">
            {files.map((path) => {
              const file = describeFile(path);
              return (
                <li key={path} className="group flex items-center gap-2 py-1.5 pr-1.5 pl-3">
                  <FileIcon kind={file.kind} className="size-3.5 shrink-0 text-fg-subtle" />
                  <span className="min-w-0 flex-1 truncate font-mono text-xs" title={path}>
                    <span className="text-fg-subtle">{file.directory}</span>
                    <span className="text-fg">{file.name}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => onChange(files.filter((item) => item !== path))}
                    aria-label={`Remove ${path}`}
                    className="grid size-6 shrink-0 place-items-center rounded-md text-fg-subtle hover:bg-surface-2 hover:text-fg"
                  >
                    <X aria-hidden className="size-3.5" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <div className={cn("flex items-center gap-1.5 p-1.5", files.length > 0 && "border-t border-line")}>
          <input
            id={inputId}
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              setNote(null);
            }}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
            placeholder="path/to/changed-file.ts"
            autoComplete="off"
            spellCheck={false}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className="h-8 min-w-0 flex-1 rounded-md bg-transparent px-2 font-mono text-xs text-fg placeholder:text-fg-subtle/80 focus:bg-surface-2 focus:outline-none"
          />
          <Button size="sm" onClick={() => add(parseFileList(draft))} disabled={draft.trim() === ""} aria-label="Add file">
            <Plus aria-hidden />
            Add
          </Button>
        </div>
      </div>
      <p id={`${inputId}-hint`} className="mt-1.5 text-[11px] text-fg-subtle">
        {note ?? "Press Enter to add. Paste a multi-line list (e.g. git diff --name-only) to add many."}
      </p>
      <FieldError id={`${inputId}-error`} message={error} />
    </div>
  );
}

interface PrInputFormProps {
  values: PrFormValues;
  errors: FieldErrors;
  isAnalyzing: boolean;
  onChange: (patch: Partial<PrFormValues>) => void;
  onLoadDemo: () => void;
  onClear: () => void;
  onSubmit: () => void;
}

export function PrInputForm({ values, errors, isAnalyzing, onChange, onLoadDemo, onClear, onSubmit }: PrInputFormProps) {
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      onSubmit();
    }
  };

  const setFiles = (changedFiles: string[]) => {
    const previousCount = values.changedFiles.length;
    const current = Number(values.filesChanged);
    // Keep "files changed" in sync while it mirrors the list, and never below it.
    const linked = values.filesChanged.trim() === "" || current === previousCount;
    const filesChanged =
      linked || current < changedFiles.length ? String(changedFiles.length) : values.filesChanged;
    onChange({ changedFiles, filesChanged });
  };

  return (
    <Card aria-labelledby="pr-form-title" className="relative">
      <CardHeader
        id="pr-form-title"
        as="h2"
        icon={<GitPullRequest />}
        title="Pull Request Context"
        description="The signals Jev will evaluate."
        action={
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" onClick={onClear} aria-label="Clear form" title="Clear form">
              <RotateCcw aria-hidden />
            </Button>
            <Button size="sm" onClick={onLoadDemo}>
              <Wand2 aria-hidden />
              Load Demo PR
            </Button>
          </div>
        }
      />
      <form noValidate onSubmit={handleSubmit} onKeyDown={onKeyDown} aria-describedby={errors.form ? "pr-form-error" : undefined}>
        <fieldset disabled={isAnalyzing} className="space-y-5 px-5 pt-5 pb-5">
          <legend className="sr-only">Pull Request details</legend>
          <Field
            id={FIELD_IDS.title}
            label="PR title"
            error={errors.title}
            hint={values.title.length > LIMITS.titleMax - 40 ? `${values.title.length}/${LIMITS.titleMax}` : undefined}
          >
            <input
              id={FIELD_IDS.title}
              value={values.title}
              onChange={(event) => onChange({ title: event.target.value })}
              placeholder="e.g. Handle expired sessions during token refresh"
              autoComplete="off"
              aria-invalid={errors.title ? true : undefined}
              aria-describedby={errors.title ? `${FIELD_IDS.title}-error` : undefined}
              className={cn(inputClasses(Boolean(errors.title)), "h-9")}
            />
          </Field>

          <Field id={FIELD_IDS.description} label="Description" error={errors.description}>
            <textarea
              id={FIELD_IDS.description}
              value={values.description}
              onChange={(event) => onChange({ description: event.target.value })}
              placeholder="What does this change do, and why?"
              rows={3}
              aria-invalid={errors.description ? true : undefined}
              aria-describedby={errors.description ? `${FIELD_IDS.description}-error` : undefined}
              className={cn(inputClasses(Boolean(errors.description)), "min-h-20 resize-y py-2 leading-6")}
            />
          </Field>

          <ChangedFilesEditor files={values.changedFiles} onChange={setFiles} error={errors.changedFiles} />

          <div>
            <p className="mb-2 text-[11px] font-medium tracking-[0.06em] text-fg-subtle uppercase">PR metrics</p>
            <div className="grid grid-cols-3 gap-2.5">
              <NumberField
                id={FIELD_IDS.filesChanged}
                label="Files"
                value={values.filesChanged}
                onChange={(filesChanged) => onChange({ filesChanged })}
                error={errors.filesChanged}
              />
              <NumberField
                id={FIELD_IDS.linesAdded}
                label="Added"
                value={values.linesAdded}
                onChange={(linesAdded) => onChange({ linesAdded })}
                error={errors.linesAdded}
                prefix="+"
                prefixClass="text-diff-add"
              />
              <NumberField
                id={FIELD_IDS.linesRemoved}
                label="Removed"
                value={values.linesRemoved}
                onChange={(linesRemoved) => onChange({ linesRemoved })}
                error={errors.linesRemoved}
                prefix="−"
                prefixClass="text-diff-del"
              />
            </div>
          </div>

          <div>
            <p className="mb-1 text-[11px] font-medium tracking-[0.06em] text-fg-subtle uppercase">Repository signals</p>
            <div className="divide-y divide-line">
              <SwitchRow
                id={FIELD_IDS.testsAdded}
                label="Tests added"
                icon={<FlaskConical />}
                checked={values.testsAdded}
                onCheckedChange={(testsAdded) => onChange({ testsAdded })}
              />
              <SwitchRow
                id={FIELD_IDS.hasAuthenticationChanges}
                label="Authentication changes"
                icon={<KeyRound />}
                checked={values.hasAuthenticationChanges}
                onCheckedChange={(hasAuthenticationChanges) => onChange({ hasAuthenticationChanges })}
              />
              <SwitchRow
                id={FIELD_IDS.hasDatabaseChanges}
                label="Database changes"
                icon={<Database />}
                checked={values.hasDatabaseChanges}
                onCheckedChange={(hasDatabaseChanges) => onChange({ hasDatabaseChanges })}
              />
            </div>
          </div>
        </fieldset>

        <div className="sticky bottom-0 z-10 rounded-b-xl border-t border-line bg-surface/95 px-5 py-4 backdrop-blur lg:static lg:bg-surface">
          {errors.form && (
            <p id="pr-form-error" className="mb-2 text-xs text-[var(--risk-critical-text)]">
              {errors.form}
            </p>
          )}
          <AnalysisButton isAnalyzing={isAnalyzing} />
        </div>
      </form>
    </Card>
  );
}
