import { describe, expect, it } from "vitest";
import { detectAuthentication, detectChangeSignals, detectDatabase, detectTests, isTestFile, pathWords } from "./detection";

const files = (...paths: string[]) => paths.map((path) => ({ path, status: "modified" }));

describe("isTestFile", () => {
  it.each([
    "src/token.test.ts",
    "src/button.spec.tsx",
    "src/__tests__/token.ts",
    "test/helpers.js",
    "tests/auth/token.test.ts",
    "e2e/login.ts",
    "pkg/token_test.go",
    "app/test_views.py",
    "spec/models/user_spec.rb",
    "src/main/java/TokenTest.java",
  ])("detects %s", (path) => expect(isTestFile(path)).toBe(true));

  it.each(["src/testing-library.ts", "src/latest.ts", "src/contest/entry.ts", "README.md"])("ignores %s", (path) =>
    expect(isTestFile(path)).toBe(false),
  );
});

describe("detectTests", () => {
  it("counts added or modified test files and reports matches", () => {
    const result = detectTests([
      { path: "src/a.ts", status: "modified" },
      { path: "src/a.test.ts", status: "added" },
    ]);
    expect(result).toEqual({ value: true, matches: ["src/a.test.ts"] });
  });

  it("does not count removed tests as tests added", () => {
    expect(detectTests([{ path: "src/a.test.ts", status: "removed" }]).value).toBe(false);
  });
});

describe("pathWords", () => {
  it("splits on separators and camelCase", () => {
    expect(pathWords("src/authMiddleware/JWT_token.ts")).toEqual(["src", "auth", "middleware", "jwt", "token", "ts"]);
  });
});

describe("detectAuthentication", () => {
  it.each([
    "src/auth/token.ts",
    "middleware.ts",
    "lib/jwt.ts",
    "app/api/oauth/callback/route.ts",
    "src/session-store.ts",
    "pages/login.tsx",
    "src/permissions.ts",
    "src/authMiddleware.ts",
    "app/sign-in/page.tsx",
  ])("flags %s", (path) => expect(detectAuthentication(files(path)).value).toBe(true));

  it.each(["src/author.ts", "src/components/button.tsx", "docs/README.md"])("ignores %s", (path) =>
    expect(detectAuthentication(files(path)).value).toBe(false),
  );
});

describe("detectDatabase", () => {
  it.each([
    "prisma/schema.prisma",
    "db/migrations/001_init.sql",
    "drizzle/0001.ts",
    "src/database/client.ts",
    "app/models/user.rb",
    "supabase/migrations/20240101_init.sql",
    "schema.rb",
  ])("flags %s", (path) => expect(detectDatabase(files(path)).value).toBe(true));

  it.each(["src/lib/schema.ts", "src/dbg.ts", "src/components/model-card.tsx"])("ignores %s", (path) =>
    expect(detectDatabase(files(path)).value).toBe(false),
  );
});

describe("detectChangeSignals", () => {
  it("matches the demo PR's signals", () => {
    const signals = detectChangeSignals(files("src/auth/middleware.ts", "src/auth/token.ts", "tests/auth/token.test.ts"));
    expect(signals.tests.value).toBe(true);
    expect(signals.authentication.value).toBe(true);
    expect(signals.database.value).toBe(false);
  });
});
