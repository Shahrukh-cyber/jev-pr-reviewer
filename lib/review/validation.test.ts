import { describe, expect, it } from "vitest";
import { buildDecisionRequest } from "@/lib/jev/questions";
import { DEMO_FORM, formValuesToInput, validatePrContext, type PrFormValues } from "./validation";

function validate(patch: Partial<PrFormValues>) {
  return validatePrContext(formValuesToInput({ ...DEMO_FORM, ...patch }));
}

describe("validatePrContext", () => {
  it("accepts the demo PR", () => {
    expect(validate({}).success).toBe(true);
  });

  it("trims text fields", () => {
    const result = validate({ title: "  Fix JWT refresh bug  " });
    expect(result.success && result.data.title).toBe("Fix JWT refresh bug");
  });

  it.each([
    [{ title: "   " }, "title"],
    [{ description: "" }, "description"],
    [{ changedFiles: [] }, "changedFiles"],
    [{ changedFiles: ["a.ts", "a.ts"] }, "changedFiles"],
    [{ filesChanged: "" }, "filesChanged"],
    [{ filesChanged: "2" }, "filesChanged"],
    [{ linesAdded: "-4" }, "linesAdded"],
    [{ linesRemoved: "1.5" }, "linesRemoved"],
    [{ linesAdded: "abc" }, "linesAdded"],
  ] as const)("rejects %o on %s", (patch, field) => {
    const result = validate(patch as Partial<PrFormValues>);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.fieldErrors[field]).toBeTypeOf("string");
  });

  it("returns friendly messages", () => {
    const result = validate({ filesChanged: "2" });
    expect(!result.success && result.fieldErrors.filesChanged).toBe(
      "Files changed can't be less than the number of listed files.",
    );
  });

  it("rejects non-boolean signals and non-object bodies", () => {
    const bad = validatePrContext({ ...formValuesToInput(DEMO_FORM), testsAdded: "yes" });
    expect(!bad.success && bad.fieldErrors.testsAdded).toBeTruthy();
    const notObject = validatePrContext("hello");
    expect(!notObject.success && notObject.fieldErrors.form).toBeTruthy();
  });
});

describe("buildDecisionRequest", () => {
  it("produces the documented Jev request body", () => {
    const result = validate({});
    if (!result.success) throw new Error("demo should be valid");
    const request = buildDecisionRequest(result.data);
    expect(request.state).toEqual({
      pr_title: "Fix JWT refresh bug",
      pr_description: "Fixes an issue where expired JWT tokens are not refreshed correctly.",
      changed_files: ["src/auth/middleware.ts", "src/auth/token.ts", "tests/auth/token.test.ts"],
      files_changed: 3,
      tests_added: true,
      lines_added: 82,
      lines_removed: 24,
      has_database_changes: false,
      has_authentication_changes: true,
    });
    expect(Object.keys(request.questions)).toEqual(["type", "risk", "needs_human_review", "needs_tests"]);
    expect(request.questions.risk.criteria).toEqual(["Low", "Moderate", "High", "Critical"]);
  });
});
