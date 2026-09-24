import { z } from "zod";

export const LIMITS = {
  titleMax: 200,
  descriptionMax: 5000,
  filePathMax: 300,
  filesMax: 300,
  countMax: 100_000,
  linesMax: 10_000_000,
} as const;

const count = (label: string, min: number, max: number) =>
  z
    .number({
      error: (issue) =>
        issue.input === undefined ? `${label} is required.` : `${label} must be a number.`,
    })
    .int(`${label} must be a whole number.`)
    .min(min, min === 0 ? `${label} can't be negative.` : `${label} must be at least ${min}.`)
    .max(max, `${label} looks too large.`);

export const prContextSchema = z
  .object({
    title: z
      .string({ error: "Add a PR title." })
      .trim()
      .min(1, "Add a PR title so Jev knows what changed.")
      .max(LIMITS.titleMax, `Keep the title under ${LIMITS.titleMax} characters.`),
    description: z
      .string({ error: "Add a short description." })
      .trim()
      .min(1, "Describe the change in a sentence or two.")
      .max(LIMITS.descriptionMax, `Keep the description under ${LIMITS.descriptionMax} characters.`),
    changedFiles: z
      .array(
        z
          .string()
          .trim()
          .min(1, "File paths can't be empty.")
          .max(LIMITS.filePathMax, "One of the file paths is too long."),
        { error: "Add at least one changed file." },
      )
      .min(1, "Add at least one changed file.")
      .max(LIMITS.filesMax, `List at most ${LIMITS.filesMax} files.`)
      .refine((files) => new Set(files).size === files.length, "Each file should only be listed once."),
    filesChanged: count("Files changed", 1, LIMITS.countMax),
    linesAdded: count("Lines added", 0, LIMITS.linesMax),
    linesRemoved: count("Lines removed", 0, LIMITS.linesMax),
    testsAdded: z.boolean({ error: "Tests added must be yes or no." }),
    hasAuthenticationChanges: z.boolean({ error: "Authentication changes must be yes or no." }),
    hasDatabaseChanges: z.boolean({ error: "Database changes must be yes or no." }),
  })
  .refine((ctx) => ctx.filesChanged >= ctx.changedFiles.length, {
    path: ["filesChanged"],
    message: "Files changed can't be less than the number of listed files.",
  });

export type PrContext = z.infer<typeof prContextSchema>;
export type PrContextField = keyof PrContext;
/** Per-field messages; `form` holds issues that aren't tied to a single field. */
export type FieldErrors = Partial<Record<PrContextField | "form", string>>;

export type ValidationResult =
  | { success: true; data: PrContext }
  | { success: false; fieldErrors: FieldErrors };

function isField(value: unknown): value is PrContextField {
  return typeof value === "string" && value in prContextSchema.shape;
}

export function validatePrContext(input: unknown): ValidationResult {
  const result = prContextSchema.safeParse(input);
  if (result.success) return { success: true, data: result.data };

  const fieldErrors: FieldErrors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0];
    const key = isField(field) ? field : "form";
    fieldErrors[key] ??= key === "form" ? "The request body is not valid PR context." : issue.message;
  }
  return { success: false, fieldErrors };
}

// ---------------------------------------------------------------------------
// Form ↔ context
// ---------------------------------------------------------------------------

/** Form values keep numbers as strings so inputs can be temporarily empty. */
export interface PrFormValues {
  title: string;
  description: string;
  changedFiles: string[];
  filesChanged: string;
  linesAdded: string;
  linesRemoved: string;
  testsAdded: boolean;
  hasAuthenticationChanges: boolean;
  hasDatabaseChanges: boolean;
}

function toNumber(value: string): number | undefined {
  const trimmed = value.trim();
  return trimmed === "" ? undefined : Number(trimmed);
}

export function formValuesToInput(values: PrFormValues) {
  return {
    ...values,
    filesChanged: toNumber(values.filesChanged),
    linesAdded: toNumber(values.linesAdded),
    linesRemoved: toNumber(values.linesRemoved),
  };
}

export const EMPTY_FORM: PrFormValues = {
  title: "",
  description: "",
  changedFiles: [],
  filesChanged: "",
  linesAdded: "",
  linesRemoved: "",
  testsAdded: false,
  hasAuthenticationChanges: false,
  hasDatabaseChanges: false,
};

/** True when validated context is exactly the built-in demo PR. */
export function isDemoContext(context: PrContext): boolean {
  const demo = validatePrContext(formValuesToInput(DEMO_FORM));
  return demo.success && JSON.stringify(demo.data) === JSON.stringify(context);
}

export const DEMO_FORM: PrFormValues = {
  title: "Fix JWT refresh bug",
  description: "Fixes an issue where expired JWT tokens are not refreshed correctly.",
  changedFiles: ["src/auth/middleware.ts", "src/auth/token.ts", "tests/auth/token.test.ts"],
  filesChanged: "3",
  linesAdded: "82",
  linesRemoved: "24",
  testsAdded: true,
  hasAuthenticationChanges: true,
  hasDatabaseChanges: false,
};
