# Changelog

## v1.0.0 — 2026-04-25

### Initial release of Vault MCP Pro (fork of `vault-mcp` v0.0.10)

#### Added

- **`vault-mcp-create-file`** — explicit creation, errors if path exists.
- **`vault-mcp-replace-file`** — full overwrite of existing file.
- **`vault-mcp-append-to-file`** — append, errors if missing (no auto-create).
- **`vault-mcp-prepend-to-file`** — useful for adding frontmatter to a note.
- **`vault-mcp-delete-file`** — sends file to Obsidian trash with rollback.
- **`vault-mcp-move-file`** — rename/move using `app.fileManager.renameFile` so wikilinks update vault-wide.
- **`vault-mcp-read-frontmatter`** — YAML frontmatter as JSON.
- **`vault-mcp-update-frontmatter`** — set / unset YAML keys without touching body.
- Centralized **rollback store** (`src/lib/rollback-store.ts`) shared by all destructive tools.

#### Fixed

- **`vault-mcp-edit-file`** (formerly `obsidian-mcp-diff-edit-file`) no longer rejects diffs whose content includes YAML frontmatter `---` markers. Multi-file detection now requires a `--- ... +++` pair, never a single `---` line.

#### Removed

- **`obsidian-mcp-upsert-file`** — its silent-append-on-existing semantics produced duplicates. Replaced by the three explicit write tools above.

#### Changed

- All tool names migrated from `obsidian-mcp-*` to `vault-mcp-*`. **Breaking change** — clients must update their tool references.
- Restructured `src/`: ex `src/vault/` → `src/tools/` + new `src/lib/`.
- New tests under `tests/lib/`, `tests/tools/`, `tests/regression/` (32 tests).
- Plugin id renamed `vault-mcp` → `vault-mcp-pro` in `manifest.json` so users can install the fork side-by-side with upstream during migration.
