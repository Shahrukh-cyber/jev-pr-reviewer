/**
 * Deterministic, path-based heuristics that turn a PR's changed files into
 * the boolean signals sent to Jev. They inspect file *paths* only — they do
 * not understand code — so they can miss or over-match. Edit the pattern
 * lists below to tune them for a repository.
 */

export interface ChangedFile {
  path: string;
  /** GitHub file status: added, modified, removed, renamed, copied, changed, unchanged. */
  status?: string;
}

export interface Detection {
  value: boolean;
  /** The changed files that triggered the signal. */
  matches: string[];
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

export const TEST_PATH_PATTERNS: RegExp[] = [
  /(^|\/)(tests?|__tests__|__mocks__|specs?|e2e|cypress|playwright)\//i,
  /\.(test|spec|e2e)\.[^/]+$/i, // foo.test.ts, foo.spec.js, foo.e2e.ts
  /(^|\/)test_[^/]+\.py$/i, // test_foo.py
  /_test\.(go|py|rb|exs?)$/i, // foo_test.go
  /_spec\.rb$/i, // foo_spec.rb
  /(Test|Tests|IT)\.(java|kt|cs|scala)$/, // FooTest.java
];

export function isTestFile(path: string): boolean {
  const normalized = path.replace(/\\/g, "/");
  return TEST_PATH_PATTERNS.some((pattern) => pattern.test(normalized));
}

/** True when a test file was added or modified (removing tests doesn't count). */
export function detectTests(files: ChangedFile[]): Detection {
  const matches = files
    .filter((file) => file.status !== "removed" && isTestFile(file.path))
    .map((file) => file.path);
  return { value: matches.length > 0, matches };
}

// ---------------------------------------------------------------------------
// Keyword matching on path words
// ---------------------------------------------------------------------------

/** "src/authMiddleware/JWT_token.ts" → ["src", "auth", "middleware", "jwt", "token", "ts"] */
export function pathWords(path: string): string[] {
  return path
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function detectByRules(
  files: ChangedFile[],
  keywords: ReadonlySet<string>,
  patterns: RegExp[],
): Detection {
  const matches = files
    .filter((file) => {
      const normalized = file.path.replace(/\\/g, "/");
      return (
        patterns.some((pattern) => pattern.test(normalized)) ||
        pathWords(normalized).some((word) => keywords.has(word))
      );
    })
    .map((file) => file.path);
  return { value: matches.length > 0, matches };
}

// ---------------------------------------------------------------------------
// Authentication
// ---------------------------------------------------------------------------

export const AUTH_KEYWORDS: ReadonlySet<string> = new Set([
  "auth", "authn", "authz", "authentication", "authorization", "authorize",
  "middleware", "jwt", "oauth", "oauth2", "oidc", "saml", "sso",
  "session", "sessions", "login", "logout", "signin", "signout", "signup",
  "password", "passwords", "credential", "credentials",
  "permission", "permissions", "rbac", "acl", "csrf", "passport",
]);

export const AUTH_PATH_PATTERNS: RegExp[] = [/(^|\/)(sign-in|sign-out|sign-up|log-in|log-out)(\/|\.|$)/i];

export function detectAuthentication(files: ChangedFile[]): Detection {
  return detectByRules(files, AUTH_KEYWORDS, AUTH_PATH_PATTERNS);
}

// ---------------------------------------------------------------------------
// Database
// ---------------------------------------------------------------------------

export const DATABASE_KEYWORDS: ReadonlySet<string> = new Set([
  "prisma", "migration", "migrations", "migrate", "drizzle", "db", "database",
  "models", "knexfile", "typeorm", "sequelize", "alembic", "liquibase", "flyway",
]);

export const DATABASE_PATH_PATTERNS: RegExp[] = [
  /\.sql$/i,
  /(^|\/)schema\.(prisma|rb|sql)$/i,
  /(^|\/)supabase\/migrations\//i,
];

export function detectDatabase(files: ChangedFile[]): Detection {
  return detectByRules(files, DATABASE_KEYWORDS, DATABASE_PATH_PATTERNS);
}

export interface ChangeSignals {
  tests: Detection;
  authentication: Detection;
  database: Detection;
}

export function detectChangeSignals(files: ChangedFile[]): ChangeSignals {
  return {
    tests: detectTests(files),
    authentication: detectAuthentication(files),
    database: detectDatabase(files),
  };
}
