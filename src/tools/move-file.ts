/**
 * vault-mcp-move-file — move/rename a file inside the vault.
 *
 * Critical: uses app.fileManager.renameFile so Obsidian automatically updates
 * all wikilinks pointing to the moved file. Plain vault.rename does NOT update
 * backlinks, which would break references vault-wide.
 */

import { App } from "obsidian";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ensureParentFolders, pathExists, resolveFileOrThrow } from "../lib/path-utils";
import { getErrorMessage } from "../utils/helpers";
import { normalizePath } from "obsidian";

export const description =
  "MOVE or RENAME a file in the vault. Uses Obsidian's fileManager so all " +
  "wikilinks pointing to the file are automatically updated. " +
  "ERRORS if the source does not exist or the destination already exists.";

export function registerMoveFileHandler(app: App, mcpServer: McpServer) {
  mcpServer.tool(
    "vault-mcp-move-file",
    description,
    {
      from: z.string().describe("Current path of the file."),
      to: z.string().describe("New path for the file (can include new folders)."),
    },
    async ({ from, to }) => {
      try {
        const { file: sourceFile } = resolveFileOrThrow(app, from);
        const normTo = normalizePath(to);

        if (pathExists(app, normTo)) {
          return {
            content: [
              {
                type: "text",
                text: `Destination already exists: ${normTo}. Refusing to overwrite.`,
              },
            ],
            isError: true,
          };
        }

        await ensureParentFolders(app, normTo);
        await app.fileManager.renameFile(sourceFile, normTo);

        return {
          content: [
            {
              type: "text",
              text: `File moved: ${sourceFile.path} → ${normTo} (wikilinks updated)`,
            },
          ],
        };
      } catch (error: unknown) {
        return {
          content: [
            {
              type: "text",
              text: `Error moving file: ${getErrorMessage(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
