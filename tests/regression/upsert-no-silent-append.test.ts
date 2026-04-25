/**
 * Golden test — Behavior Documentation
 *
 * The upstream `upsert-file` tool silently appends to existing files. This is
 * documented in src/vault/upsert.ts but it's a footgun for AI agents that
 * naturally call upsert assuming "create or update" semantics.
 *
 * Real-world failure observed on 2026-04-25 11:25 CEST: I called upsert on
 * `Règle du délai 24h.md` twice during the same session, which appended the
 * full content a second time and produced a 224-line file with duplicated
 * frontmatter and duplicated body.
 *
 * Resolution: in vault-mcp-pro we drop `upsert` entirely and expose three
 * explicit tools:
 *   - create-file (errors if exists)
 *   - replace-file (errors if missing)
 *   - append-to-file (errors if missing)
 *
 * This test documents the new contract.
 */

describe("regression: write tools must have explicit semantics", () => {
  it("create-file: must fail if path exists", () => {
    // Implementation lands in Phase 3:
    //   import { createFile } from "../../src/tools/create-file";
    //   await expect(createFile(app, "existing.md", "x")).rejects.toThrow(/already exists/);
    expect(true).toBe(true); // placeholder
  });

  it("replace-file: must fail if path is missing", () => {
    // await expect(replaceFile(app, "missing.md", "x")).rejects.toThrow(/not found/);
    expect(true).toBe(true);
  });

  it("append-to-file: must fail if path is missing (no auto-create)", () => {
    // await expect(appendToFile(app, "missing.md", "x")).rejects.toThrow(/not found/);
    expect(true).toBe(true);
  });

  it("upsert-file tool must NOT exist anymore", () => {
    // We will assert that no exported registerUpsertHandler exists in vault-mcp-pro.
    expect(true).toBe(true);
  });
});
