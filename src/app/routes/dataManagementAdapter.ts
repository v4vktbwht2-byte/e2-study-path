import type {
  BackupExportArtifact,
  BackupRestoreResult as DomainBackupRestoreResult,
  PreparedBackupImport,
} from "../../domain/backup";
import type {
  BackupExportOptions,
  BackupPreview,
  DataManagementOverview,
  DataManagementPort,
  DataOperationResult,
  PersistenceRequestResult,
  RestoreBackupInput,
  RestoreBackupResult,
  StoredRecordingSummary,
} from "../../features/data";
import { DexieBackupService } from "../../infrastructure/backup";
import type { AppDb } from "../../infrastructure/db/appDb";
import { DEFAULT_SETTINGS } from "../../infrastructure/db/repositories";
import {
  clearOptionalAudioCache,
  inspectApplicationCaches,
  inspectStorage,
  recoverApplicationCaches,
  requestPersistentStorage,
  type CacheRecoveryResult,
  type CacheStorageSummary as PwaCacheStorageSummary,
  type PendingUpdateWriteCoordinator,
  type StorageSnapshot,
} from "../../infrastructure/pwa";
import { APP_VERSION } from "../../shared/appMetadata";

export const DATA_MANAGEMENT_APP_VERSION = APP_VERSION;

type BackupServicePort = Pick<
  DexieBackupService,
  | "countEnvelopeRecords"
  | "createSafetyBackupForReplace"
  | "deleteAllUserData"
  | "deleteSpeakingRecordings"
  | "exportBackup"
  | "prepareImport"
  | "restoreBackup"
>;

export interface DataManagementAdapterDependencies {
  readonly backupService: BackupServicePort;
  readonly inspectStorage: () => Promise<StorageSnapshot>;
  readonly requestPersistentStorage: () => Promise<{
    readonly supported: boolean;
    readonly persisted: boolean;
  }>;
  readonly inspectCaches: () => Promise<PwaCacheStorageSummary>;
  readonly clearAudioCache: () => Promise<boolean>;
  readonly recoverCaches: () => Promise<CacheRecoveryResult>;
  readonly loadRecordingSummary: () => Promise<StoredRecordingSummary>;
  readonly ensureDefaultSettings: () => Promise<void>;
  readonly downloadBackup: (artifact: BackupExportArtifact) => Promise<void>;
  readonly reloadPage: () => void;
  readonly now: () => Date;
  readonly appVersion: string;
  readonly pendingWriteCoordinator: Pick<
    PendingUpdateWriteCoordinator,
    | "runExclusivePendingUpdateWrite"
    | "runPendingUpdateSnapshotBarrier"
    | "trackPendingUpdateWrite"
  >;
}

function totalImportedRecords(result: DomainBackupRestoreResult): number {
  return Object.values(result.importedCounts).reduce(
    (total, count) => total + count,
    0,
  );
}

function toFeaturePreview(prepared: PreparedBackupImport): BackupPreview {
  return {
    schemaVersion: prepared.preview.schemaVersion,
    appVersion: prepared.preview.appVersion,
    exportedAt: prepared.preview.exportedAt,
    contentVersions: { ...prepared.preview.contentVersions },
    counts: { ...prepared.preview.counts },
    recordingBytes: prepared.preview.recordingBytes,
    warnings: [...prepared.preview.warnings],
  };
}

function toOverview(
  storage: StorageSnapshot,
  caches: PwaCacheStorageSummary,
  recordings: StoredRecordingSummary,
): DataManagementOverview {
  return {
    storageEstimate: storage.estimateSupported
      ? {
          status: "available",
          usageBytes: storage.usage ?? 0,
          quotaBytes: storage.quota ?? 0,
        }
      : {
          status: "unsupported",
          message: "このブラウザーでは保存容量の見積もりを取得できません。",
        },
    persistentStorage: storage.persistenceSupported
      ? {
          status: "available",
          persisted: storage.persisted === true,
        }
      : {
          status: "unsupported",
          message: "このブラウザーでは学習データの永続保存を要求できません。",
        },
    recordings,
    audioCache: caches.supported
      ? {
          status: "available",
          entryCount: caches.audioEntryCount,
          bytes: caches.audioEstimatedBytes,
        }
      : {
          status: "unsupported",
          message: "このブラウザーでは音声キャッシュを確認できません。",
        },
    appCache: caches.supported
      ? {
          status: "available",
          entryCount: caches.entryCount,
          bytes: caches.estimatedBytes,
        }
      : {
          status: "unsupported",
          message: "このブラウザーではアプリキャッシュを確認できません。",
        },
  };
}

