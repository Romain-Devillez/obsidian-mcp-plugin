/**
 * vault-mcp-read-frontmatter — return the YAML frontmatter of a file as JSON.
 *
 * Designed for AI agents that want to query a note's metadata (tags, status,
 * created date, etc.) without parsing markdown themselves.
 *
 * Uses Obsidian's metadata cache when available (canonical source of truth),
 * falling back to our internal parser if the cache hasn't indexed yet.
 */

import { App } from "obsidian";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { resolveFileOrThrow } from "../lib/path-utils";
import { parseSimpleYaml, splitFrontmatter } from "../lib/frontmatter";
import { getErrorMessage } from "../utils/helpers";

export const description =
  "Read the YAML frontmatter of a file as a JSON object. " +
  "Returns an empty object if the file has no frontmatter.";

export function registerReadFrontmatterHandler(app: App, mcpServer: McpServer) {
  mcpServer.tool(
    "vault-mcp-read-frontmatter",
    description,
    {
      path: z.string().describe("Path to the file in the vault."),
    },
    async ({ path }) => {
      try {
        const { path: normPath, file } = resolveFileOrThrow(app, path);

        // Prefer the cached, properly-parsed metadata when present.
        const cache = app.metadataCache.getFileCache(file);
        if (cache?.frontmatter) {
          const fm = { ...(cache.frontmatter as Record<string, unknown>) };
          // Obsidian caches an internal "position" key — strip it.
          delete (fm as { position?: unknown }).position;
          return {
            content: [
              { type: "text", text: JSON.stringify({ path: normPath, frontmatter: fm }, null, 2) },
            ],
          };
        }

        // Fallback to our parser
        const content = await app.vault.read(file);
        const split = splitFrontmatter(content);
        const fm = split.hasFrontmatter ? parseSimpleYaml(split.rawFrontmatter) : {};
        return {
          content: [
            { type: "text", text: JSON.stringify({ path: normPath, frontmatter: fm }, null, 2) },
          ],
        };
      } catch (error: unknown) {
        return {
          content: [
            {
              type: "text",
              text: `Error reading frontmatter: ${getErrorMessage(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
