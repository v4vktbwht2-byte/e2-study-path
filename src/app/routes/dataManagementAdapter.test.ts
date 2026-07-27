import { IDBKeyRange, indexedDB } from "fake-indexeddb";
import {
  BACKUP_SCHEMA_VERSION,
  DEFAULT_BACKUP_SECTIONS,
  type BackupCounts,
  type BackupEnvelope,
  type BackupExportArtifact,
  type PreparedBackupImport,
} from "../../domain/backup";
import type { DataManagementPort } from "../../features/data";
import { AppDb } from "../../infrastructure/db/appDb";
import { DEFAULT_SETTINGS } from "../../infrastructure/db/repositories";
import {
  createPendingUpdateWriteCoordinator,
  PendingWriteSupersededError,
  type PendingWriteGenerationStore,
  type PendingWriteOriginLock,
} from "../../infrastructure/pwa";
import {
  DataManagementAdapter,
  createDataManagementPort,
  type DataManagementAdapterDependencies,
} from "./dataManagementAdapter";

const EMPTY_COUNTS: BackupCounts = {
  profiles: 0,
  settings: 0,
  reviewStates: 0,
  mastery: 0,
  vocabularyUserStates: 0,
  lessonProgress: 0,
  attempts: 0,
  sessions: 0,
  dailyPlans: 0,
  writingSubmissions: 0,
  speakingRecordings: 0,
};

const ENVELOPE: BackupEnvelope = {
  schemaVersion: BACKUP_SCHEMA_VERSION,
  exportedAt: "2026-07-27T04:00:00.000Z",
  appVersion: "0.1.0",
  contentVersions: {
    "pilot-core-ja-original": "0.6.0",
  },
  includedData: [...DEFAULT_BACKUP_SECTIONS],
  data: {
    profiles: [],
    settings: [],
    reviewStates: [],
    mastery: [],
    vocabularyUserStates: [],
    lessonProgress: [],
    attempts: [],
    sessions: [],
    dailyPlans: [],
    writingSubmissions: [],
  },
};

function artifact(fileName = "backup.json"): BackupExportArtifact {
  const text = JSON.stringify(ENVELOPE);
  return {
    envelope: ENVELOPE,
    text,
    blob: new Blob([text], { type: "application/json" }),
    fileName,
    sizeBytes: new TextEncoder().encode(text).byteLength,
  };
}

const PREPARED_IMPORT: PreparedBackupImport = {
  envelope: ENVELOPE,
  preview: {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: ENVELOPE.exportedAt,
    appVersion: ENVELOPE.appVersion,
    fileSizeBytes: 1024,
    contentVersions: { ...ENVELOPE.contentVersions },
    includedData: [...DEFAULT_BACKUP_SECTIONS],
    counts: {
      ...EMPTY_COUNTS,
      profiles: 1,
      attempts: 3,
    },
    currentCounts: { ...EMPTY_COUNTS },
    recordingBytes: 2048,
    warnings: ["教材versionが異なります。"],
  },
};

function createTestPendingWriteCoordinator() {
  let generation = 0;
  const generationStore: PendingWriteGenerationStore = {
    read: () => generation,
    write: (nextGeneration) => {
      generation = nextGeneration;
    },
  };
  const immediateLock: PendingWriteOriginLock = async (_mode, operation) => operation();
  return createPendingUpdateWriteCoordinator({
    withOriginLock: immediateLock,
    generationStore,
  });
}