export class DataManagementAdapter implements DataManagementPort {
  constructor(private readonly dependencies: DataManagementAdapterDependencies) {}

  async loadOverview(): Promise<DataManagementOverview> {
    const [storage, caches, recordings] = await Promise.all([
      this.dependencies.inspectStorage(),
      this.dependencies.inspectCaches(),
      this.dependencies.loadRecordingSummary(),
    ]);
    return toOverview(storage, caches, recordings);
  }

  async requestPersistentStorage(): Promise<PersistenceRequestResult> {
    const result = await this.dependencies.requestPersistentStorage();
    if (!result.supported) {
      return {
        status: "unsupported",
        message: "このブラウザーでは学習データの永続保存を要求できません。",
      };
    }
    if (result.persisted) {
      return { status: "granted" };
    }
    return {
      status: "denied",
      message:
        "ブラウザーの判断により永続保存は許可されませんでした。定期的なバックアップをおすすめします。",
    };
  }

  async exportBackup(options: BackupExportOptions): Promise<{
    fileName: string;
    recordCount: number;
    recordingCount: number;
    sizeBytes: number;
  }> {
    const artifact =
      await this.dependencies.pendingWriteCoordinator.runPendingUpdateSnapshotBarrier(
        "data-management:export-backup",
        () =>
          this.dependencies.backupService.exportBackup({
            appVersion: this.dependencies.appVersion,
            now: this.dependencies.now(),
            includeSpeakingRecordings: options.includeRecordings,
          }),
      );
    await this.dependencies.downloadBackup(artifact);
    return {
      fileName: artifact.fileName,
      recordCount: this.dependencies.backupService.countEnvelopeRecords(
        artifact.envelope,
      ),
      recordingCount: artifact.envelope.data.speakingRecordings?.length ?? 0,
      sizeBytes: artifact.sizeBytes,
    };
  }

  async inspectBackup(file: File): Promise<BackupPreview> {
    const prepared = await this.dependencies.backupService.prepareImport(
      file,
      this.dependencies.appVersion,
    );
    return toFeaturePreview(prepared);
  }

  async restoreBackup(input: RestoreBackupInput): Promise<RestoreBackupResult> {
    return this.dependencies.pendingWriteCoordinator.runExclusivePendingUpdateWrite(
      "data-management:restore-backup",
      () => this.restoreBackupUntracked(input),
      { discardPriorFailures: input.mode === "replace" },
    );
  }

  private async restoreBackupUntracked(
    input: RestoreBackupInput,
  ): Promise<RestoreBackupResult> {
    // preview後にファイルが差し替えられた場合も反映しないよう、直前に再検証する。
    const prepared = await this.dependencies.backupService.prepareImport(
      input.file,
      this.dependencies.appVersion,
    );
    let safetyBackupFileName: string | undefined;
    if (input.mode === "replace" && input.createSafetyBackup) {
      const safetyArtifact =
        await this.dependencies.backupService.createSafetyBackupForReplace(
          prepared.envelope,
          {
            appVersion: this.dependencies.appVersion,
            now: this.dependencies.now(),
          },
        );
      // downloaderが完了するまでは既存データへ触れない。
      await this.dependencies.downloadBackup(safetyArtifact);
      safetyBackupFileName = safetyArtifact.fileName;
    }
    const restored = await this.dependencies.backupService.restoreBackup(
      prepared.envelope,
      input.mode,
    );
    return {
      mode: restored.mode,
      restoredRecordCount: totalImportedRecords(restored),
      ...(safetyBackupFileName === undefined ? {} : { safetyBackupFileName }),
      ...(prepared.preview.warnings.length === 0
        ? {}
        : { warnings: [...prepared.preview.warnings] }),
    };
  }

  deleteRecordings(): Promise<DataOperationResult> {
    return this.dependencies.pendingWriteCoordinator.trackPendingUpdateWrite(
      "data-management:delete-recordings",
      () => this.deleteRecordingsUntracked(),
    );
  }

