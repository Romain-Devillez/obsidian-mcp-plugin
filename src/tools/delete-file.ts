/**
 * vault-mcp-delete-file — delete a file from the vault.
 *
 * Saves a rollback snapshot before deletion so the operation can be undone via
 * vault-mcp-rollback-edit.
 *
 * Uses app.fileManager.trashFile when available so the file lands in Obsidian's
 * trash folder (configurable in settings) rather than being hard-deleted.
 */

import { App, TFile } from "obsidian";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { resolveFileOrThrow } from "../lib/path-utils";
import { rollbackStore } from "../lib/rollback-store";
import { getErrorMessage } from "../utils/helpers";

export const description =
  "DELETE a file from the vault. Sends to Obsidian trash (configurable). " +
  "Saves a rollback snapshot before deletion — use vault-mcp-rollback-edit to undo.";

export function registerDeleteFileHandler(app: App, mcpServer: McpServer) {
  mcpServer.tool(
    "vault-mcp-delete-file",
    description,
    {
      path: z.string().describe("Path to the file in the vault."),
    },
    async ({ path }) => {
      try {
        const { path: normPath, file } = resolveFileOrThrow(app, path);
        await rollbackStore.snapshot(app, normPath, "delete-file");

        // Prefer trash (recoverable) over hard delete.
        // app.fileManager.trashFile is available in Obsidian 0.13+.
        const fileManager = app.fileManager as unknown as {
          trashFile?: (file: TFile) => Promise<void>;
        };
        if (typeof fileManager.trashFile === "function") {
          await fileManager.trashFile(file);
        } else {
          await app.vault.delete(file);
        }

        return {
          content: [{ type: "text", text: `File deleted (sent to trash): ${normPath}` }],
        };
      } catch (error: unknown) {
        return {
          content: [
            {
              type: "text",
              text: `Error deleting file: ${getErrorMessage(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
