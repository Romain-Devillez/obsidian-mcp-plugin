/**
 * vault-mcp-update-frontmatter — set or remove individual keys in a file's
 * YAML frontmatter without touching its body.
 *
 * Uses Obsidian's `app.fileManager.processFrontMatter`, which is the official,
 * cache-aware way to mutate YAML metadata. This avoids the YAML parsing pitfalls
 * we'd run into trying to do it ourselves.
 */

import { App } from "obsidian";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { resolveFileOrThrow } from "../lib/path-utils";
import { rollbackStore } from "../lib/rollback-store";
import { getErrorMessage } from "../utils/helpers";

export const description =
  "Update YAML frontmatter keys without touching the body of the file. " +
  "Pass `set` to set/replace keys (object, value `null` removes the key), " +
  "pass `unset` as a list of keys to delete. " +
  "Saves a rollback snapshot before mutating.";

const SetSchema = z
  .record(z.string(), z.unknown())
  .optional()
  .describe(
    "Object of keys to set. To remove a key, pass null as its value (or use `unset`).",
  );

const UnsetSchema = z
  .array(z.string())
  .optional()
  .describe("List of keys to remove from the frontmatter.");

export function registerUpdateFrontmatterHandler(app: App, mcpServer: McpServer) {
  mcpServer.tool(
    "vault-mcp-update-frontmatter",
    description,
    {
      path: z.string().describe("Path to the file in the vault."),
      set: SetSchema,
      unset: UnsetSchema,
    },
    async ({ path, set, unset }) => {
      try {
        const { path: normPath, file } = resolveFileOrThrow(app, path);

        if (!set && !unset) {
          return {
            content: [
              {
                type: "text",
                text: "No-op: provide `set` and/or `unset` to modify frontmatter.",
              },
            ],
            isError: true,
          };
        }

        await rollbackStore.snapshot(app, normPath, "update-frontmatter");

        await app.fileManager.processFrontMatter(file, fm => {
          if (set) {
            for (const [key, value] of Object.entries(set)) {
              if (value === null) {
                delete (fm as Record<string, unknown>)[key];
              } else {
                (fm as Record<string, unknown>)[key] = value;
              }
            }
          }
          if (unset) {
            for (const key of unset) {
              delete (fm as Record<string, unknown>)[key];
            }
          }
        });

        return {
          content: [{ type: "text", text: `Frontmatter updated: ${normPath}` }],
        };
      } catch (error: unknown) {
        return {
          content: [
            {
              type: "text",
              text: `Error updating frontmatter: ${getErrorMessage(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
