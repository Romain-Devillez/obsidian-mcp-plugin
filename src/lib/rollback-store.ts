/**
 * In-memory rollback store keyed by normalized file path.
 *
 * Each destructive operation saves the previous file content here BEFORE
 * applying its change. The `rollback-edit` tool restores the most recent entry.
 *
 * Behaviour:
 * - Stores at most one snapshot per path (latest).
 * - Snapshots include a timestamp and a free-form reason for audit/UX.
 * - The store is per-plugin-instance and not persisted across Obsidian reloads.
 *   That's a deliberate trade-off: in-session rollback is the use case.
 */

import { App, TFile, normalizePath } from "obsidian";

export interface RollbackEntry {
  /** Normalized vault-relative path. */
  path: string;
  /** Snapshot of the file content (or null if the file did not exist before). */
  previousContent: string | null;
  /** Whether the file existed before the operation. Used to know whether rollback
   *  must recreate or just rewrite. */
  existedBefore: boolean;
  /** Tool / reason that triggered the snapshot, eg "replace-file", "delete-file". */
  reason: string;
  /** ISO timestamp. */
  at: string;
}

export class RollbackStore {
  private entries = new Map<string, RollbackEntry>();

  /**
   * Save a snapshot of the current file content (or absence) before mutating it.
   */
  async snapshot(app: App, path: string, reason: string): Promise<void> {
    const normPath = normalizePath(path);
    const file = app.vault.getAbstractFileByPath(normPath);

    let previousContent: string | null = null;
    let existedBefore = false;

    if (file instanceof TFile) {
      previousContent = await app.vault.read(file);
      existedBefore = true;
    }

    this.entries.set(normPath, {
      path: normPath,
      previousContent,
      existedBefore,
      reason,
      at: new Date().toISOString(),
    });
  }

  /**
   * Pop the most recent snapshot for a path. Returns null if none.
   */
  pop(path: string): RollbackEntry | null {
    const normPath = normalizePath(path);
    const entry = this.entries.get(normPath);
    if (!entry) return null;
    this.entries.delete(normPath);
    return entry;
  }

  /**
   * Peek the most recent snapshot for a path without consuming it.
   * Useful for UX before triggering rollback.
   */
  peek(path: string): RollbackEntry | null {
    return this.entries.get(normalizePath(path)) ?? null;
  }

  /** For tests only. */
  _clear(): void {
    this.entries.clear();
  }
}

// Module-level singleton. The plugin uses one global store.
export const rollbackStore = new RollbackStore();
