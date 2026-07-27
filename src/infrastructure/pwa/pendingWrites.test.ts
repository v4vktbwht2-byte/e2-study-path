import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createPendingUpdateWriteCoordinator,
  PendingWriteCoordinationUnavailableError,
  PendingWriteSupersededError,
  type PendingUpdateWriteCoordinator,
  type PendingWriteGenerationStore,
  type PendingWriteOriginLock,
} from "./pendingWrites";

interface QueuedOriginLock {
  readonly mode: "shared" | "exclusive";
  readonly operation: () => Promise<unknown>;
  readonly resolve: (value: unknown) => void;
  readonly reject: (reason?: unknown) => void;
}

class TestOriginLock {
  private readonly queue: QueuedOriginLock[] = [];
  private activeSharedCount = 0;
  private exclusiveActive = false;

  readonly withLock: PendingWriteOriginLock = <T>(
    mode: "shared" | "exclusive",
    operation: () => Promise<T>,
  ): Promise<T> =>
    new Promise<T>((resolve, reject) => {
      this.queue.push({
        mode,
        operation,
        resolve: (value) => resolve(value as T),
        reject,
      });
      this.drain();
    });

  private drain(): void {
    if (this.exclusiveActive) {
      return;
    }
    const next = this.queue[0];
    if (next === undefined) {
      return;
    }

    if (next.mode === "exclusive") {
      if (this.activeSharedCount > 0) {
        return;
      }
      this.queue.shift();
      this.exclusiveActive = true;
      void next
        .operation()
        .then(next.resolve, next.reject)
        .finally(() => {
          this.exclusiveActive = false;
          this.drain();
        });
      return;
    }

    while (this.queue[0]?.mode === "shared" && !this.exclusiveActive) {
      const shared = this.queue.shift();
      if (shared === undefined) {
        return;
      }
      this.activeSharedCount += 1;
      void shared
        .operation()
        .then(shared.resolve, shared.reject)
        .finally(() => {
          this.activeSharedCount -= 1;
          this.drain();
        });
    }
  }
}

interface TestCoordinatorRuntime {
  readonly createCoordinator: () => PendingUpdateWriteCoordinator;
  readonly readGeneration: () => number;
}

function createTestCoordinatorRuntime(): TestCoordinatorRuntime {
  const originLock = new TestOriginLock();
  let generation = 0;
  const generationStore: PendingWriteGenerationStore = {
    read: () => generation,
    write: (nextGeneration) => {
      generation = nextGeneration;
    },
  };

  return {
    createCoordinator: () =>
      createPendingUpdateWriteCoordinator({
        withOriginLock: originLock.withLock,
        generationStore,
      }),
    readGeneration: () => generation,
  };
}

let coordinator: PendingUpdateWriteCoordinator;

beforeEach(() => {
  coordinator = createTestCoordinatorRuntime().createCoordinator();
});

