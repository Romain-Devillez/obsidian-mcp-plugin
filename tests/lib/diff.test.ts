/**
 * Unit tests for the unified diff applier.
 *
 * Complements the regression test in tests/regression/.
 */

import { applyDiff } from "../../src/lib/diff";

describe("applyDiff", () => {
  it("applies a simple replace", () => {
    const original = ["alpha", "beta", "gamma"].join("\n");
    const diff = [
      "--- file.md",
      "+++ file.md",
      "@@ ... @@",
      " alpha",
      "-beta",
      "+BETA",
      " gamma",
    ].join("\n");
    const { updated } = applyDiff("file.md", diff, original);
    expect(updated).toBe(["alpha", "BETA", "gamma"].join("\n"));
  });

  it("applies multiple hunks in one diff", () => {
    const original = ["one", "two", "three", "four", "five"].join("\n");
    const diff = [
      "--- f.md",
      "+++ f.md",
      "@@ ... @@",
      "-one",
      "+ONE",
      "@@ ... @@",
      "-five",
      "+FIVE",
    ].join("\n");
    const { updated } = applyDiff("f.md", diff, original);
    expect(updated).toBe(["ONE", "two", "three", "four", "FIVE"].join("\n"));
  });

  it("strips a/ b/ prefixes commonly added by git diff", () => {
    const original = "x\n";
    const diff = [
      "--- a/file.md",
      "+++ b/file.md",
      "@@ ... @@",
      "-x",
      "+y",
    ].join("\n");
    const { updated } = applyDiff("file.md", diff, original);
    expect(updated.trim()).toBe("y");
  });

  it("strips ```diff fences if present", () => {
    const original = "x\n";
    const diff = [
      "```diff",
      "--- f.md",
      "+++ f.md",
      "@@ ... @@",
      "-x",
      "+y",
      "```",
    ].join("\n");
    const { updated } = applyDiff("f.md", diff, original);
    expect(updated.trim()).toBe("y");
  });

  it("throws when a hunk doesn't match the file", () => {
    const original = "alpha\nbeta\n";
    const diff = [
      "--- f.md",
      "+++ f.md",
      "@@ ... @@",
      "-NOT_THERE",
      "+OTHER",
    ].join("\n");
    expect(() => applyDiff("f.md", diff, original)).toThrow(/not found/);
  });
});
