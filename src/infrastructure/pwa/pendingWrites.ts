interface PendingWrite {
  readonly id: number;
  readonly key: string;
  readonly promise: Promise<unknown>;
}

interface FailedWrite {
  readonly id: number;
  readonly error: unknown;
}

export type PendingWriteOriginLock = <T>(
  mode: "shared" | "exclusive",
  operation: () => Promise<T>,
) => Promise<T>;

export interface PendingWriteGenerationStore {
  read(): number;
  write(generation: number): void;
}

export interface PendingUpdateWriteCoordinatorOptions {
  readonly withOriginLock?: PendingWriteOriginLock;
  readonly generationStore?: PendingWriteGenerationStore;
}

export interface PendingUpdateWriteCoordinator {
  trackPendingUpdateWrite<T>(key: string, write: () => Promise<T>): Promise<T>;
  runExclusivePendingUpdateWrite<T>(
    key: string,
    write: () => Promise<T>,
    options?: { readonly discardPriorFailures?: boolean },
  ): Promise<T>;
  runPendingUpdateSnapshotBarrier<T>(
    key: string,
    snapshot: () => Promise<T>,
  ): Promise<T>;
  flushPendingUpdateWrites(): Promise<void>;
  countPendingUpdateWrites(): number;
  countFailedUpdateWrites(): number;
  resetPendingUpdateWriteFailures(key?: string): void;
}

const ORIGIN_WRITE_LOCK_NAME = "e2-study-path:user-data-write:v1";
const ORIGIN_WRITE_GENERATION_KEY = "e2-study-path:user-data-generation:v1";

export class PendingWriteSupersededError extends Error {
  constructor() {
    super(
      "別のタブでデータが全削除または復元されたため、この画面からの保存を中止しました。ページを再読み込みしてください。",
    );
    this.name = "PendingWriteSupersededError";
  }
}

export class PendingWriteCoordinationUnavailableError extends Error {
  constructor() {
    super(
      "別タブを含む書き込みを安全に調停できないため、バックアップ・復元・全削除を実行できません。対応ブラウザーでページを再読み込みしてください。",
    );
    this.name = "PendingWriteCoordinationUnavailableError";
  }
}

function validateWriteKey(key: string): void {
  if (key.trim() === "") {
    throw new Error("更新待ち対象の書き込みキーを指定してください。");
  }
}

function validateGeneration(generation: number): number {
  if (!Number.isSafeInteger(generation) || generation < 0) {
    throw new Error("書き込み世代が不正です。");
  }
  return generation;
}

/**
 * 1つのcoordinatorが1つのブラウザータブに相当する。
 * generationは生成時に固定し、storage eventでは更新しない。
 */
