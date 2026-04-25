/**
 * vault-mcp-edit-file — apply a unified diff to an existing file.
 *
 * Replaces upstream `obsidian-mcp-diff-edit-file`, fixing the YAML frontmatter
 * detection bug. The new diff applier (lib/diff.ts) only treats a `--- ... +++`
 * pair as a file boundary, never a single `---` line, so YAML frontmatter in
 * the file content no longer triggers false multi-file errors.
 */

import { App } from "obsidian";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { resolveFileOrThrow } from "../lib/path-utils";
import { rollbackStore } from "../lib/rollback-store";
import { applyDiff } from "../lib/diff";
import { getErrorMessage } from "../utils/helpers";

export const description = `Apply a unified diff to an existing file.

YAML frontmatter inside the file is supported — \`---\` lines in the file
content are NOT confused with diff file boundaries. Only the first
\`--- path\` + \`+++ path\` header pair counts as a file marker.

Format requirements:
- First line: \`--- <path>\`
- Second line: \`+++ <path>\` (same path — use vault-mcp-move-file to rename).
- Followed by one or more hunks, each starting with \`@@ ... @@\`.
- Hunks contain context (\` \`), removed (\`-\`) and added (\`+\`) lines.

Saves a rollback snapshot before mutating.`;

export function registerEditFileHandler(app: App, mcpServer: McpServer) {
  mcpServer.tool(
    "vault-mcp-edit-file",
    description,
    {
      path: z.string().describe("Path to the file in the vault."),
      udiff: z.string().describe("Unified diff to apply (no fences)."),
    },
    async ({ path, udiff }) => {
      try {
        const { path: normPath, file } = resolveFileOrThrow(app, path);
        const original = await app.vault.read(file);

        const { updated, diff } = applyDiff(normPath, udiff, original);

        await rollbackStore.snapshot(app, normPath, "edit-file");
        await app.vault.modify(file, updated);

        return {
          content: [
            {
              type: "text",
              text: `Applied diff to ${normPath}.\n\n${diff}`,
            },
          ],
        };
      } catch (error: unknown) {
        return {
          content: [
            {
              type: "text",
              text: `Error applying diff: ${getErrorMessage(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
