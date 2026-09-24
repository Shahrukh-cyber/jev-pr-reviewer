import type { GitHubPull, GitHubPullFile } from "@/lib/github/types";
import { detectChangeSignals } from "@/lib/review/detection";
import type { StoredContext } from "./record";

const MATCH_LIMIT = 20;

/**
 * Builds the PR context sent to Jev from real GitHub data. Totals come from
 * the PR object (exact even past GitHub's 3000-file listing cap); paths and
 * heuristics come from the full, paginated file list.
 */
export function buildPullContext(pull: GitHubPull, files: GitHubPullFile[]) {
  const changed = files.map((file) => ({ path: file.filename, status: file.status }));
  const signals = detectChangeSignals(changed);
  const filesChanged = pull.changed_files ?? files.length;

  const context: StoredContext = {
    title: pull.title,
    description: pull.body ?? "",
    descriptionTruncated: false,
    changedFiles: changed.map((file) => file.path),
    changedFilesTruncated: files.length < filesChanged,
    filesChanged,
    linesAdded: pull.additions ?? files.reduce((sum, file) => sum + file.additions, 0),
    linesRemoved: pull.deletions ?? files.reduce((sum, file) => sum + file.deletions, 0),
    testsAdded: signals.tests.value,
    hasAuthenticationChanges: signals.authentication.value,
    hasDatabaseChanges: signals.database.value,
  };

  const detection = {
    tests: signals.tests.matches.slice(0, MATCH_LIMIT),
    authentication: signals.authentication.matches.slice(0, MATCH_LIMIT),
    database: signals.database.matches.slice(0, MATCH_LIMIT),
  };

  return { context, detection, signals };
}
