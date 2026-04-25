/**
 * vault-mcp-append-to-file — append content to the END of an existing file.
 * Errors if the file does not exist (no auto-create).
 *
 * Always inserts a newline before the appended content if the file doesn't
 * already end with one. Useful for log-like notes (daily journal additions, etc).
 */

import { App } from "obsidian";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { resolveFileOrThrow } from "../lib/path-utils";
import { rollbackStore } from "../lib/rollback-store";
import { getErrorMessage } from "../utils/helpers";

export const description =
  "APPEND content to the end of an existing file. ERRORS if the file does not exist. " +
  "Inserts a newline separator if needed. Saves a rollback snapshot before mutating.";

export function registerAppendToFileHandler(app: App, mcpServer: McpServer) {
  mcpServer.tool(
    "vault-mcp-append-to-file",
    description,
    {
      path: z.string().describe("Path to the file in the vault."),
      content: z.string().describe("Content to append at the end of the file."),
    },
    async ({ path, content }) => {
      try {
        const { path: normPath, file } = resolveFileOrThrow(app, path);
        await rollbackStore.snapshot(app, normPath, "append-to-file");
        await app.vault.process(file, current => {
          const sep = current.endsWith("\n") || current.length === 0 ? "" : "\n";
          return current + sep + content;
        });
        return {
          content: [{ type: "text", text: `Appended to: ${normPath}` }],
        };
      } catch (error: unknown) {
        return {
          content: [
            {
              type: "text",
              text: `Error appending to file: ${getErrorMessage(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