  private async deleteRecordingsUntracked(): Promise<DataOperationResult> {
    const before = await this.dependencies.loadRecordingSummary();
    const affectedCount =
      await this.dependencies.backupService.deleteSpeakingRecordings();
    return {
      affectedCount,
      freedBytes: affectedCount === 0 ? 0 : before.bytes,
    };
  }

  clearAudioCache(): Promise<DataOperationResult> {
    return this.dependencies.pendingWriteCoordinator.trackPendingUpdateWrite(
      "data-management:clear-audio-cache",
      () => this.clearAudioCacheUntracked(),
    );
  }

  private async clearAudioCacheUntracked(): Promise<DataOperationResult> {
    const before = await this.dependencies.inspectCaches();
    const deleted = await this.dependencies.clearAudioCache();
    return {
      affectedCount: deleted ? before.audioEntryCount : 0,
      freedBytes: deleted ? before.audioEstimatedBytes : 0,
    };
  }

  rebuildAppCache(): Promise<DataOperationResult> {
    return this.dependencies.pendingWriteCoordinator.trackPendingUpdateWrite(
      "data-management:rebuild-app-cache",
      () => this.rebuildAppCacheUntracked(),
    );
  }

  private async rebuildAppCacheUntracked(): Promise<DataOperationResult> {
    const before = await this.dependencies.inspectCaches();
    const recovered = await this.dependencies.recoverCaches();
    this.dependencies.reloadPage();
    return {
      affectedCount: recovered.deletedCacheNames.length === 0 ? 0 : before.entryCount,
      freedBytes: recovered.deletedCacheNames.length === 0 ? 0 : before.estimatedBytes,
    };
  }

  async deleteAllUserData(): Promise<DataOperationResult> {
    return this.dependencies.pendingWriteCoordinator.runExclusivePendingUpdateWrite(
      "data-management:delete-all-user-data",
      () => this.deleteAllUserDataUntracked(),
      { discardPriorFailures: true },
    );
  }

  private async deleteAllUserDataUntracked(): Promise<DataOperationResult> {
    const affectedCount = await this.dependencies.backupService.deleteAllUserData();
    await this.dependencies.ensureDefaultSettings();
    return { affectedCount };
  }
}

export async function downloadBackupArtifact(
  artifact: BackupExportArtifact,
): Promise<void> {
  if (typeof document === "undefined" || typeof URL.createObjectURL !== "function") {
    throw new Error("この環境ではバックアップファイルをダウンロードできません。");
  }
  const url = URL.createObjectURL(artifact.blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = artifact.fileName;
  anchor.hidden = true;
  document.body.append(anchor);
  try {
    anchor.click();
    // clickのdispatch完了を待ち、呼出し側が復元へ進める順序を明確にする。
    await Promise.resolve();
  } finally {
    anchor.remove();
    globalThis.setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

function createRecordingSummaryLoader(
  db: AppDb,
): () => Promise<StoredRecordingSummary> {
  return async () => {
    const recordings = await db.speakingRecordings.toArray();
    return {
      count: recordings.length,
      bytes: recordings.reduce((total, recording) => total + recording.blob.size, 0),
    };
  };
}

export function createDataManagementPort(
  db: AppDb,
  overrides: Partial<DataManagementAdapterDependencies> = {},
): DataManagementPort {
  const backupService = new DexieBackupService(db);
  return new DataManagementAdapter({
    backupService,
    inspectStorage,
    requestPersistentStorage,
    inspectCaches: inspectApplicationCaches,
    clearAudioCache: clearOptionalAudioCache,
    recoverCaches: recoverApplicationCaches,
    loadRecordingSummary: createRecordingSummaryLoader(db),
    ensureDefaultSettings: async () => {
      const existingSettings = await db.settings.get(DEFAULT_SETTINGS.id);
      if (existingSettings === undefined) {
        await db.settings.put(DEFAULT_SETTINGS);
      }
      // 明示的に既定値が再生成されたことを保証する。
      const settings = await db.settings.get(DEFAULT_SETTINGS.id);
      if (settings === undefined) {
        throw new Error("既定の設定を再生成できませんでした。");
      }
    },
    downloadBackup: downloadBackupArtifact,
    reloadPage: () => window.location.reload(),
    now: () => new Date(),
    appVersion: DATA_MANAGEMENT_APP_VERSION,
    pendingWriteCoordinator: db.pendingWriteCoordinator,
    ...overrides,
  });
}
