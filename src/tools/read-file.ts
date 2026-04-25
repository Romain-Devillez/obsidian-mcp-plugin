/**
 * vault-mcp-read-file — read a file's content as plain text.
 */

import { App } from "obsidian";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { resolveTFileOrError } from "../utils/helpers";

export const description =
  "Read the content of a file from the vault as plain text. " +
  "If the path is not found, suggests similar files via fuzzy match.";

export function registerReadFileHandler(app: App, mcpServer: McpServer) {
  mcpServer.tool(
    "vault-mcp-read-file",
    description,
    {
      path: z.string().describe("Path to the file in the vault."),
    },
    async ({ path }) => {
      try {
        const result = resolveTFileOrError(app, path);
        if ("error" in result) return result;
        const { file } = result;
        const content = await app.vault.cachedRead(file);
        return {
          content: [{ type: "text", text: content }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error reading file: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
