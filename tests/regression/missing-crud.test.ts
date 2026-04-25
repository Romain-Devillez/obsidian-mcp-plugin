/**
 * Regression — vault-mcp-pro provides full CRUD via explicit tools.
 *
 * The upstream plugin lacked delete and move/rename, which forced manual
 * git workflows for trivial vault operations (eg. removing the obsolete
 * `Plan d'affûtage corporel pré-kétamine.md` on 2026-04-25).
 */

import { VAULT_TOOLS } from "../../src/tools";

describe("regression: full CRUD coverage", () => {
  it("exposes delete-file", () => {
    expect(Object.keys(VAULT_TOOLS)).toContain("vault-mcp-delete-file");
  });

  it("exposes move-file", () => {
    expect(Object.keys(VAULT_TOOLS)).toContain("vault-mcp-move-file");
  });

  it("exposes rollback-edit", () => {
    expect(Object.keys(VAULT_TOOLS)).toContain("vault-mcp-rollback-edit");
  });

  it("exposes frontmatter helpers", () => {
    const names = Object.keys(VAULT_TOOLS);
    expect(names).toContain("vault-mcp-read-frontmatter");
    expect(names).toContain("vault-mcp-update-frontmatter");
  });
});
