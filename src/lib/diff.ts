/**
 * Frontmatter-aware unified diff applier.
 *
 * Replaces the upstream `applyDiff` in src/vault/diff-edit.ts which falsely
 * detected YAML frontmatter `---` markers as multi-file boundaries.
 *
 * Contract:
 * - Input: target file path, unified diff payload, original file content.
 * - Output: { updated, diff } where `updated` is the new content and `diff` is
 *   a normalized unified diff describing what changed (useful for confirmation).
 * - Throws on invalid diff format, hunk that doesn't match, or path mismatch.
 *
 * Design: instead of scanning the whole diff for "---" lines (which collides
 * with YAML frontmatter), we strictly parse the diff as:
 *   line 0:    `--- <path>`
 *   line 1:    `+++ <path>`
 *   line 2..n: hunks, each starting with `@@ ... @@`
 * Anything between hunks must start with ` `, `+`, `-`, or `\` (no-newline marker).
 * A new file boundary requires BOTH `---` and `+++` headers in sequence — we
 * never accept a single `---` line as a file boundary.
 */

import { createPatch } from "diff";

export interface ApplyDiffResult {
  /** New file content after applying the diff. */
  updated: string;
  /** Normalized unified diff describing the actual changes applied. */
  diff: string;
}

const DIFF_FENCE_RE = /^```diff\s*|```$/gm;

/**
 * Strip a single `a/` or `b/` prefix often added by `git diff`.
 */
function stripPathPrefix(p: string): string {
  return p.replace(/^([ab]\/)+/, "");
}

/**
 * Parse and apply a unified diff against the original content.
 *
 * @throws Error with a precise reason if anything is malformed.
 */
export function applyDiff(
  path: string,
  udiff: string,
  originalContent: string,
): ApplyDiffResult {
  const cleanRaw = udiff.replace(DIFF_FENCE_RE, "");
  const original = originalContent.replace(/\r\n/g, "\n");
  const diffLines = cleanRaw.replace(/\r\n/g, "\n").split("\n");

  if (diffLines.length < 2) {
    throw new Error(
      "Diff is empty or missing headers. Expected at least `--- path` and `+++ path` lines.",
    );
  }

  // Strict header validation — must be `--- ` then `+++ ` on the first two lines.
  if (!/^---\s\S/.test(diffLines[0])) {
    throw new Error(
      "Missing `--- path` header on first line of diff.",
    );
  }
  if (!/^\+\+\+\s\S/.test(diffLines[1])) {
    throw new Error(
      "Missing `+++ path` header on second line of diff.",
    );
  }

  const oldFile = stripPathPrefix(diffLines[0].replace(/^---\s*/, ""));
  const newFile = stripPathPrefix(diffLines[1].replace(/^\+\+\+\s*/, ""));
  if (oldFile !== newFile) {
    throw new Error(
      `Diff renames file (\`${oldFile}\` → \`${newFile}\`); use the move-file tool instead.`,
    );
  }
  if (stripPathPrefix(path) !== oldFile) {
    throw new Error(
      `Diff file path (\`${oldFile}\`) does not match the requested path (\`${path}\`).`,
    );
  }

  // Walk through hunks. We allow blank lines between hunks but reject any
  // `--- ` / `+++ ` pair that would imply a second file (true multi-file diff).
  let updated = original;
  let cursor = 2;

  while (cursor < diffLines.length) {
    // Skip optional blank separators
    while (cursor < diffLines.length && diffLines[cursor].trim() === "") {
      cursor += 1;
    }
    if (cursor >= diffLines.length) break;

    // True multi-file detection: a `--- ` IMMEDIATELY followed by `+++ ` after the first hunk
    // would mean a second file. We reject early to fail fast.
    if (
      /^---\s\S/.test(diffLines[cursor]) &&
      cursor + 1 < diffLines.length &&
      /^\+\+\+\s\S/.test(diffLines[cursor + 1])
    ) {
      throw new Error(
        "Diff targets multiple files; vault-mcp-pro only accepts single-file diffs.",
      );
    }

    const header = diffLines[cursor];
    if (!/^@@.*@@/.test(header)) {
      throw new Error(
        `Expected hunk header starting with "@@ ... @@" at line ${cursor + 1}, got: ${header}`,
      );
    }
    cursor += 1;

    // Collect hunk lines until next hunk or end
    const hunkLines: string[] = [];
    while (
      cursor < diffLines.length &&
      !/^@@/.test(diffLines[cursor]) &&
      !(
        /^---\s\S/.test(diffLines[cursor]) &&
        cursor + 1 < diffLines.length &&
        /^\+\+\+\s\S/.test(diffLines[cursor + 1])
      )
    ) {
      hunkLines.push(diffLines[cursor]);
      cursor += 1;
    }

    const { search, replace } = buildSearchReplaceFromHunk(hunkLines);
    const idx = updated.indexOf(search);
    if (idx < 0) {
      throw new Error(
        `Hunk failed to apply — searched block not found in file:\n---\n${search}\n---`,
      );
    }
    updated = updated.slice(0, idx) + replace + updated.slice(idx + search.length);
  }

  const normalizedDiff = createPatch(path, original, updated, "", "");
  return { updated, diff: normalizedDiff };
}

interface SearchReplace {
  search: string;
  replace: string;
}

function buildSearchReplaceFromHunk(hunkLines: string[]): SearchReplace {
  const searchLines: string[] = [];
  const replaceLines: string[] = [];

  for (const line of hunkLines) {
    if (line === "") {
      // Blank line between subhunks — treat as context blank line
      searchLines.push("");
      replaceLines.push("");
      continue;
    }
    const prefix = line[0];
    const rest = line.slice(1);
    switch (prefix) {
      case " ":
        searchLines.push(rest);
        replaceLines.push(rest);
        break;
      case "-":
        searchLines.push(rest);
        break;
      case "+":
        replaceLines.push(rest);
        break;
      case "\\":
        // "\ No newline at end of file" — ignore
        break;
      default:
        // Be lenient with stray content lines (treat as context)
        searchLines.push(line);
        replaceLines.push(line);
    }
  }

  return {
    search: searchLines.join("\n"),
    replace: replaceLines.join("\n"),
  };
}
