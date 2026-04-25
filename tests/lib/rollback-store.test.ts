/**
 * Unit tests for the rollback store.
 *
 * Mocks the Obsidian App at the level of `vault.getAbstractFileByPath` and
 * `vault.read` to avoid pulling in the full Obsidian runtime.
 */

import { rollbackStore } from "../../src/lib/rollback-store";
import { TFile } from "obsidian";

describe("rollback-store", () => {
  beforeEach(() => {
    rollbackStore._clear();
  });

  it("snapshots existing files with their content", async () => {
    const file = new TFile();
    file.path = "note.md";

    const fakeApp = {
      vault: {
        getAbstractFileByPath: jest.fn().mockReturnValue(file),
        read: jest.fn().mockResolvedValue("hello world"),
      },
    } as unknown as Parameters<typeof rollbackStore.snapshot>[0];

    await rollbackStore.snapshot(fakeApp, "note.md", "test-replace");

    const peeked = rollbackStore.peek("note.md");
    expect(peeked).not.toBeNull();
    expect(peeked!.previousContent).toBe("hello world");
    expect(peeked!.existedBefore).toBe(true);
    expect(peeked!.reason).toBe("test-replace");
  });

  it("snapshots missing files with existedBefore=false", async () => {
    const fakeApp = {
      vault: {
        getAbstractFileByPath: jest.fn().mockReturnValue(null),
        read: jest.fn(),
      },
    } as unknown as Parameters<typeof rollbackStore.snapshot>[0];

    await rollbackStore.snapshot(fakeApp, "missing.md", "test-create");

    const peeked = rollbackStore.peek("missing.md");
    expect(peeked).not.toBeNull();
    expect(peeked!.existedBefore).toBe(false);
    expect(peeked!.previousContent).toBeNull();
  });

  it("pop consumes the entry, peek does not", async () => {
    const fakeApp = {
      vault: {
        getAbstractFileByPath: jest.fn().mockReturnValue(null),
        read: jest.fn(),
      },
    } as unknown as Parameters<typeof rollbackStore.snapshot>[0];

    await rollbackStore.snapshot(fakeApp, "x.md", "r");
    expect(rollbackStore.peek("x.md")).not.toBeNull();
    expect(rollbackStore.peek("x.md")).not.toBeNull();
    expect(rollbackStore.pop("x.md")).not.toBeNull();
    expect(rollbackStore.pop("x.md")).toBeNull();
  });
});
