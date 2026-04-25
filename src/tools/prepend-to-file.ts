/**
 * vault-mcp-prepend-to-file — insert content at the BEGINNING of an existing file.
 * Errors if the file does not exist.
 *
 * Notably useful for adding YAML frontmatter to a file that doesn't have one yet.
 */

import { App } from "obsidian";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { resolveFileOrThrow } from "../lib/path-utils";
import { rollbackStore } from "../lib/rollback-store";
import { getErrorMessage } from "../utils/helpers";

export const description =
  "PREPEND content to the beginning of an existing file. ERRORS if the file does not exist. " +
  "Useful for adding YAML frontmatter. Saves a rollback snapshot before mutating.";

export function registerPrependToFileHandler(app: App, mcpServer: McpServer) {
  mcpServer.tool(
    "vault-mcp-prepend-to-file",
    description,
    {
      path: z.string().describe("Path to the file in the vault."),
      content: z.string().describe("Content to insert at the beginning of the file."),
    },
    async ({ path, content }) => {
      try {
        const { path: normPath, file } = resolveFileOrThrow(app, path);
        await rollbackStore.snapshot(app, normPath, "prepend-to-file");
        await app.vault.process(file, current => {
          const sep = content.endsWith("\n") || current.length === 0 ? "" : "\n";
          return content + sep + current;
        });
        return {
          content: [{ type: "text", text: `Prepended to: ${normPath}` }],
        };
      } catch (error: unknown) {
        return {
          content: [
            {
              type: "text",
              text: `Error prepending to file: ${getErrorMessage(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
