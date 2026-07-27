import type { Page } from "@playwright/test";

export const APP_DATABASE_NAME = "e2-study-path";

export interface IndexedDbStoreSeed {
  readonly storeName: string;
  readonly records: readonly unknown[];
  readonly clearBeforeSeed?: boolean;
}

async function evaluateWithExistingDatabase<T>(
  page: Page,
  operation: "read" | "seed",
  payload: Record<string, unknown>,
): Promise<T> {
  return page.evaluate(
    async ({ databaseName, operationName, operationPayload }) => {
      const openExistingDatabase = () =>
        new Promise<IDBDatabase>((resolve, reject) => {
          const request = indexedDB.open(databaseName);
          let missingDatabase = false;

          request.onupgradeneeded = () => {
            missingDatabase = true;
            request.transaction?.abort();
          };
          request.onsuccess = () => {
            if (missingDatabase) {
              request.result.close();
              reject(
                new Error(
                  `IndexedDB「${databaseName}」が初期化される前にテストデータ操作が呼ばれました。`,
                ),
              );
              return;
            }
            resolve(request.result);
          };
          request.onerror = () => {
            reject(
              missingDatabase
                ? new Error(
                    `IndexedDB「${databaseName}」が初期化される前にテストデータ操作が呼ばれました。`,
                  )
                : (request.error ??
                    new Error(`IndexedDB「${databaseName}」を開けませんでした。`)),
            );
          };
          request.onblocked = () => {
            reject(
              new Error(
                `IndexedDB「${databaseName}」が別の接続に遮られています。ページの初期化完了を待ってください。`,
              ),
            );
          };
        });

      const initializationDeadline = Date.now() + 5_000;
      let database: IDBDatabase;
      while (true) {
        try {
          database = await openExistingDatabase();
          break;
        } catch (error) {
          const initializationPending =
            error instanceof Error &&
            error.message.includes("初期化される前にテストデータ操作");
          if (!initializationPending || Date.now() >= initializationDeadline) {
            throw error;
          }
          await new Promise((resolve) => globalThis.setTimeout(resolve, 25));
        }
      }
      try {
        if (operationName === "seed") {
          const seeds = operationPayload.seeds as Array<{
            storeName: string;
            records: unknown[];
            clearBeforeSeed?: boolean;
          }>;
          const storeNames = [...new Set(seeds.map((seed) => seed.storeName))];
          const missingStores = storeNames.filter(
            (storeName) => !database.objectStoreNames.contains(storeName),
          );
          if (missingStores.length > 0) {
            throw new Error(
              `IndexedDB v${database.version}に必要なstoreがありません: ${missingStores.join(", ")}`,
            );
          }

          const transaction = database.transaction(storeNames, "readwrite");
          const completion = new Promise<void>((resolve, reject) => {
            transaction.oncomplete = () => resolve();
            transaction.onerror = () =>
              reject(
                transaction.error ?? new Error("E2Eテストデータの保存に失敗しました。"),
              );
            transaction.onabort = () =>
              reject(
                transaction.error ??
                  new Error("E2Eテストデータの保存が中断されました。"),
              );
          });

          try {
            for (const seed of seeds) {
              const store = transaction.objectStore(seed.storeName);
              if (seed.clearBeforeSeed === true) {
                store.clear();
              }
              for (const record of seed.records) {
                store.put(record);
              }
            }
          } catch (error) {
            try {
              transaction.abort();
            } catch {
              // すでに失敗済みでも、元の書込み例外を呼出元へ返す。
            }
            await completion.catch(() => undefined);
            throw error;
          }
          await completion;
          return undefined as T;
        }

        const storeName = String(operationPayload.storeName);
        if (!database.objectStoreNames.contains(storeName)) {
          throw new Error(
            `IndexedDB v${database.version}に必要なstoreがありません: ${storeName}`,
          );
        }
        const key = operationPayload.key as IDBValidKey;
        const transaction = database.transaction(storeName, "readonly");
        const request = transaction.objectStore(storeName).get(key);
        const result = await new Promise<unknown>((resolve, reject) => {
          request.onsuccess = () => resolve(request.result);
          request.onerror = () =>
            reject(
              request.error ?? new Error("E2Eテストデータを読み込めませんでした。"),
            );
        });
        await new Promise<void>((resolve, reject) => {
          transaction.oncomplete = () => resolve();
          transaction.onerror = () =>
            reject(
              transaction.error ?? new Error("E2Eテストデータの読込に失敗しました。"),
            );
          transaction.onabort = () =>
            reject(
              transaction.error ?? new Error("E2Eテストデータの読込が中断されました。"),
            );
        });
        return result as T;
      } finally {
        database.close();
      }
    },
    {
      databaseName: APP_DATABASE_NAME,
      operationName: operation,
      operationPayload: payload,
    },
  );
}

export async function seedAppDatabase(
  page: Page,
  seeds: readonly IndexedDbStoreSeed[],
): Promise<void> {
  if (seeds.length === 0) {
    throw new Error("seed対象のstoreを1件以上指定してください。");
  }
  if (seeds.some((seed) => seed.storeName.trim() === "")) {
    throw new Error("seed対象のstore名を空にはできません。");
  }

  await evaluateWithExistingDatabase<void>(page, "seed", {
    seeds: seeds.map((seed) => ({
      storeName: seed.storeName,
      records: [...seed.records],
      clearBeforeSeed: seed.clearBeforeSeed === true,
    })),
  });
}

export function readAppDatabaseRecord<T>(
  page: Page,
  storeName: string,
  key: IDBValidKey,
): Promise<T | undefined> {
  if (storeName.trim() === "") {
    throw new Error("読込対象のstore名を空にはできません。");
  }
  return evaluateWithExistingDatabase<T | undefined>(page, "read", {
    storeName,
    key,
  });
}
