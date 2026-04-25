/**
 * Path utilities used across all write tools.
 */

import { App, TFile, normalizePath } from "obsidian";

export interface ResolvedFile {
  path: string;
  file: TFile;
}

/**
 * Resolve a path to a TFile. Throws a helpful error if the path resolves to a
 * folder or doesn't exist.
 */
export function resolveFileOrThrow(app: App, path: string): ResolvedFile {
  const normPath = normalizePath(path);
  const abstract = app.vault.getAbstractFileByPath(normPath);

  if (!abstract) {
    throw new Error(`File not found: ${normPath}`);
  }
  if (!(abstract instanceof TFile)) {
    throw new Error(`Path is not a file (folder?): ${normPath}`);
  }
  return { path: normPath, file: abstract };
}

/**
 * Returns true if any TAbstractFile (file OR folder) exists at this path.
 */
export function pathExists(app: App, path: string): boolean {
  return app.vault.getAbstractFileByPath(normalizePath(path)) !== null;
}

/**
 * Ensure all parent folders exist for the given path. Creates them if needed.
 */
export async function ensureParentFolders(app: App, path: string): Promise<void> {
  const normPath = normalizePath(path);
  const lastSlash = normPath.lastIndexOf("/");
  if (lastSlash <= 0) return;
  const folderPath = normPath.substring(0, lastSlash);
  if (app.vault.getAbstractFileByPath(folderPath)) return;

  try {
    await app.vault.createFolder(folderPath);
  } catch (rawErr: unknown) {
    // Tolerate concurrent / pre-existing folder creation
    let message: string;
    if (rawErr instanceof Error) {
      message = rawErr.message;
    } else if (typeof rawErr === "string") {
      message = rawErr;
    } else {
      message = JSON.stringify(rawErr);
    }
    if (!message.includes("already exists")) {
      throw new Error(message);
    }
  }
}
