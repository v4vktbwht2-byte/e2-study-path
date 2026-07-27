interface PendingWrite {
  readonly id: number;
  readonly key: string;
  readonly promise: Promise<unknown>;
}

interface FailedWrite {
  readonly id: number;
  readonly error: unknown;
}

const pendingWrites = new Set<PendingWrite>();
const failedWrites = new Map<string, FailedWrite>();
const latestSuccessfulWriteIds = new Map<string, number>();
let nextWriteId = 1;
let globallyResetThroughId = 0;
let exclusiveWriteActive = false;

export class PendingWriteSupersededError extends Error {
  constructor() {
    super("端末内データの置換または削除中のため、古い画面からの保存を中止しました。");
    this.name = "PendingWriteSupersededError";
  }
}

function registerPendingWrite<T>(key: string, write: Promise<T>): Promise<T> {
  const id = nextWriteId;
  nextWriteId += 1;
  const entry: PendingWrite = { id, key, promise: write };
  pendingWrites.add(entry);
  void write.then(
    () => {
      pendingWrites.delete(entry);
      const latestSuccessfulId = Math.max(latestSuccessfulWriteIds.get(key) ?? 0, id);
      latestSuccessfulWriteIds.set(key, latestSuccessfulId);
      const failure = failedWrites.get(key);
      if (failure !== undefined && failure.id <= latestSuccessfulId) {
        failedWrites.delete(key);
      }
    },
    (error: unknown) => {
      pendingWrites.delete(entry);
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

function validateWriteKey(key: string): void {
  if (key.trim() === "") {
    throw new Error("更新待機対象の書込みキーを指定してください。");
  }
}

async function settlePendingWritePromises(): Promise<void> {
  while (pendingWrites.size > 0) {
    const writes = [...pendingWrites];
    await Promise.allSettled(writes.map((write) => write.promise));
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

/**
 * 画面遷移後も続くIndexedDB書込みを、Service Worker更新前の待機対象へ登録する。
 * factoryで受け取り、全置換・全削除の排他区間では古い書込み自体を開始させない。
 */
export function trackPendingUpdateWrite<T>(
  key: string,
  write: () => Promise<T>,
): Promise<T> {
  validateWriteKey(key);
  if (exclusiveWriteActive) {
    return Promise.reject(new PendingWriteSupersededError());
  }
  return registerPendingWrite(key, Promise.resolve().then(write));
}

/**
 * 既存書込みのsettle後に全置換・全削除を開始し、完了まで新しい通常書込みを拒否する。
 * 置換対象となる過去の保存失敗は、この境界で明示的に破棄する。
 */
export async function runExclusivePendingUpdateWrite<T>(
  key: string,
  write: () => Promise<T>,
  options: { readonly discardPriorFailures?: boolean } = {},
): Promise<T> {
  validateWriteKey(key);
  if (exclusiveWriteActive) {
    throw new Error("端末内データの置換または削除をすでに実行しています。");
  }

  exclusiveWriteActive = true;
  try {
    await settlePendingWritePromises();
    if (options.discardPriorFailures !== true) {
      assertNoFailedWrites(key);
    }
    const result = await registerPendingWrite(key, Promise.resolve().then(write));
    if (options.discardPriorFailures === true) {
      resetPendingUpdateWriteFailures();
    }
    return result;
  } finally {
    exclusiveWriteActive = false;
  }
}

/**
 * 呼出し中に追加された書込みも含め、すべてsettleするまで待つ。
 * 確認していない保存失敗が1件でも残る場合は、更新を適用しない。
 */
export async function flushPendingUpdateWrites(): Promise<void> {
  await settlePendingWritePromises();
  assertNoFailedWrites();
}

export function countPendingUpdateWrites(): number {
  return pendingWrites.size;
}

export function countFailedUpdateWrites(): number {
  return failedWrites.size;
}

/**
 * 端末内データを正常に全置換・全削除した場合など、失敗対象が明示的に破棄されたときだけ使う。
 */
export function resetPendingUpdateWriteFailures(key?: string): void {
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