function createDependencies(
  overrides: Partial<DataManagementAdapterDependencies> = {},
): DataManagementAdapterDependencies {
  return {
    backupService: {
      countEnvelopeRecords: vi.fn(() => 4),
      createSafetyBackupForReplace: vi.fn(() =>
        Promise.resolve(artifact("safety-backup.json")),
      ),
      deleteAllUserData: vi.fn(() => Promise.resolve(12)),
      deleteSpeakingRecordings: vi.fn(() => Promise.resolve(2)),
      exportBackup: vi.fn(() => Promise.resolve(artifact())),
      prepareImport: vi.fn(() => Promise.resolve(PREPARED_IMPORT)),
      restoreBackup: vi.fn<
        DataManagementAdapterDependencies["backupService"]["restoreBackup"]
      >((_envelope, mode) =>
        Promise.resolve({
          mode,
          importedCounts: {
            ...EMPTY_COUNTS,
            profiles: 1,
            attempts: 3,
          },
        }),
      ),
    },
    inspectStorage: vi.fn(() =>
      Promise.resolve({
        estimateSupported: true,
        persistenceSupported: true,
        usage: 1024,
        quota: 8192,
        persisted: false,
      }),
    ),
    requestPersistentStorage: vi.fn(() =>
      Promise.resolve({ supported: true, persisted: true }),
    ),
    inspectCaches: vi.fn(() =>
      Promise.resolve({
        supported: true,
        entryCount: 10,
        estimatedBytes: 5000,
        audioEntryCount: 3,
        audioEstimatedBytes: 1200,
        caches: [],
      }),
    ),
    clearAudioCache: vi.fn(() => Promise.resolve(true)),
    recoverCaches: vi.fn(() =>
      Promise.resolve({
        deletedCacheNames: ["e2-study-path-pages-v1"],
        unregisteredWorkerCount: 1,
      }),
    ),
    loadRecordingSummary: vi.fn(() => Promise.resolve({ count: 2, bytes: 2048 })),
    ensureDefaultSettings: vi.fn(() => Promise.resolve()),
    downloadBackup: vi.fn(() => Promise.resolve()),
    reloadPage: vi.fn(),
    now: () => new Date("2026-07-27T05:00:00.000Z"),
    appVersion: "0.1.0",
    pendingWriteCoordinator: createTestPendingWriteCoordinator(),
    ...overrides,
  };
}