describe("更新前の保留書き込み", () => {
  it("登録済みと待機中に追加された書き込みが完了するまで待つ", async () => {
    let finishFirst: (() => void) | undefined;
    let finishSecond: (() => void) | undefined;
    const first = new Promise<void>((resolve) => {
      finishFirst = resolve;
    });
    const second = new Promise<void>((resolve) => {
      finishSecond = resolve;
    });
    const trackedFirst = coordinator.trackPendingUpdateWrite("first", () => first);

    let flushCompleted = false;
    const flushing = coordinator.flushPendingUpdateWrites();
    void flushing.then(() => {
      flushCompleted = true;
    });
    const trackedSecond = coordinator.trackPendingUpdateWrite("second", () => second);
    expect(coordinator.countPendingUpdateWrites()).toBe(2);
    await Promise.resolve();

    finishFirst?.();
    await trackedFirst;
    const completedBeforeSecond = flushCompleted;
    finishSecond?.();
    await trackedSecond;
    await expect(flushing).resolves.toBeUndefined();
    expect(completedBeforeSecond).toBe(false);
    expect(coordinator.countPendingUpdateWrites()).toBe(0);
  });

  it("書き込み失敗がsettleした後も更新可能として扱わない", async () => {
    const write = coordinator.trackPendingUpdateWrite("daily-plan", () =>
      Promise.reject(new Error("IndexedDBへの保存失敗")),
    );
    await write.catch(() => undefined);

    expect(coordinator.countPendingUpdateWrites()).toBe(0);
    expect(coordinator.countFailedUpdateWrites()).toBe(1);
    await expect(coordinator.flushPendingUpdateWrites()).rejects.toThrow(
      "保留中の学習データを保存できませんでした。",
    );
  });

  it("同じ操作の新しい再保存が成功した場合だけ失敗を解除する", async () => {
    const failed = coordinator.trackPendingUpdateWrite("daily-plan", () =>
      Promise.reject(new Error("初回失敗")),
    );
    await failed.catch(() => undefined);
    await coordinator.trackPendingUpdateWrite("other-operation", () =>
      Promise.resolve(),
    );

    await expect(coordinator.flushPendingUpdateWrites()).rejects.toThrow();
    expect(coordinator.countFailedUpdateWrites()).toBe(1);

    await coordinator.trackPendingUpdateWrite("daily-plan", () => Promise.resolve());
    await expect(coordinator.flushPendingUpdateWrites()).resolves.toBeUndefined();
    expect(coordinator.countFailedUpdateWrites()).toBe(0);
  });

  it("新しい保存成功より遅れて古い保存が失敗しても失敗を復活させない", async () => {
    let rejectOld: ((error: Error) => void) | undefined;
    const oldWrite = coordinator.trackPendingUpdateWrite(
      "daily-plan",
      () =>
        new Promise<void>((_, reject) => {
          rejectOld = reject;
        }),
    );
    void oldWrite.catch(() => undefined);
    await coordinator.trackPendingUpdateWrite("daily-plan", () => Promise.resolve());

    rejectOld?.(new Error("古い保存の失敗"));
    await Promise.resolve();

    await expect(coordinator.flushPendingUpdateWrites()).resolves.toBeUndefined();
    expect(coordinator.countFailedUpdateWrites()).toBe(0);
  });

  it("全削除は同じタブの既存書き込みを待ち、排他区間の新規書き込みを拒否する", async () => {
    let finishOld: (() => void) | undefined;
    const oldWriteStarted = vi.fn();
    const oldWritePromise = new Promise<void>((resolve) => {
      finishOld = resolve;
    });
    const oldWrite = coordinator.trackPendingUpdateWrite("today-plan", () => {
      oldWriteStarted();
      return oldWritePromise;
    });
    const destructiveWrite = vi.fn(() => Promise.resolve("deleted"));
    const exclusive = coordinator.runExclusivePendingUpdateWrite(
      "data-management:delete-all-user-data",
      destructiveWrite,
    );
    const staleWrite = vi.fn(() => Promise.resolve());
    const rejectedStaleWrite = coordinator.trackPendingUpdateWrite(
      "writing-draft",
      staleWrite,
    );

    const staleError = await rejectedStaleWrite.catch((error: unknown) => error);
    const destructiveStartedBeforeOldFinished = destructiveWrite.mock.calls.length > 0;
    finishOld?.();
    await expect(oldWrite).resolves.toBeUndefined();
    await expect(exclusive).resolves.toBe("deleted");

    expect(oldWriteStarted).toHaveBeenCalledOnce();
    expect(destructiveStartedBeforeOldFinished).toBe(false);
    expect(staleError).toBeInstanceOf(PendingWriteSupersededError);
    expect(staleWrite).not.toHaveBeenCalled();
    expect(destructiveWrite).toHaveBeenCalledOnce();

    const freshWrite = vi.fn(() => Promise.resolve());
    await expect(
      coordinator.trackPendingUpdateWrite("today-plan", freshWrite),
    ).resolves.toBeUndefined();
    expect(freshWrite).toHaveBeenCalledOnce();
  });

  it("全置換は置換対象になった過去の保存失敗を破棄して実行する", async () => {
    const failed = coordinator.trackPendingUpdateWrite("writing-draft", () =>
      Promise.reject(new Error("置換前データの保存失敗")),
    );
    void failed.catch(() => undefined);

    const replace = vi.fn(() => Promise.resolve("replaced"));
    await expect(
      coordinator.runExclusivePendingUpdateWrite(
        "data-management:restore-backup",
        replace,
        { discardPriorFailures: true },
      ),
    ).resolves.toBe("replaced");

    expect(replace).toHaveBeenCalledOnce();
    expect(coordinator.countFailedUpdateWrites()).toBe(0);
    await expect(coordinator.flushPendingUpdateWrites()).resolves.toBeUndefined();
  });

  it("全置換自体が失敗した場合は置換前の保存失敗を破棄しない", async () => {
    const failed = coordinator.trackPendingUpdateWrite("writing-draft", () =>
      Promise.reject(new Error("置換前データの保存失敗")),
    );
    void failed.catch(() => undefined);

    await expect(
      coordinator.runExclusivePendingUpdateWrite(
        "data-management:restore-backup",
        () => Promise.reject(new Error("安全バックアップ失敗")),
        { discardPriorFailures: true },
      ),
    ).rejects.toThrow("安全バックアップ失敗");

    expect(coordinator.countFailedUpdateWrites()).toBe(2);
    await expect(coordinator.flushPendingUpdateWrites()).rejects.toThrow(
      "保留中の学習データを保存できませんでした。",
    );
  });

  it("mergeは未解決の保存失敗がある場合に開始しない", async () => {
    const failed = coordinator.trackPendingUpdateWrite("writing-draft", () =>
      Promise.reject(new Error("下書き保存失敗")),
    );
    await failed.catch(() => undefined);
    const merge = vi.fn(() => Promise.resolve());

    await expect(
      coordinator.runExclusivePendingUpdateWrite(
        "data-management:restore-backup",
        merge,
      ),
    ).rejects.toThrow("保留中の学習データを保存できませんでした。");
    expect(merge).not.toHaveBeenCalled();
  });

  it("失敗したmergeは同じ操作keyの再試行成功で回復できる", async () => {
    const firstMerge = coordinator.runExclusivePendingUpdateWrite(
      "data-management:restore-backup",
      () => Promise.reject(new Error("merge失敗")),
    );
    await firstMerge.catch(() => undefined);
    const retry = vi.fn(() => Promise.resolve("merged"));

    await expect(
      coordinator.runExclusivePendingUpdateWrite(
        "data-management:restore-backup",
        retry,
      ),
    ).resolves.toBe("merged");
    expect(retry).toHaveBeenCalledOnce();
    expect(coordinator.countFailedUpdateWrites()).toBe(0);
    await expect(coordinator.flushPendingUpdateWrites()).resolves.toBeUndefined();
  });

  it("別タブで全削除した後は旧タブの待機中・新規書き込みを拒否する", async () => {
    const runtime = createTestCoordinatorRuntime();
    const oldTab = runtime.createCoordinator();
    const destructiveTab = runtime.createCoordinator();
    let finishExistingWrite: (() => void) | undefined;
    const existingWrite = oldTab.trackPendingUpdateWrite(
      "writing-draft:existing",
      () =>
        new Promise<void>((resolve) => {
          finishExistingWrite = resolve;
        }),
    );
    await vi.waitFor(() => expect(finishExistingWrite).toBeTypeOf("function"));

    const destructiveWrite = vi.fn(() => Promise.resolve("deleted"));
    const deletion = destructiveTab.runExclusivePendingUpdateWrite(
      "data-management:delete-all-user-data",
      destructiveWrite,
      { discardPriorFailures: true },
    );
    const queuedStaleWrite = vi.fn(() => Promise.resolve());
    const queuedStaleError = oldTab
      .trackPendingUpdateWrite("writing-draft:queued", queuedStaleWrite)
      .catch((error: unknown) => error);

    expect(destructiveWrite).not.toHaveBeenCalled();
    finishExistingWrite?.();
    await expect(existingWrite).resolves.toBeUndefined();
    await expect(deletion).resolves.toBe("deleted");
    expect(await queuedStaleError).toBeInstanceOf(PendingWriteSupersededError);
    expect(queuedStaleWrite).not.toHaveBeenCalled();
    expect(runtime.readGeneration()).toBe(1);

    const newStaleWrite = vi.fn(() => Promise.resolve());
    await expect(
      oldTab.trackPendingUpdateWrite("writing-draft:after-delete", newStaleWrite),
    ).rejects.toBeInstanceOf(PendingWriteSupersededError);
    expect(newStaleWrite).not.toHaveBeenCalled();

    const reloadedTab = runtime.createCoordinator();
    const freshWrite = vi.fn(() => Promise.resolve());
    await expect(
      reloadedTab.trackPendingUpdateWrite("writing-draft:fresh", freshWrite),
    ).resolves.toBeUndefined();
    expect(freshWrite).toHaveBeenCalledOnce();
  });

  it("排他処理が失敗しても旧タブを失効させ、部分更新の書き戻しを防ぐ", async () => {
    const runtime = createTestCoordinatorRuntime();
    const oldTab = runtime.createCoordinator();
    const destructiveTab = runtime.createCoordinator();

    await expect(
      destructiveTab.runExclusivePendingUpdateWrite(
        "data-management:restore-backup",
        () => Promise.reject(new Error("復元途中の失敗")),
      ),
    ).rejects.toThrow("復元途中の失敗");
    expect(runtime.readGeneration()).toBe(1);

    const staleWrite = vi.fn(() => Promise.resolve());
    await expect(
      oldTab.trackPendingUpdateWrite("writing-draft:stale", staleWrite),
    ).rejects.toBeInstanceOf(PendingWriteSupersededError);
    expect(staleWrite).not.toHaveBeenCalled();
  });

  it("バックアップbarrierは別タブの既存書き込みを待ち、新規書き込みをsnapshot後へ送る", async () => {
    const runtime = createTestCoordinatorRuntime();
    const writerTab = runtime.createCoordinator();
    const backupTab = runtime.createCoordinator();
    let finishExistingWrite: (() => void) | undefined;
    const existingWrite = writerTab.trackPendingUpdateWrite(
      "lesson-attempt:existing",
      () =>
        new Promise<void>((resolve) => {
          finishExistingWrite = resolve;
        }),
    );
    await vi.waitFor(() => expect(finishExistingWrite).toBeTypeOf("function"));

    let finishSnapshot: ((artifact: string) => void) | undefined;
    const snapshotStarted = vi.fn();
    const snapshot = backupTab.runPendingUpdateSnapshotBarrier(
      "data-management:export-backup",
      () =>
        new Promise<string>((resolve) => {
          snapshotStarted();
          finishSnapshot = resolve;
        }),
    );
    const queuedWriteFactory = vi.fn(() => Promise.resolve());
    const queuedWrite = writerTab.trackPendingUpdateWrite(
      "lesson-attempt:queued",
      queuedWriteFactory,
    );
    await Promise.resolve();

    expect(snapshotStarted).not.toHaveBeenCalled();
    expect(queuedWriteFactory).not.toHaveBeenCalled();
    finishExistingWrite?.();
    await expect(existingWrite).resolves.toBeUndefined();
    await vi.waitFor(() => expect(snapshotStarted).toHaveBeenCalledOnce());
    expect(queuedWriteFactory).not.toHaveBeenCalled();

    finishSnapshot?.("backup.json");
    await expect(snapshot).resolves.toBe("backup.json");
    await expect(queuedWrite).resolves.toBeUndefined();
    expect(queuedWriteFactory).toHaveBeenCalledOnce();
    expect(runtime.readGeneration()).toBe(0);
  });

  it("バックアップbarrierの失敗は保存失敗台帳へ残さない", async () => {
    const snapshot = coordinator.runPendingUpdateSnapshotBarrier(
      "data-management:export-backup",
      () => Promise.reject(new Error("snapshot失敗")),
    );

    await expect(snapshot).rejects.toThrow("snapshot失敗");
    expect(coordinator.countFailedUpdateWrites()).toBe(0);
    await expect(coordinator.flushPendingUpdateWrites()).resolves.toBeUndefined();
  });

  it("Web Locks非対応時は通常書き込みを維持し、破壊操作を安全側で拒否する", async () => {
    let generation = 0;
    const fallbackCoordinator = createPendingUpdateWriteCoordinator({
      generationStore: {
        read: () => generation,
        write: (nextGeneration) => {
          generation = nextGeneration;
        },
      },
    });
    let finishWrite: (() => void) | undefined;
    const normalWrite = fallbackCoordinator.trackPendingUpdateWrite(
      "writing-draft",
      () =>
        new Promise<void>((resolve) => {
          finishWrite = resolve;
        }),
    );
    await vi.waitFor(() => expect(finishWrite).toBeTypeOf("function"));

    const destructiveWrite = vi.fn(() => Promise.resolve());
    await expect(
      fallbackCoordinator.runExclusivePendingUpdateWrite(
        "data-management:delete-all-user-data",
        destructiveWrite,
      ),
    ).rejects.toBeInstanceOf(PendingWriteCoordinationUnavailableError);
    expect(destructiveWrite).not.toHaveBeenCalled();

    finishWrite?.();
    await expect(normalWrite).resolves.toBeUndefined();
  });

  it("Web Locks非対応時はバックアップsnapshotも開始しない", async () => {
    const fallbackCoordinator = createPendingUpdateWriteCoordinator({
      generationStore: {
        read: () => 0,
        write: () => undefined,
      },
    });
    const snapshot = vi.fn(() => Promise.resolve("backup.json"));

    await expect(
      fallbackCoordinator.runPendingUpdateSnapshotBarrier(
        "data-management:export-backup",
        snapshot,
      ),
    ).rejects.toBeInstanceOf(PendingWriteCoordinationUnavailableError);
    expect(snapshot).not.toHaveBeenCalled();
  });

  it("世代番号を永続化できない場合は破壊処理を開始しない", async () => {
    const immediateLock: PendingWriteOriginLock = async (_mode, operation) =>
      operation();
    const unsafeStore: PendingWriteGenerationStore = {
      read: () => 0,
      write: () => {
        throw new Error("localStorageへの保存失敗");
      },
    };
    const unsafeCoordinator = createPendingUpdateWriteCoordinator({
      withOriginLock: immediateLock,
      generationStore: unsafeStore,
    });
    const destructiveWrite = vi.fn(() => Promise.resolve());

    await expect(
      unsafeCoordinator.runExclusivePendingUpdateWrite(
        "data-management:delete-all-user-data",
        destructiveWrite,
      ),
    ).rejects.toBeInstanceOf(PendingWriteCoordinationUnavailableError);
    expect(destructiveWrite).not.toHaveBeenCalled();
  });
});
