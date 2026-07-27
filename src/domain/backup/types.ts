import type {
  AppSettings,
  Attempt,
  DailyPlan,
  LessonProgress,
  MasteryProfile,
  SpeakingRecording,
  StudySession,
  UserProfile,
  VocabularyUserState,
  WritingSubmission,
} from "../models";
import type { ReviewState } from "../review/types";

export const BACKUP_SCHEMA_VERSION = "1.0.0" as const;
export const MAX_BACKUP_FILE_BYTES = 20 * 1024 * 1024;
export const MAX_SPEAKING_RECORDING_BYTES = 10 * 1024 * 1024;

export const DEFAULT_BACKUP_SECTIONS = [
  "profiles",
  "settings",
  "reviewStates",
  "mastery",
  "vocabularyUserStates",
  "lessonProgress",
  "attempts",
  "sessions",
  "dailyPlans",
  "writingSubmissions",
] as const;

export const BACKUP_SECTIONS = [
  ...DEFAULT_BACKUP_SECTIONS,
  "speakingRecordings",
] as const;

export type BackupSection = (typeof BACKUP_SECTIONS)[number];
export type DefaultBackupSection = (typeof DEFAULT_BACKUP_SECTIONS)[number];

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  JsonPrimitive | readonly JsonValue[] | { readonly [key: string]: JsonValue };

export interface SerializedSpeakingRecording {
  id: string;
  promptId: string;
  createdAt: string;
  durationMs: number;
  mimeType: string;
  sizeBytes: number;
  dataBase64: string;
  selfAssessment: Record<string, number | boolean | string>;
}

export interface BackupData {
  profiles: UserProfile[];
  settings: AppSettings[];
  reviewStates: ReviewState[];
  mastery: MasteryProfile[];
  vocabularyUserStates: VocabularyUserState[];
  lessonProgress: LessonProgress[];
  attempts: Attempt[];
  sessions: StudySession[];
  dailyPlans: DailyPlan[];
  writingSubmissions: WritingSubmission[];
  speakingRecordings?: SerializedSpeakingRecording[];
}

export interface BackupEnvelope {
  schemaVersion: typeof BACKUP_SCHEMA_VERSION;
  exportedAt: string;
  appVersion: string;
  contentVersions: Record<string, string>;
  includedData: BackupSection[];
  data: BackupData;
}

export type RestorableBackupData = Omit<BackupData, "speakingRecordings"> & {
  speakingRecordings?: SpeakingRecording[];
};

export type BackupCounts = Record<BackupSection, number>;

export interface BackupPreview {
  schemaVersion: typeof BACKUP_SCHEMA_VERSION;
  exportedAt: string;
  appVersion: string;
  fileSizeBytes: number;
  contentVersions: Record<string, string>;
  includedData: BackupSection[];
  counts: BackupCounts;
  currentCounts: BackupCounts;
  recordingBytes: number;
  warnings: string[];
}

export interface BackupExportOptions {
  appVersion: string;
  now?: Date;
  includeSpeakingRecordings?: boolean;
}

export type BackupRestoreMode = "replace" | "merge";

export interface BackupRestoreResult {
  mode: BackupRestoreMode;
  importedCounts: BackupCounts;
}

export interface BackupExportArtifact {
  envelope: BackupEnvelope;
  text: string;
  blob: Blob;
  fileName: string;
  sizeBytes: number;
}

export interface PreparedBackupImport {
  envelope: BackupEnvelope;
  preview: BackupPreview;
}
