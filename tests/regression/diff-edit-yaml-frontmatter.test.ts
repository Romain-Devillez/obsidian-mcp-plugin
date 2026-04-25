/**
 * Regression test — diff-edit must accept YAML frontmatter as content.
 *
 * Real-world failure observed on 2026-04-25 13:44 CEST while editing
 * `3-Areas/Santé/Psy/Règle du délai 24h.md` which had a duplicated YAML
 * frontmatter section. The upstream MCP server returned:
 *
 *     "Error applying diff: Diff targets multiple files; only single-file diffs are supported."
 *
 * even though the diff was strictly single-file.
 *
 * This test exercises the FIXED implementation in src/lib/diff.ts.
 */

import { applyDiff } from "../../src/lib/diff";

describe("regression: applyDiff must accept YAML frontmatter as content", () => {
  it("does not confuse YAML --- with multi-file boundaries", () => {
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

    // Single-file diff that targets `note.md` but contains a `---` line as
    // context (representing a Markdown horizontal rule, post-frontmatter).
    const diff = [
      "--- note.md",
      "+++ note.md",
      "@@ ... @@",
      "-Old line",
      "+New line",
    ].join("\n");

    const { updated } = applyDiff("note.md", diff, original);
    expect(updated).toContain("New line");
    expect(updated).not.toContain("Old line");
    // Frontmatter is preserved intact
    expect(updated.startsWith("---\ncreated: 2026-04-25\ntags:")).toBe(true);
    // Trailing horizontal rule survives
    expect(updated).toContain("\n---\n\n## Section");
  });

  it("rejects true multi-file diffs", () => {
    const original = "hello\n";
    const diff = [
      "--- a.md",
      "+++ a.md",
      "@@ ... @@",
      "-hello",
      "+world",
      "--- b.md",
      "+++ b.md",
      "@@ ... @@",
      "-x",
      "+y",
    ].join("\n");

    expect(() => applyDiff("a.md", diff, original)).toThrow(
      /multiple files/i,
    );
  });

  it("rejects diffs whose path doesn't match the requested target", () => {
    const original = "x\n";
    const diff = ["--- other.md", "+++ other.md", "@@ ... @@", "-x", "+y"].join("\n");
    expect(() => applyDiff("note.md", diff, original)).toThrow(
      /does not match/i,
    );
  });

  it("rejects diffs missing headers", () => {
    expect(() => applyDiff("note.md", "@@ ... @@\n-x\n+y", "x\n")).toThrow(
      /header/i,
    );
  });

  it("supports a single rename-detection case by erroring", () => {
    // We refuse to do renames inside edit-file. Caller must use move-file.
    const original = "x\n";
    const diff = ["--- old.md", "+++ new.md", "@@ ... @@", "-x", "+y"].join("\n");
    expect(() => applyDiff("old.md", diff, original)).toThrow(/move-file/);
  });
});
