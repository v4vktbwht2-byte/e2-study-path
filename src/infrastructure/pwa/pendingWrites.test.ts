import { afterEach, describe, expect, it, vi } from "vitest";
import {
  countFailedUpdateWrites,
  countPendingUpdateWrites,
  flushPendingUpdateWrites,
  PendingWriteSupersededError,
  resetPendingUpdateWriteFailures,
  runExclusivePendingUpdateWrite,
  trackPendingUpdateWrite,
} from "./pendingWrites";

afterEach(() => {
  resetPendingUpdateWriteFailures();
});

describe("更新前の保留書込み", () => {
  it("登録済みと待機中に追加された書込みが完了するまで待つ", async () => {
    let finishFirst: (() => void) | undefined;
    let finishSecond: (() => void) | undefined;
    const first = new Promise<void>((resolve) => {
      finishFirst = resolve;
    });
    const second = new Promise<void>((resolve) => {
      finishSecond = resolve;
    });
    const trackedFirst = trackPendingUpdateWrite("first", () => first);

    let flushCompleted = false;
    const flushing = flushPendingUpdateWrites();
    void flushing.then(() => {
      flushCompleted = true;
    });
    const trackedSecond = trackPendingUpdateWrite("second", () => second);
    expect(countPendingUpdateWrites()).toBe(2);
    await Promise.resolve();

    finishFirst?.();
    await trackedFirst;
    const completedBeforeSecond = flushCompleted;
    finishSecond?.();
    await trackedSecond;
    await expect(flushing).resolves.toBeUndefined();
    expect(completedBeforeSecond).toBe(false);
    expect(countPendingUpdateWrites()).toBe(0);
  });

  it("書込み失敗がsettleした後も更新可能として扱わない", async () => {
    const write = trackPendingUpdateWrite("daily-plan", () =>
      Promise.reject(new Error("IndexedDBへの保存失敗")),
    );
    await write.catch(() => undefined);

    expect(countPendingUpdateWrites()).toBe(0);
    expect(countFailedUpdateWrites()).toBe(1);
    await expect(flushPendingUpdateWrites()).rejects.toThrow(
      "保留中の学習データを保存できませんでした。",
    );
  });

  it("同じ操作の新しい再保存が成功した場合だけ失敗を解除する", async () => {
    const failed = trackPendingUpdateWrite("daily-plan", () =>
      Promise.reject(new Error("初回失敗")),
    );
    await failed.catch(() => undefined);
    await trackPendingUpdateWrite("other-operation", () => Promise.resolve());

    await expect(flushPendingUpdateWrites()).rejects.toThrow();
    expect(countFailedUpdateWrites()).toBe(1);

    await trackPendingUpdateWrite("daily-plan", () => Promise.resolve());
    await expect(flushPendingUpdateWrites()).resolves.toBeUndefined();
    expect(countFailedUpdateWrites()).toBe(0);
  });

  it("新しい保存成功より遅れて古い保存が失敗しても失敗を復活させない", async () => {
    let rejectOld: ((error: Error) => void) | undefined;
    const oldWrite = trackPendingUpdateWrite(
      "daily-plan",
      () =>
        new Promise<void>((_, reject) => {
          rejectOld = reject;
        }),
    );
    void oldWrite.catch(() => undefined);
    await trackPendingUpdateWrite("daily-plan", () => Promise.resolve());

    rejectOld?.(new Error("古い保存の失敗"));
    await Promise.resolve();

    await expect(flushPendingUpdateWrites()).resolves.toBeUndefined();
    expect(countFailedUpdateWrites()).toBe(0);
  });

  it("全削除は既存書込みを待ち、排他区間で始まる古い書込みを実行しない", async () => {
    let finishOld: (() => void) | undefined;
    const oldWriteStarted = vi.fn();
    const oldWritePromise = new Promise<void>((resolve) => {
      finishOld = resolve;
    });
    const oldWrite = trackPendingUpdateWrite("today-plan", () => {
      oldWriteStarted();
      return oldWritePromise;
    });
    const destructiveWrite = vi.fn(() => Promise.resolve("deleted"));
    const exclusive = runExclusivePendingUpdateWrite(
      "data-management:delete-all-user-data",
      destructiveWrite,
    );
    const staleWrite = vi.fn(() => Promise.resolve());
    const rejectedStaleWrite = trackPendingUpdateWrite("writing-draft", staleWrite);

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
      trackPendingUpdateWrite("today-plan", freshWrite),
    ).resolves.toBeUndefined();
    expect(freshWrite).toHaveBeenCalledOnce();
  });

  it("全置換は置換対象になった古い保存失敗を破棄して実行する", async () => {
    const failed = trackPendingUpdateWrite("writing-draft", () =>
      Promise.reject(new Error("置換前データの保存失敗")),
    );
    void failed.catch(() => undefined);

    const replace = vi.fn(() => Promise.resolve("replaced"));
    await expect(
      runExclusivePendingUpdateWrite("data-management:restore-backup", replace, {
        discardPriorFailures: true,
      }),
    ).resolves.toBe("replaced");

    expect(replace).toHaveBeenCalledOnce();
    expect(countFailedUpdateWrites()).toBe(0);
    await expect(flushPendingUpdateWrites()).resolves.toBeUndefined();
  });

  it("全置換自体が失敗した場合は置換前の保存失敗を破棄しない", async () => {
    const failed = trackPendingUpdateWrite("writing-draft", () =>
      Promise.reject(new Error("置換前データの保存失敗")),
    );
    void failed.catch(() => undefined);

    await expect(
      runExclusivePendingUpdateWrite(
        "data-management:restore-backup",
        () => Promise.reject(new Error("安全バックアップ失敗")),
        { discardPriorFailures: true },
      ),
    ).rejects.toThrow("安全バックアップ失敗");

    expect(countFailedUpdateWrites()).toBe(2);
    await expect(flushPendingUpdateWrites()).rejects.toThrow(
      "保留中の学習データを保存できませんでした。",
    );
  });

  it("mergeは未解決の保存失敗がある場合に開始しない", async () => {
    const failed = trackPendingUpdateWrite("writing-draft", () =>
      Promise.reject(new Error("下書き保存失敗")),
    );
    await failed.catch(() => undefined);
    const merge = vi.fn(() => Promise.resolve());

    await expect(
      runExclusivePendingUpdateWrite("data-management:restore-backup", merge),
    ).rejects.toThrow("保留中の学習データを保存できませんでした。");
    expect(merge).not.toHaveBeenCalled();
    expect(countFailedUpdateWrites()).toBe(1);
  });

  it("失敗したmergeは同じ操作keyの再試行成功で回復できる", async () => {
    const firstMerge = runExclusivePendingUpdateWrite(
      "data-management:restore-backup",
      () => Promise.reject(new Error("merge失敗")),
    );
    await firstMerge.catch(() => undefined);
    const retry = vi.fn(() => Promise.resolve("merged"));

    await expect(
      runExclusivePendingUpdateWrite("data-management:restore-backup", retry),
    ).resolves.toBe("merged");
    expect(retry).toHaveBeenCalledOnce();
    expect(countFailedUpdateWrites()).toBe(0);
    await expect(flushPendingUpdateWrites()).resolves.toBeUndefined();
  });
});