export function createPendingUpdateWriteCoordinator(
  options: PendingUpdateWriteCoordinatorOptions = {},
): PendingUpdateWriteCoordinator {
  const pendingWrites = new Set<PendingWrite>();
  const failedWrites = new Map<string, FailedWrite>();
  const latestSuccessfulWriteIds = new Map<string, number>();
  const { generationStore, withOriginLock } = options;
  let nextWriteId = 1;
  let globallyResetThroughId = 0;
  let exclusiveWriteActive = false;
  let originExclusiveBarrierActive = false;
  let generationInitializationFailed = false;
  let tabGeneration: number | undefined;

  if (generationStore !== undefined) {
    try {
      tabGeneration = validateGeneration(generationStore.read());
    } catch {
      generationInitializationFailed = true;
    }
  }

  function registerPendingWrite<T>(
    key: string,
    write: Promise<T>,
    recordWriteOutcome = true,
  ): Promise<T> {
    const id = nextWriteId;
    nextWriteId += 1;
    const entry: PendingWrite = { id, key, promise: write };
    pendingWrites.add(entry);
    void write.then(
      () => {
        pendingWrites.delete(entry);
        if (!recordWriteOutcome) {
          return;
        }
        const latestSuccessfulId = Math.max(latestSuccessfulWriteIds.get(key) ?? 0, id);
        latestSuccessfulWriteIds.set(key, latestSuccessfulId);
        const failure = failedWrites.get(key);
        if (failure !== undefined && failure.id <= latestSuccessfulId) {
          failedWrites.delete(key);
        }
      },
      (error: unknown) => {
        pendingWrites.delete(entry);
        if (!recordWriteOutcome) {
          return;
        }
        const safelyHandledThroughId = Math.max(
          globallyResetThroughId,
          latestSuccessfulWriteIds.get(key) ?? 0,
        );
        if (safelyHandledThroughId < id) {
          const failure = failedWrites.get(key);
          if (failure === undefined || failure.id < id) {
            failedWrites.set(key, { id, error });
          }
        }
      },
    );
    return write;
  }

  async function settlePendingWritePromises(
    excludedPromise?: Promise<unknown>,
    throughId = Number.MAX_SAFE_INTEGER,
  ): Promise<void> {
    while (true) {
      const writes = [...pendingWrites].filter(
        (pendingWrite) =>
          pendingWrite.id <= throughId && pendingWrite.promise !== excludedPromise,
      );
      if (writes.length === 0) {
        return;
      }
      await Promise.allSettled(writes.map((pendingWrite) => pendingWrite.promise));
    }
  }

  function assertNoFailedWrites(exceptKey?: string): void {
    const unresolvedFailures = [...failedWrites.entries()].filter(
      ([key]) => key !== exceptKey,
    );
    if (unresolvedFailures.length > 0) {
      throw new AggregateError(
        unresolvedFailures.map(([, failure]) => failure.error),
        "保留中の学習データを保存できませんでした。",
      );
    }
  }

  function assertCurrentGeneration(): void {
    if (generationStore === undefined) {
      return;
    }
    if (generationInitializationFailed || tabGeneration === undefined) {
      throw new PendingWriteCoordinationUnavailableError();
    }

    let currentGeneration: number;
    try {
      currentGeneration = validateGeneration(generationStore.read());
    } catch {
      throw new PendingWriteCoordinationUnavailableError();
    }
    if (currentGeneration !== tabGeneration) {
      throw new PendingWriteSupersededError();
    }
  }

  function advanceGeneration(): void {
    if (
      generationStore === undefined ||
      generationInitializationFailed ||
      tabGeneration === undefined
    ) {
      throw new PendingWriteCoordinationUnavailableError();
    }

    assertCurrentGeneration();
    if (tabGeneration === Number.MAX_SAFE_INTEGER) {
      throw new PendingWriteCoordinationUnavailableError();
    }
    const nextGeneration = tabGeneration + 1;
    try {
      generationStore.write(nextGeneration);
      if (validateGeneration(generationStore.read()) !== nextGeneration) {
        throw new Error("書き込み世代を更新できませんでした。");
      }
    } catch {
      throw new PendingWriteCoordinationUnavailableError();
    }
    tabGeneration = nextGeneration;
  }

  function resetPendingUpdateWriteFailures(key?: string): void {
    if (key === undefined) {
      failedWrites.clear();
      latestSuccessfulWriteIds.clear();
      globallyResetThroughId = nextWriteId - 1;
      return;
    }
    failedWrites.delete(key);
    latestSuccessfulWriteIds.set(
      key,
      Math.max(latestSuccessfulWriteIds.get(key) ?? 0, nextWriteId - 1),
    );
  }

  function trackPendingUpdateWrite<T>(
    key: string,
    write: () => Promise<T>,
  ): Promise<T> {
    validateWriteKey(key);
    if (exclusiveWriteActive) {
      return Promise.reject(new PendingWriteSupersededError());
    }

    const trackedWrite = Promise.resolve().then(() => {
      if (withOriginLock === undefined) {
        assertCurrentGeneration();
        return write();
      }
      return withOriginLock("shared", async () => {
        assertCurrentGeneration();
        return write();
      });
    });
    return registerPendingWrite(key, trackedWrite);
  }

  async function runExclusivePendingUpdateWrite<T>(
    key: string,
    write: () => Promise<T>,
    runOptions: { readonly discardPriorFailures?: boolean } = {},
  ): Promise<T> {
    validateWriteKey(key);
    if (
      withOriginLock === undefined ||
      generationStore === undefined ||
      generationInitializationFailed ||
      tabGeneration === undefined
    ) {
      throw new PendingWriteCoordinationUnavailableError();
    }
    if (originExclusiveBarrierActive) {
      throw new Error("端末内データの復元または全削除をすでに実行しています。");
    }

    const pendingWriteCutoffId = nextWriteId - 1;
    originExclusiveBarrierActive = true;
    exclusiveWriteActive = true;
    const exclusivePromise = Promise.resolve().then(() =>
      withOriginLock("exclusive", async () => {
        await settlePendingWritePromises(exclusivePromise, pendingWriteCutoffId);
        if (runOptions.discardPriorFailures !== true) {
          assertNoFailedWrites(key);
        }

        // 破壊処理より先に世代を進める。処理が部分的に失敗した場合も、
        // 古い画面が不整合なデータを書き戻せないよう世代は戻さない。
        advanceGeneration();
        return write();
      }),
    );
    const trackedExclusiveWrite = registerPendingWrite(key, exclusivePromise);

    try {
      const result = await trackedExclusiveWrite;
      if (runOptions.discardPriorFailures === true) {
        resetPendingUpdateWriteFailures();
      }
      return result;
    } finally {
      exclusiveWriteActive = false;
      originExclusiveBarrierActive = false;
    }
  }

  async function runPendingUpdateSnapshotBarrier<T>(
    key: string,
    snapshot: () => Promise<T>,
  ): Promise<T> {
    validateWriteKey(key);
    if (
      withOriginLock === undefined ||
      generationStore === undefined ||
      generationInitializationFailed ||
      tabGeneration === undefined
    ) {
      throw new PendingWriteCoordinationUnavailableError();
    }
    if (originExclusiveBarrierActive) {
      throw new Error(
        "端末内データの復元・全削除・バックアップ書き出しをすでに実行しています。",
      );
    }

    const pendingWriteCutoffId = nextWriteId - 1;
    originExclusiveBarrierActive = true;
    const barrierPromise = Promise.resolve().then(() =>
      withOriginLock("exclusive", async () => {
        await settlePendingWritePromises(barrierPromise, pendingWriteCutoffId);
        assertCurrentGeneration();
        assertNoFailedWrites();
        return snapshot();
      }),
    );
    const trackedBarrier = registerPendingWrite(key, barrierPromise, false);
    try {
      return await trackedBarrier;
    } finally {
      originExclusiveBarrierActive = false;
    }
  }

  return {
    trackPendingUpdateWrite,
    runExclusivePendingUpdateWrite,
    runPendingUpdateSnapshotBarrier,
    flushPendingUpdateWrites: async () => {
      await settlePendingWritePromises();
      assertNoFailedWrites();
    },
    countPendingUpdateWrites: () => pendingWrites.size,
    countFailedUpdateWrites: () => failedWrites.size,
    resetPendingUpdateWriteFailures,
  };
}