describe("DataManagementAdapter", () => {
  it("Storage・Cache・録音をDataManagementOverviewへまとめる", async () => {
    const adapter = new DataManagementAdapter(createDependencies());

    await expect(adapter.loadOverview()).resolves.toEqual({
      storageEstimate: {
        status: "available",
        usageBytes: 1024,
        quotaBytes: 8192,
      },
      persistentStorage: {
        status: "available",
        persisted: false,
      },
      recordings: {
        count: 2,
        bytes: 2048,
      },
      audioCache: {
        status: "available",
        entryCount: 3,
        bytes: 1200,
      },
      appCache: {
        status: "available",
        entryCount: 10,
        bytes: 5000,
      },
    });
    await expect(adapter.requestPersistentStorage()).resolves.toEqual({
      status: "granted",
    });
  });

  it("録音の選択をexportへ渡し、ダウンロード完了後に結果を返す", async () => {
    const exportBackup = vi.fn<
      DataManagementAdapterDependencies["backupService"]["exportBackup"]
    >(() => Promise.resolve(artifact()));
    const downloadBackup = vi.fn<DataManagementAdapterDependencies["downloadBackup"]>(
      () => Promise.resolve(),
    );
    const dependencies = createDependencies({
      backupService: {
        ...createDependencies().backupService,
        exportBackup,
      },
      downloadBackup,
    });
    const adapter = new DataManagementAdapter(dependencies);

    await expect(
      adapter.exportBackup({ includeRecordings: true }),
    ).resolves.toMatchObject({
      fileName: "backup.json",
      recordCount: 4,
      recordingCount: 0,
    });
    expect(exportBackup).toHaveBeenCalledWith({
      appVersion: "0.1.0",
      now: new Date("2026-07-27T05:00:00.000Z"),
      includeSpeakingRecordings: true,
    });
    expect(downloadBackup).toHaveBeenCalledWith(
      expect.objectContaining({
        fileName: "backup.json",
      }),
    );
  });

  it("バックアップ生成後はダウンロード中でもbarrierを解放する", async () => {
    let finishDownload: (() => void) | undefined;
    const downloadBackup = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finishDownload = resolve;
        }),
    );
    const deleteAllUserData = vi.fn(() => Promise.resolve(3));
    const baseDependencies = createDependencies();
    const adapter = new DataManagementAdapter({
      ...baseDependencies,
      backupService: {
        ...baseDependencies.backupService,
        deleteAllUserData,
      },
      downloadBackup,
    });

    const exporting = adapter.exportBackup({ includeRecordings: false });
    await vi.waitFor(() => expect(downloadBackup).toHaveBeenCalledOnce());

    await expect(adapter.deleteAllUserData()).resolves.toEqual({
      affectedCount: 3,
    });
    expect(deleteAllUserData).toHaveBeenCalledOnce();

    finishDownload?.();
    await expect(exporting).resolves.toMatchObject({
      fileName: "backup.json",
    });
  });

  it("previewを変換し、安全backupのダウンロード完了前には置換しない", async () => {
    const order: string[] = [];
    let finishDownload: (() => void) | undefined;
    const downloadBackup = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finishDownload = () => {
            order.push("download");
            resolve();
          };
        }),
    );
    const restoreBackup = vi.fn<
      DataManagementAdapterDependencies["backupService"]["restoreBackup"]
    >((_envelope, mode) => {
      order.push("restore");
      return Promise.resolve({
        mode,
        importedCounts: {
          ...EMPTY_COUNTS,
          profiles: 1,
          attempts: 3,
        },
      });
    });
    const baseDependencies = createDependencies();
    const adapter = new DataManagementAdapter({
      ...baseDependencies,
      backupService: {
        ...baseDependencies.backupService,
        restoreBackup,
      },
      downloadBackup,
    });
    const file = new File(["{}"], "backup.json", {
      type: "application/json",
    });

    const preview = await adapter.inspectBackup(file);
    expect(preview).toMatchObject({
      schemaVersion: "1.0.0",
      appVersion: "0.1.0",
      exportedAt: "2026-07-27T04:00:00.000Z",
      contentVersions: {
        "pilot-core-ja-original": "0.6.0",
      },
      recordingBytes: 2048,
      warnings: ["教材versionが異なります。"],
    });
    expect(preview.counts).toMatchObject({ profiles: 1, attempts: 3 });

    const restorePromise = adapter.restoreBackup({
      file,
      mode: "replace",
      createSafetyBackup: true,
    });
    try {
      await vi.waitFor(() => expect(downloadBackup).toHaveBeenCalledOnce());
      expect(restoreBackup).not.toHaveBeenCalled();
    } finally {
      finishDownload?.();
    }
    await expect(restorePromise).resolves.toMatchObject({
      mode: "replace",
      restoredRecordCount: 4,
      safetyBackupFileName: "safety-backup.json",
    });
    expect(order).toEqual(["download", "restore"]);
  });

  it("安全backupのダウンロード失敗時は既存データを置換しない", async () => {
    const restoreBackup =
      vi.fn<DataManagementAdapterDependencies["backupService"]["restoreBackup"]>();
    const baseDependencies = createDependencies();
    const adapter = new DataManagementAdapter({
      ...baseDependencies,
      backupService: {
        ...baseDependencies.backupService,
        restoreBackup,
      },
      downloadBackup: () =>
        Promise.reject(new Error("安全バックアップを保存できませんでした。")),
    });

    await expect(
      adapter.restoreBackup({
        file: new File(["{}"], "backup.json"),
        mode: "replace",
        createSafetyBackup: true,
      }),
    ).rejects.toThrow("安全バックアップを保存できませんでした。");
    expect(restoreBackup).not.toHaveBeenCalled();
  });

  it("録音・音声cache・app cache・全利用者データを別々の操作へ委譲する", async () => {
    const order: string[] = [];
    const deleteSpeakingRecordings = vi.fn(() => Promise.resolve(2));
    const deleteAllUserData = vi.fn(() => {
      order.push("delete-all");
      return Promise.resolve(12);
    });
    const clearAudioCache = vi.fn(() => Promise.resolve(true));
    const recoverCaches = vi.fn(() =>
      Promise.resolve({
        deletedCacheNames: ["e2-study-path-pages-v1"],
        unregisteredWorkerCount: 1,
      }),
    );
    const ensureDefaultSettings = vi.fn(() => {
      order.push("settings");
      return Promise.resolve();
    });
    const reloadPage = vi.fn();
    const baseDependencies = createDependencies();
    const adapter = new DataManagementAdapter({
      ...baseDependencies,
      backupService: {
        ...baseDependencies.backupService,
        deleteSpeakingRecordings,
        deleteAllUserData,
      },
      clearAudioCache,
      recoverCaches,
      ensureDefaultSettings,
      reloadPage,
    });

    await expect(adapter.deleteRecordings()).resolves.toEqual({
      affectedCount: 2,
      freedBytes: 2048,
    });
    expect(deleteSpeakingRecordings).toHaveBeenCalledOnce();
    expect(clearAudioCache).not.toHaveBeenCalled();

    await expect(adapter.clearAudioCache()).resolves.toEqual({
      affectedCount: 3,
      freedBytes: 1200,
    });
    expect(clearAudioCache).toHaveBeenCalledOnce();

    await expect(adapter.rebuildAppCache()).resolves.toEqual({
      affectedCount: 10,
      freedBytes: 5000,
    });
    expect(recoverCaches).toHaveBeenCalledOnce();
    expect(reloadPage).toHaveBeenCalledOnce();

    await expect(adapter.deleteAllUserData()).resolves.toEqual({
      affectedCount: 12,
    });
    expect(order).toEqual(["delete-all", "settings"]);
  });

  it("全削除は既存保存の完了を待ち、削除中の古い保存を開始させない", async () => {
    const pendingWriteCoordinator = createTestPendingWriteCoordinator();
    let finishExistingWrite: (() => void) | undefined;
    const existingWritePromise = new Promise<void>((resolve) => {
      finishExistingWrite = resolve;
    });
    const existingWrite = pendingWriteCoordinator.trackPendingUpdateWrite(
      "today-plan",
      () => existingWritePromise,
    );
    const deleteAllUserData = vi.fn(() => Promise.resolve(3));
    const baseDependencies = createDependencies();
    const adapter = new DataManagementAdapter({
      ...baseDependencies,
      pendingWriteCoordinator,
      backupService: {
        ...baseDependencies.backupService,
        deleteAllUserData,
      },
    });

    const deletion = adapter.deleteAllUserData();
    const staleSave = vi.fn(() => Promise.resolve());
    const staleError = await pendingWriteCoordinator
      .trackPendingUpdateWrite("writing-draft:old", staleSave)
      .catch((error: unknown) => error);
    const deletionStartedBeforeExistingWriteFinished =
      deleteAllUserData.mock.calls.length > 0;
    finishExistingWrite?.();
    await expect(existingWrite).resolves.toBeUndefined();
    await expect(deletion).resolves.toEqual({ affectedCount: 3 });

    expect(staleError).toBeInstanceOf(PendingWriteSupersededError);
    expect(staleSave).not.toHaveBeenCalled();
    expect(deletionStartedBeforeExistingWriteFinished).toBe(false);
    expect(deleteAllUserData).toHaveBeenCalledOnce();
  });
});

