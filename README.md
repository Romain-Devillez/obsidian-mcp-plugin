# Vault MCP Pro

> **Fork** of [`jlevere/obsidian-mcp-plugin`](https://github.com/jlevere/obsidian-mcp-plugin) with explicit CRUD, frontmatter-aware diff editing, and rollback support.

A self-contained MCP server inside Obsidian. Lets AI clients (Claude Desktop, Perplexity Computer, Cline, etc.) safely read, search, and **modify** your vault through a Cloudflare-tunnel-friendly HTTP MCP endpoint.

---

## Why a fork?

Real-world failures with the upstream plugin during a single working session (April 25, 2026):

| Failure | Cause | Vault MCP Pro fix |
|---------|-------|-------------------|
| `upsert-file` silently appended duplicate content to an existing note (224-line file with double frontmatter and double body) | Documented behavior in upstream, but a footgun for AI agents | **Removed `upsert`.** Replaced by 3 explicit tools: `create-file`, `replace-file`, `append-to-file`. Each errors clearly when intent doesn't match state. |
| `diff-edit-file` rejected a single-file diff with *"Diff targets multiple files"* | The multi-file detector matches any line starting with `---`, including YAML frontmatter delimiters | **Frontmatter-aware diff parser** in `src/lib/diff.ts`. Only treats a `--- ... +++` pair as a file boundary. |
| Couldn't delete the obsolete `Plan d'affûtage corporel pré-kétamine.md`; had to fall back to `git rm` | Upstream has no delete tool | **`vault-mcp-delete-file`** with rollback support (sends to Obsidian trash). |
| Couldn't rename a typoed file like `Transmission paternelle inverseée.md` | Upstream has no move/rename tool | **`vault-mcp-move-file`** uses `app.fileManager.renameFile` so wikilinks update automatically vault-wide. |

---

## Toolset

### Read

| Tool | Purpose |
|------|---------|
| `vault-mcp-read-file` | Read raw file content |
| `vault-mcp-list-files` | Hierarchical directory listing with depth control |
| `vault-mcp-search-contents` | Fuzzy search file contents |
| `vault-mcp-search-filenames` | Fuzzy search filenames |
| `vault-mcp-read-frontmatter` | Return YAML frontmatter as JSON (uses Obsidian metadata cache) |

### Write — body

| Tool | Behavior |
|------|----------|
| `vault-mcp-create-file` | Create a new file. **Errors if exists.** |
| `vault-mcp-replace-file` | Fully overwrite content of existing file. **Errors if missing.** |
| `vault-mcp-append-to-file` | Append to end of existing file. **Errors if missing.** |
| `vault-mcp-prepend-to-file` | Insert at beginning (handy for adding frontmatter to a frontmatter-less note). |
| `vault-mcp-edit-file` | Apply a unified diff. Frontmatter-aware. **Errors if missing.** |
| `vault-mcp-rollback-edit` | Undo the last destructive op on a path. |

### File management

| Tool | Behavior |
|------|----------|
| `vault-mcp-delete-file` | Sends file to Obsidian trash, with rollback. |
| `vault-mcp-move-file` | Rename or move; preserves wikilinks via `app.fileManager.renameFile`. |

### Frontmatter

| Tool | Behavior |
|------|----------|
| `vault-mcp-read-frontmatter` | Read YAML frontmatter as JSON |
| `vault-mcp-update-frontmatter` | Set or unset YAML keys without touching the body |

All destructive tools save a snapshot to an in-memory rollback store before mutating. The rollback store is per-session (not persisted across Obsidian reloads) — this is intentional: in-session rollback is the use case.

---

## Architecture

```
src/
├── main.ts                    # Plugin entry point
├── managers/
│   ├── ServerManager.ts       # MCP server lifecycle
│   ├── ToolManager.ts         # Tool registration
│   └── StructuredManager.ts   # Dynamic tools from JSON schemas
├── tools/                     # One file per tool
│   ├── index.ts               # Central registry (VAULT_TOOLS, TOOL_DESCRIPTIONS)
│   ├── read-file.ts
│   ├── list-files.ts
│   ├── search-contents.ts
│   ├── search-filenames.ts
│   ├── create-file.ts
│   ├── replace-file.ts
│   ├── append-to-file.ts
│   ├── prepend-to-file.ts
│   ├── edit-file.ts
│   ├── rollback-edit.ts
│   ├── delete-file.ts
│   ├── move-file.ts
│   ├── read-frontmatter.ts
│   └── update-frontmatter.ts
├── lib/                       # Shared utilities
│   ├── diff.ts                # Unified diff applier (frontmatter-aware)
│   ├── frontmatter.ts         # YAML split / parse / join
│   ├── path-utils.ts          # File resolution, parent folder creation
│   └── rollback-store.ts      # In-memory snapshots per path
├── resources/                 # MCP resources (unchanged from upstream)
├── structured-tools/          # Dynamic tools (unchanged from upstream)
└── utils/helpers.ts           # Legacy shared helpers (read-only utilities)
```

---

## Install

### Via BRAT (recommended)

1. Install the [BRAT plugin](https://github.com/TfTHacker/obsidian42-brat) in Obsidian.
2. BRAT settings → *Add Beta Plugin* → paste `Romain-Devillez/obsidian-mcp-plugin`.
3. Enable **Vault MCP Pro** in Community Plugins.
4. Configure port + auth token in plugin settings.
5. Tunnel exposure (Cloudflare / Ngrok / Tailscale) is independent of the plugin.

### Manual

```bash
git clone https://github.com/Romain-Devillez/obsidian-mcp-plugin.git
cd obsidian-mcp-plugin
git checkout rewrite-vault-mcp-pro
pnpm install
pnpm build
# Copy dist/main.js + manifest.json to <vault>/.obsidian/plugins/vault-mcp-pro/
```

---

## Development

```bash
pnpm install
pnpm test       # 32 tests
pnpm lint
pnpm build      # → dist/main.js
pnpm inspect    # MCP Inspector
```

---

## Credits

- Original work: [jlevere](https://github.com/jlevere) and [@joshtmerrill](https://github.com/joshtmerrill)
- This fork: [Romain Devillez](https://github.com/Romain-Devillez)

License: MIT (inherited).