function createBrowserOriginLock(): PendingWriteOriginLock | undefined {
  if (
    typeof navigator === "undefined" ||
    !("locks" in navigator) ||
    typeof navigator.locks?.request !== "function"
  ) {
    return undefined;
  }
  const lockManager = navigator.locks;
  return <T>(mode: "shared" | "exclusive", operation: () => Promise<T>): Promise<T> =>
    lockManager.request(ORIGIN_WRITE_LOCK_NAME, { mode }, () => operation());
}

function createBrowserGenerationStore(): PendingWriteGenerationStore | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  let storage: Storage;
  try {
    storage = window.localStorage;
  } catch {
    return undefined;
  }

  return {
    read: () => {
      const stored = storage.getItem(ORIGIN_WRITE_GENERATION_KEY);
      if (stored === null) {
        return 0;
      }
      return validateGeneration(Number(stored));
    },
    write: (generation) => {
      storage.setItem(ORIGIN_WRITE_GENERATION_KEY, String(generation));
    },
  };
}

export const pendingUpdateWriteCoordinator = createPendingUpdateWriteCoordinator({
  withOriginLock: createBrowserOriginLock(),
  generationStore: createBrowserGenerationStore(),
});

/**
 * 画面遷移後も続くIndexedDB書き込みをService Worker更新前の待機対象へ登録する。
 */
export function trackPendingUpdateWrite<T>(
  key: string,
  write: () => Promise<T>,
): Promise<T> {
  return pendingUpdateWriteCoordinator.trackPendingUpdateWrite(key, write);
}

/**
 * origin全体の通常書き込みを停止し、復元・全削除を排他的に実行する。
 */
export function runExclusivePendingUpdateWrite<T>(
  key: string,
  write: () => Promise<T>,
  options: { readonly discardPriorFailures?: boolean } = {},
): Promise<T> {
  return pendingUpdateWriteCoordinator.runExclusivePendingUpdateWrite(
    key,
    write,
    options,
  );
}

export function runPendingUpdateSnapshotBarrier<T>(
  key: string,
  snapshot: () => Promise<T>,
): Promise<T> {
  return pendingUpdateWriteCoordinator.runPendingUpdateSnapshotBarrier(key, snapshot);
}

export function flushPendingUpdateWrites(): Promise<void> {
  return pendingUpdateWriteCoordinator.flushPendingUpdateWrites();
}

export function countPendingUpdateWrites(): number {
  return pendingUpdateWriteCoordinator.countPendingUpdateWrites();
}

export function countFailedUpdateWrites(): number {
  return pendingUpdateWriteCoordinator.countFailedUpdateWrites();
}

/**
 * 全置換・全削除が成功し、過去の保存失敗が明示的に破棄された場合に使う。
 * origin共有generationはリセットしない。
 */
export function resetPendingUpdateWriteFailures(key?: string): void {
  pendingUpdateWriteCoordinator.resetPendingUpdateWriteFailures(key);
}
