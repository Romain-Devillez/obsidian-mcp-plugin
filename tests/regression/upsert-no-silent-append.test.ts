/**
 * Regression — upsert-file dropped, replaced by 3 explicit tools.
 *
 * Real-world failure on 2026-04-25 11:25 CEST:
 *   I called upsert on `Règle du délai 24h.md` twice in the same session,
 *   which silently appended the full content a second time, producing a
 *   224-line file with duplicated frontmatter and duplicated body.
 *
 * Resolution in vault-mcp-pro:
 *   - upsert-file removed entirely.
 *   - Three new tools force explicit intent:
 *       create-file:    error if path exists
 *       replace-file:   error if path missing
 *       append-to-file: error if path missing
 */

import { VAULT_TOOLS } from "../../src/tools";

describe("regression: write tools have explicit semantics", () => {
  it("VAULT_TOOLS does not export an upsert tool anymore", () => {
    const names = Object.keys(VAULT_TOOLS);
    expect(names).not.toContain("vault-mcp-upsert-file");
    expect(names).not.toContain("obsidian-mcp-upsert-file");
  });

  it("VAULT_TOOLS exports create / replace / append explicit tools", () => {
    const names = Object.keys(VAULT_TOOLS);
    expect(names).toContain("vault-mcp-create-file");
    expect(names).toContain("vault-mcp-replace-file");
    expect(names).toContain("vault-mcp-append-to-file");
    expect(names).toContain("vault-mcp-prepend-to-file");
  });
});
