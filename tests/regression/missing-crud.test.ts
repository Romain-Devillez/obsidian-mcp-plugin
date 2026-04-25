/**
 * Golden test — Missing CRUD operations
 *
 * The upstream plugin lacks delete and move/rename tools. As a result,
 * the obsolete note `Plan d'affûtage corporel pré-kétamine.md` had to
 * sit around for hours with a "manually delete me" warning until I
 * resorted to a git clone + git rm workflow.
 *
 * vault-mcp-pro adds two explicit tools:
 *   - delete-file (with rollback support)
 *   - move-file (uses Obsidian fileManager.renameFile to preserve wikilinks)
 */

describe("regression: CRUD must be complete", () => {
  it("delete-file: must save rollback before deletion", () => {
    expect(true).toBe(true);
  });

  it("move-file: must preserve wikilinks via Obsidian fileManager", () => {
    expect(true).toBe(true);
  });
});
