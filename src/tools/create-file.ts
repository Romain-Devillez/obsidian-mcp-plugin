/**
 * vault-mcp-create-file — create a NEW file. Errors if the path already exists.
 *
 * This is one of the three explicit write tools that replace the upstream
 * `obsidian-mcp-upsert-file`. The split forces callers to disambiguate intent:
 *
 *   - create-file:  create new, fail if exists
 *   - replace-file: rewrite existing, fail if missing
 *   - append-to-file: append to existing, fail if missing
 *
 * No silent overwrites, no silent appends.
 */

import { App } from "obsidian";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ensureParentFolders, pathExists } from "../lib/path-utils";
import { getErrorMessage } from "../utils/helpers";
import { normalizePath } from "obsidian";

export const description =
  "Create a NEW file in the vault. ERRORS if a file already exists at this path. " +
  "Use replace-file to rewrite an existing file, or append-to-file to add content to one.";

export function registerCreateFileHandler(app: App, mcpServer: McpServer) {
  mcpServer.tool(
    "vault-mcp-create-file",
    description,
    {
      path: z.string().describe("Path to the new file in the vault."),
      content: z.string().describe("Initial content for the file."),
    },
    async ({ path, content }) => {
      try {
        const normPath = normalizePath(path);

        if (pathExists(app, normPath)) {
          return {
            content: [
              {
                type: "text",
                text:
                  `File already exists: ${normPath}. ` +
                  `Use vault-mcp-replace-file to overwrite, or vault-mcp-append-to-file to append.`,
              },
            ],
            isError: true,
          };
        }

        await ensureParentFolders(app, normPath);
        await app.vault.create(normPath, content);

        return {
          content: [{ type: "text", text: `File created: ${normPath}` }],
        };
      } catch (error: unknown) {
        return {
          content: [
            {
              type: "text",
              text: `Error creating file: ${getErrorMessage(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
