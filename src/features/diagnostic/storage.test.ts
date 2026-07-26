import { IDBKeyRange, indexedDB } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { AppDb } from "../../infrastructure/db/appDb";
import { createDiagnosticRun } from "./service";
import { AppDbDiagnosticSessionStore, DiagnosticStorageError } from "./storage";

let sequence = 0;
let db: AppDb;

beforeEach(() => {
  sequence += 1;
  db = new AppDb(`diagnostic-feature-test-${sequence}`, {
    indexedDB,
    IDBKeyRange,
  });
});

afterEach(async () => {
  db.close();
  await db.delete();
});

describe("AppDb診断途中保存adapter", () => {
  it("modeごとの途中状態をappMetaへ保存・読込・削除する", async () => {
    const databaseName = db.name;
    const store = new AppDbDiagnosticSessionStore(db);
    const run = createDiagnosticRun("initial", "2026-07-27T00:00:00.000Z", 18);

    await store.save(run);
    db.close();
    db = new AppDb(databaseName, { indexedDB, IDBKeyRange });
    const reopenedStore = new AppDbDiagnosticSessionStore(db);

    await expect(reopenedStore.load("initial")).resolves.toEqual(run);
    await expect(reopenedStore.load("reassessment")).resolves.toBeUndefined();

    await reopenedStore.clear("initial");
    await expect(reopenedStore.load("initial")).resolves.toBeUndefined();
  });

  it("壊れた途中状態を無視せず、復旧可能なエラーとして返す", async () => {
    const store = new AppDbDiagnosticSessionStore(db);
    await db.appMeta.put({
      key: "diagnostic-session:initial",
      value: "{invalid-json",
      updatedAt: "2026-07-27T00:00:00.000Z",
    });

    await expect(store.load("initial")).rejects.toBeInstanceOf(DiagnosticStorageError);
  });
});
