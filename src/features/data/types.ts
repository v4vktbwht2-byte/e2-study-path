export type RestoreMode = "merge" | "replace";

export type BackupDataCategory =
  | "profiles"
  | "settings"
  | "reviewStates"
  | "mastery"
  | "vocabularyUserStates"
  | "lessonProgress"
  | "attempts"
  | "sessions"
  | "dailyPlans"
  | "writingSubmissions"
  | "speakingRecordings";

export interface AvailableStorageEstimate {
  readonly status: "available";
  readonly usageBytes: number;
  readonly quotaBytes: number;
}

export interface UnsupportedCapability {
  readonly status: "unsupported";
  readonly message: string;
}

export type StorageEstimate = AvailableStorageEstimate | UnsupportedCapability;

export type PersistentStorageState =
  | {
      readonly status: "available";
      readonly persisted: boolean;
    }
  | UnsupportedCapability;

export type CacheStorageSummary =
  | {
      readonly status: "available";
      readonly entryCount: number;
      readonly bytes: number;
    }
  | UnsupportedCapability;

export interface StoredRecordingSummary {
  readonly count: number;
  readonly bytes: number;
}

export interface DataManagementOverview {
  readonly storageEstimate: StorageEstimate;
  readonly persistentStorage: PersistentStorageState;
  readonly recordings: StoredRecordingSummary;
  readonly audioCache: CacheStorageSummary;
  readonly appCache: CacheStorageSummary;
}

export interface BackupExportOptions {
  readonly includeRecordings: boolean;
}

export interface BackupExportResult {
  readonly fileName: string;
  readonly recordCount: number;
  readonly recordingCount: number;
  readonly sizeBytes: number;
}

export interface BackupPreview {
  readonly schemaVersion: string;
  readonly appVersion: string;
  readonly exportedAt: string;
  readonly contentVersions: Readonly<Record<string, string>>;
  readonly counts: Readonly<Partial<Record<BackupDataCategory, number>>>;
  readonly recordingBytes: number;
  readonly warnings: readonly string[];
}

export interface RestoreBackupInput {
  /**
   * Portは確認時と同じファイルを再検証してから、単一transactionで復元する。
   */
  readonly file: File;
  readonly mode: RestoreMode;
  readonly createSafetyBackup: boolean;
}

export interface RestoreBackupResult {
  readonly mode: RestoreMode;
  readonly restoredRecordCount: number;
  readonly safetyBackupFileName?: string;
  readonly warnings?: readonly string[];
}

export type PersistenceRequestResult =
  | {
      readonly status: "granted";
    }
  | {
      readonly status: "denied";
      readonly message?: string;
    }
  | {
      readonly status: "unsupported";
      readonly message: string;
    };

export interface DataOperationResult {
  readonly affectedCount?: number;
  readonly freedBytes?: number;
}

/**
 * DataManagementPageからブラウザーAPI・IndexedDB・ダウンロードを分離するPort。
 *
 * - inspectBackupはDBを変更せず、サイズ・JSON・schema・互換性を検証する。
 * - restoreBackupはファイルを再検証し、失敗時に一部反映しない。
 * - clear/rebuild系はIndexedDBの学習データを削除しない。
 */
export interface DataManagementPort {
  loadOverview(): Promise<DataManagementOverview>;
  requestPersistentStorage(): Promise<PersistenceRequestResult>;
  exportBackup(options: BackupExportOptions): Promise<BackupExportResult>;
  inspectBackup(file: File): Promise<BackupPreview>;
  restoreBackup(input: RestoreBackupInput): Promise<RestoreBackupResult>;
  deleteRecordings(): Promise<DataOperationResult>;
  clearAudioCache(): Promise<DataOperationResult>;
  rebuildAppCache(): Promise<DataOperationResult>;
  deleteAllUserData(): Promise<DataOperationResult>;
}

export interface DataManagementPageProps {
  readonly port: DataManagementPort;
  readonly onAllUserDataDeleted?: () => void;
}