describe("createDataManagementPort", () => {
  it("全利用者データ削除後に既定settingsを再生成する", async () => {
    const databaseName = `data-route-adapter-${crypto.randomUUID()}`;
    const db = new AppDb(databaseName, { indexedDB, IDBKeyRange });
    await db.open();
    await db.settings.put({
      ...DEFAULT_SETTINGS,
      theme: "dark",
      dailyNewVocabularyLimit: 50,
    });
    await db.profiles.put({
      id: "local-user",
      createdAt: "2026-07-27T00:00:00.000Z",
      updatedAt: "2026-07-27T00:00:00.000Z",
      goals: ["grade2"],
      dailyMinutes: 15,
      recommendedStage: 1,
      selectedStage: 1,
      onboardingCompleted: true,
    });

    const port: DataManagementPort = createDataManagementPort(db, {
      inspectStorage: () =>
        Promise.resolve({
          estimateSupported: false,
          persistenceSupported: false,
        }),
      inspectCaches: () =>
        Promise.resolve({
          supported: false,
          entryCount: 0,
          estimatedBytes: 0,
          audioEntryCount: 0,
          audioEstimatedBytes: 0,
          caches: [],
        }),
      requestPersistentStorage: () =>
        Promise.resolve({ supported: false, persisted: false }),
      clearAudioCache: () => Promise.resolve(false),
      recoverCaches: () =>
        Promise.resolve({
          deletedCacheNames: [],
          unregisteredWorkerCount: 0,
        }),
      downloadBackup: () => Promise.resolve(),
      reloadPage: vi.fn(),
      pendingWriteCoordinator: createTestPendingWriteCoordinator(),
    });

    await expect(port.deleteAllUserData()).resolves.toMatchObject({
      affectedCount: 2,
    });
    expect(await db.profiles.count()).toBe(0);
    expect(await db.settings.get("settings")).toEqual(DEFAULT_SETTINGS);

    await db.delete();
  });
});
