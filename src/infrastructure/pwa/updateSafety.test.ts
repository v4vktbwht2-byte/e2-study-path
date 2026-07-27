import { describe, expect, it, vi } from "vitest";
import { UpdateSafetyRegistry } from "./updateSafety";

describe("UpdateSafetyRegistry", () => {
  it("activeな学習がある間はflushせず更新を保留する", async () => {
    const registry = new UpdateSafetyRegistry();
    const flush = vi.fn(() => Promise.resolve());
    registry.register({
      id: "writing",
      isActive: () => true,
      flush,
    });

    await expect(registry.prepare()).resolves.toEqual({
      status: "blocked",
      activeParticipantIds: ["writing"],
    });
    expect(flush).not.toHaveBeenCalled();
  });

  it("activeな学習がなければ全participantの保存完了を待つ", async () => {
    const registry = new UpdateSafetyRegistry();
    const calls: string[] = [];
    registry.register({
      id: "writing",
      isActive: () => false,
      flush: () => {
        calls.push("writing");
        return Promise.resolve();
      },
    });
    registry.register({
      id: "lesson",
      isActive: () => false,
      flush: () => {
        calls.push("lesson");
        return Promise.resolve();
      },
    });

    await expect(registry.prepare()).resolves.toEqual({
      status: "ready",
      flushedParticipantIds: ["writing", "lesson"],
    });
    expect(calls).toEqual(["writing", "lesson"]);
  });

  it("1件でもflushに失敗したら更新可能と判定しない", async () => {
    const registry = new UpdateSafetyRegistry();
    const error = new Error("保存失敗");
    registry.register({
      id: "writing",
      isActive: () => false,
      flush: () => Promise.reject(error),
    });
    registry.register({
      id: "lesson",
      isActive: () => false,
      flush: () => Promise.resolve(),
    });

    await expect(registry.prepare()).resolves.toEqual({
      status: "flush-failed",
      failedParticipantIds: ["writing"],
      errors: [error],
    });
  });

  it("flush待機中に学習が始まった場合も更新を保留する", async () => {
    const registry = new UpdateSafetyRegistry();
    let active = false;
    let finishFlush: (() => void) | undefined;
    registry.register({
      id: "writing",
      isActive: () => active,
      flush: () =>
        new Promise<void>((resolve) => {
          finishFlush = resolve;
        }),
    });

    const preparation = registry.prepare();
    active = true;
    finishFlush?.();

    await expect(preparation).resolves.toEqual({
      status: "blocked",
      activeParticipantIds: ["writing"],
    });
  });

  it("解除済みparticipantはactive判定とflushの対象にしない", async () => {
    const registry = new UpdateSafetyRegistry();
    const flush = vi.fn(() => Promise.resolve());
    const unregister = registry.register({
      id: "mock",
      isActive: () => true,
      flush,
    });

    unregister();

    expect(registry.getActiveParticipantIds()).toEqual([]);
    await expect(registry.prepare()).resolves.toEqual({
      status: "ready",
      flushedParticipantIds: [],
    });
    expect(flush).not.toHaveBeenCalled();
  });
});
