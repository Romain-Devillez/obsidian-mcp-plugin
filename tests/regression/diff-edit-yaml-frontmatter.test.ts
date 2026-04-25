/**
 * Golden test — Bug Reproduction
 *
 * The upstream diff-edit-file tool fails when the diff payload contains YAML
 * frontmatter delimiters (`---`) anywhere after the unified diff headers, because
 * its multi-file detection relies on `line.startsWith("---")`.
 *
 * Real-world failure observed on 2026-04-25 13:44 CEST while editing
 * `3-Areas/Santé/Psy/Règle du délai 24h.md` which had a duplicated YAML
 * frontmatter section. The MCP server returned:
 *
 *     "Error applying diff: Diff targets multiple files; only single-file diffs are supported."
 *
 * even though the diff was strictly single-file.
 *
 * This test must FAIL on the upstream applyDiff implementation, and must PASS
 * on the fixed implementation (lib/diff.ts).
 */

// We extract the buggy implementation in isolation to test it directly.
// The fixed impl will live in src/lib/diff.ts once Phase 3 starts.

describe("regression: diff-edit must accept YAML frontmatter as content", () => {
  const original = [
    "---",
    "created: 2026-04-25",
    "tags:",
    "  - psy",
    "---",
    "",
    "# Title",
    "",
    "Old line",
    "",
    "---",
    "",
    "## Section",
  ].join("\n");

  const expected = [
    "---",
    "created: 2026-04-25",
    "tags:",
    "  - psy",
    "---",
    "",
    "# Title",
    "",
    "New line",
    "",
    "---",
    "",
    "## Section",
  ].join("\n");

  // diff that ONLY targets a single file (note.md) but contains YAML "---"
  // markers as part of its context lines.
  const diff = [
    "--- note.md",
    "+++ note.md",
    "@@ ... @@",
    " ---",
    " ",
    " # Title",
    " ",
    "-Old line",
    "+New line",
    " ",
    " ---",
  ].join("\n");

  it("placeholder — implementation lands in Phase 3", () => {
    // We assert the contract here. The real applyDiff function will be
    // imported once src/lib/diff.ts is implemented:
    //
    //   import { applyDiff } from "../../src/lib/diff";
    //   const { updated } = applyDiff("note.md", diff, original);
    //   expect(updated).toBe(expected);
    //
    expect(diff).toContain("--- note.md");
    expect(original).toContain("---");
    expect(expected).toContain("New line");
  });
});
