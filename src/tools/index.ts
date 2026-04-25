/**
 * Central tool registry for vault-mcp-pro.
 *
 * Each tool exports:
 *   - `description`: human/LLM-readable description shown to clients
 *   - `register*Handler(app, mcpServer)`: registers the tool on the MCP server
 *
 * Tools are grouped by category for clarity, but all are registered uniformly.
 */

import { App } from "obsidian";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// READ
import { registerReadFileHandler, description as readDesc } from "./read-file";
import { registerListFilesHandler, description as listDesc } from "./list-files";
import { registerSearchContentsHandler, description as searchContentDesc } from "./search-contents";
import { registerSearchFilenamesHandler, description as searchNameDesc } from "./search-filenames";

// WRITE — body
import { registerCreateFileHandler, description as createDesc } from "./create-file";
import { registerReplaceFileHandler, description as replaceDesc } from "./replace-file";
import { registerAppendToFileHandler, description as appendDesc } from "./append-to-file";
import { registerPrependToFileHandler, description as prependDesc } from "./prepend-to-file";
import { registerEditFileHandler, description as editDesc } from "./edit-file";
import { registerRollbackEditHandler, description as rollbackDesc } from "./rollback-edit";

// FILE management
import { registerDeleteFileHandler, description as deleteDesc } from "./delete-file";
import { registerMoveFileHandler, description as moveDesc } from "./move-file";

// FRONTMATTER
import { registerReadFrontmatterHandler, description as fmReadDesc } from "./read-frontmatter";
import { registerUpdateFrontmatterHandler, description as fmUpdateDesc } from "./update-frontmatter";

import { ToolRegistry } from "@types";

export const VAULT_TOOLS: ToolRegistry = {
  // Read
  "vault-mcp-read-file": registerReadFileHandler,
  "vault-mcp-list-files": registerListFilesHandler,
  "vault-mcp-search-contents": registerSearchContentsHandler,
  "vault-mcp-search-filenames": registerSearchFilenamesHandler,

  // Write
  "vault-mcp-create-file": registerCreateFileHandler,
  "vault-mcp-replace-file": registerReplaceFileHandler,
  "vault-mcp-append-to-file": registerAppendToFileHandler,
  "vault-mcp-prepend-to-file": registerPrependToFileHandler,
  "vault-mcp-edit-file": registerEditFileHandler,
  "vault-mcp-rollback-edit": registerRollbackEditHandler,

  // File management
  "vault-mcp-delete-file": registerDeleteFileHandler,
  "vault-mcp-move-file": registerMoveFileHandler,

  // Frontmatter
  "vault-mcp-read-frontmatter": registerReadFrontmatterHandler,
  "vault-mcp-update-frontmatter": registerUpdateFrontmatterHandler,
};

export const TOOL_DESCRIPTIONS: Record<string, string> = {
  "vault-mcp-read-file": readDesc,
  "vault-mcp-list-files": listDesc,
  "vault-mcp-search-contents": searchContentDesc,
  "vault-mcp-search-filenames": searchNameDesc,
  "vault-mcp-create-file": createDesc,
  "vault-mcp-replace-file": replaceDesc,
  "vault-mcp-append-to-file": appendDesc,
  "vault-mcp-prepend-to-file": prependDesc,
  "vault-mcp-edit-file": editDesc,
  "vault-mcp-rollback-edit": rollbackDesc,
  "vault-mcp-delete-file": deleteDesc,
  "vault-mcp-move-file": moveDesc,
  "vault-mcp-read-frontmatter": fmReadDesc,
  "vault-mcp-update-frontmatter": fmUpdateDesc,
};

export function registerVaultTools(app: App, mcpServer: McpServer): void {
  for (const register of Object.values(VAULT_TOOLS)) {
    register(app, mcpServer);
  }
}
