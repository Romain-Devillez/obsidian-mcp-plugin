/**
 * vault-mcp-rollback-edit — restore the most recent snapshot for a path.
 *
 * Companion to all destructive write tools (replace, append, prepend, edit,
 * delete). Each of those saves a snapshot before mutating; this tool restores
 * the last one.
 */

import { App, TFile, normalizePath } from "obsidian";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { rollbackStore } from "../lib/rollback-store";
import { ensureParentFolders } from "../lib/path-utils";
import { getErrorMessage } from "../utils/helpers";

export const description =
  "Roll back the last destructive operation on a file (replace, append, prepend, edit, delete). " +
  "Recreates the file if it was deleted. Returns an error if there's no rollback available.";

export function registerRollbackEditHandler(app: App, mcpServer: McpServer) {
  mcpServer.tool(
    "vault-mcp-rollback-edit",
    description,
    {
      path: z.string().describe("Path to the file to roll back."),
    },
    async ({ path }) => {
      try {
        const normPath = normalizePath(path);
        const entry = rollbackStore.pop(normPath);
        if (!entry) {
          return {
            content: [
              {
                type: "text",
                text: `No rollback available for: ${normPath}`,
              },
            ],
            isError: true,
          };
        }

        const existing = app.vault.getAbstractFileByPath(normPath);

        if (entry.existedBefore) {
          // The file existed before the destructive op — restore its content.
          if (existing instanceof TFile) {
            await app.vault.modify(existing, entry.previousContent ?? "");
          } else {
            // It was deleted; recreate.
            await ensureParentFolders(app, normPath);
            await app.vault.create(normPath, entry.previousContent ?? "");
          }
          return {
            content: [
              {
                type: "text",
                text: `Rolled back: ${normPath} (was: ${entry.reason} at ${entry.at})`,
              },
            ],
          };
        }

        // The file did NOT exist before — to roll back, we delete it.
        if (existing instanceof TFile) {
          const fileManager = app.fileManager as unknown as {
            trashFile?: (file: TFile) => Promise<void>;
          };
          if (typeof fileManager.trashFile === "function") {
            await fileManager.trashFile(existing);
          } else {
            await app.vault.delete(existing);
          }
        }
        return {
          content: [
            {
              type: "text",
              text:
                `Rolled back: ${normPath} (file did not exist before ${entry.reason} at ${entry.at}; ` +
                `removed it).`,
            },
          ],
        };
      } catch (error: unknown) {
        return {
          content: [
            {
              type: "text",
              text: `Error rolling back: ${getErrorMessage(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
