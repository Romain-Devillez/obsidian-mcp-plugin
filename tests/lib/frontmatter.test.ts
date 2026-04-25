/**
 * Tests for the frontmatter splitting and YAML parsing utilities.
 */

import { joinFrontmatter, parseSimpleYaml, splitFrontmatter } from "../../src/lib/frontmatter";

describe("splitFrontmatter", () => {
  it("returns no frontmatter for plain markdown", () => {
    const result = splitFrontmatter("# Hello\n\nWorld\n");
    expect(result.hasFrontmatter).toBe(false);
    expect(result.body).toBe("# Hello\n\nWorld\n");
  });

  it("extracts a well-formed frontmatter block", () => {
    const doc = ["---", "created: 2026-04-25", "tags:", "  - psy", "---", "", "# Hi"].join("\n");
    const result = splitFrontmatter(doc);
    expect(result.hasFrontmatter).toBe(true);
    expect(result.rawFrontmatter).toBe(["created: 2026-04-25", "tags:", "  - psy"].join("\n"));
    expect(result.body).toBe("\n# Hi");
  });

  it("does not mistake markdown horizontal rules for frontmatter end", () => {
    const doc = ["---", "created: 2026-04-25", "---", "", "Body before rule", "", "---", "", "After rule"].join(
      "\n",
    );
    const result = splitFrontmatter(doc);
    expect(result.hasFrontmatter).toBe(true);
    expect(result.body).toBe("\nBody before rule\n\n---\n\nAfter rule");
  });

  it("treats malformed (missing closing fence) docs as having no frontmatter", () => {
    const doc = "---\ncreated: 2026-04-25\nhello\n";
    const result = splitFrontmatter(doc);
    expect(result.hasFrontmatter).toBe(false);
    expect(result.body).toBe(doc);
  });
});

describe("joinFrontmatter", () => {
  it("rebuilds a document from split", () => {
    const input = [
      "---",
      "created: 2026-04-25",
      "tags:",
      "  - psy",
      "---",
      "",
      "# Hello",
    ].join("\n");
    const split = splitFrontmatter(input);
    const rebuilt = joinFrontmatter(split);
    expect(rebuilt).toBe(input);
  });

  it("returns body alone if there is no frontmatter", () => {
    const split = splitFrontmatter("plain body\n");
    expect(joinFrontmatter(split)).toBe("plain body\n");
  });
});

describe("parseSimpleYaml", () => {
  it("parses scalars", () => {
    const yaml = [
      "title: Hello",
      "created: 2026-04-25",
      "active: true",
      "count: 42",
      "ratio: 1.5",
      "empty: ~",
    ].join("\n");
    expect(parseSimpleYaml(yaml)).toEqual({
      title: "Hello",
      created: "2026-04-25",
      active: true,
      count: 42,
      ratio: 1.5,
      empty: null,
    });
  });

  it("parses block lists", () => {
    const yaml = ["tags:", "  - psy", "  - sante", "  - meta"].join("\n");
    expect(parseSimpleYaml(yaml)).toEqual({
      tags: ["psy", "sante", "meta"],
    });
  });

  it("strips quotes around scalar strings", () => {
    expect(parseSimpleYaml('name: "Romain"')).toEqual({ name: "Romain" });
    expect(parseSimpleYaml("name: 'Romain'")).toEqual({ name: "Romain" });
  });
});
