/**
 * vault-mcp-replace-file — fully overwrite an existing file's content.
 * Errors if the path does not exist (use create-file in that case).
 *
 * Saves a rollback snapshot before mutating. Use vault-mcp-rollback-edit to undo.
 */

import { App } from "obsidian";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { resolveFileOrThrow } from "../lib/path-utils";
import { rollbackStore } from "../lib/rollback-store";
import { getErrorMessage } from "../utils/helpers";

export const description =
  "REPLACE the entire content of an existing file. ERRORS if the file does not exist. " +
  "Saves a rollback snapshot before mutating.";

export function registerReplaceFileHandler(app: App, mcpServer: McpServer) {
  mcpServer.tool(
    "vault-mcp-replace-file",
    description,
    {
      path: z.string().describe("Path to the file in the vault."),
      content: z.string().describe("Full new content of the file."),
    },
    async ({ path, content }) => {
      try {
        const { path: normPath, file } = resolveFileOrThrow(app, path);
        await rollbackStore.snapshot(app, normPath, "replace-file");
        await app.vault.modify(file, content);
        return {
          content: [{ type: "text", text: `File replaced: ${normPath}` }],
        };
      } catch (error: unknown) {
        return {
          content: [
            {
              type: "text",
              text: `Error replacing file: ${getErrorMessage(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
