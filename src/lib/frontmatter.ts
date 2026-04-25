/**
 * Frontmatter utilities — split a markdown document into its YAML frontmatter
 * and body, parse the YAML, and re-serialize.
 *
 * Used by:
 * - lib/diff.ts to make diff-edit YAML-aware
 * - tools/read-frontmatter.ts and tools/update-frontmatter.ts
 */

export interface SplitDoc {
  /** Raw YAML between the leading `---` fences (no fences). Empty string if none. */
  rawFrontmatter: string;
  /** Whether the document had a frontmatter block. */
  hasFrontmatter: boolean;
  /** The body of the document (everything after the closing `---`). */
  body: string;
  /** Number of newline characters consumed by the closing fence — used to rebuild offsets. */
  bodyStartLine: number;
}

/**
 * Detect and extract the YAML frontmatter at the top of a markdown document.
 *
 * Rules (compatible with Obsidian/Jekyll/Hugo conventions):
 * - The document must START with a line containing exactly `---` (no leading spaces).
 * - The frontmatter ends at the next line containing exactly `---`.
 * - If no opening fence on line 0, no frontmatter.
 * - If opening fence but no closing fence, treat the whole doc as having no frontmatter
 *   (avoids destructive misinterpretation).
 */
export function splitFrontmatter(content: string): SplitDoc {
  const normalized = content.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");

  if (lines.length === 0 || lines[0] !== "---") {
    return {
      rawFrontmatter: "",
      hasFrontmatter: false,
      body: normalized,
      bodyStartLine: 0,
    };
  }

  // Find closing fence
  let closingIdx = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === "---") {
      closingIdx = i;
      break;
    }
  }

  if (closingIdx === -1) {
    // Malformed: no closing fence. Don't strip anything.
    return {
      rawFrontmatter: "",
      hasFrontmatter: false,
      body: normalized,
      bodyStartLine: 0,
    };
  }

  const rawFrontmatter = lines.slice(1, closingIdx).join("\n");
  const body = lines.slice(closingIdx + 1).join("\n");

  return {
    rawFrontmatter,
    hasFrontmatter: true,
    body,
    bodyStartLine: closingIdx + 1,
  };
}

/**
 * Recombine frontmatter and body into a full document string.
 *
 * - If `rawFrontmatter` is empty AND `hasFrontmatter` is false, returns body only.
 * - Otherwise wraps frontmatter in `---` fences with a single trailing newline
 *   before the body.
 */
export function joinFrontmatter(split: SplitDoc): string {
  if (!split.hasFrontmatter) {
    return split.body;
  }
  return `---\n${split.rawFrontmatter}\n---\n${split.body}`;
}

/**
 * Tiny YAML parser sufficient for Obsidian-style frontmatter
 * (key: value, key: [list], key:\n  - item, key: |\n  multiline).
 *
 * Falls back to leaving the value as a string for anything more complex.
 * For full YAML support, callers should depend on `yaml` or `js-yaml`.
 *
 * Returns a plain object suitable for JSON serialization to MCP clients.
 */
export function parseSimpleYaml(raw: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!raw.trim()) return out;

  const lines = raw.split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const m = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
    if (!m) {
      i += 1;
      continue;
    }
    const key = m[1];
    const inlineValue = m[2];

    if (inlineValue === "") {
      // Block — collect indented children
      const children: string[] = [];
      let j = i + 1;
      while (j < lines.length && /^\s+/.test(lines[j])) {
        children.push(lines[j]);
        j += 1;
      }
      // List of items: "  - foo"
      if (children.length > 0 && children.every(c => /^\s*-\s+/.test(c))) {
        out[key] = children.map(c => c.replace(/^\s*-\s+/, "").trim());
      } else if (children.length === 0) {
        out[key] = null;
      } else {
        // Map or other — keep raw text for now
        out[key] = children.map(c => c.replace(/^\s+/, "")).join("\n");
      }
      i = j;
      continue;
    }

    // Inline scalar — try basic coercion
    out[key] = coerceScalar(inlineValue.trim());
    i += 1;
  }
  return out;
}

function coerceScalar(v: string): unknown {
  if (v === "" || v === "~" || v.toLowerCase() === "null") return null;
  if (v.toLowerCase() === "true") return true;
  if (v.toLowerCase() === "false") return false;
  // ISO date YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  // Number
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  // Quoted string
  const quoted = /^["'](.*)["']$/.exec(v);
  if (quoted) return quoted[1];
  return v;
}
