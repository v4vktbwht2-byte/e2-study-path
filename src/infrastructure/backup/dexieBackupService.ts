import Dexie from "dexie";
import {
  BACKUP_SCHEMA_VERSION,
  BACKUP_SECTIONS,
  DEFAULT_BACKUP_SECTIONS,
  MAX_BACKUP_FILE_BYTES,
  assertAttemptCompatible,
  chooseNewer,
  mergeDailyPlan,
  mergeSettings,
  mergeStudySession,
  mergeWritingSubmission,
  parseBackupEnvelope,
  type BackupCounts,
  type BackupEnvelope,
  type BackupExportArtifact,
  type BackupExportOptions,
  type BackupPreview,
  type BackupRestoreMode,
  type BackupRestoreResult,
  type BackupSection,
  type PreparedBackupImport,
  type RestorableBackupData,
} from "../../domain/backup";
import { BackupError } from "../../domain/backup";
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
} from "../../domain/models";
import type { ReviewState } from "../../domain/review/types";
import type { AppDb } from "../db/appDb";
import {
  deserializeSpeakingRecording,
  serializeSpeakingRecording,
  speakingRecordingsEqual,
} from "./blobCodec";
import { parseBackupFile, type BackupFileLike } from "./fileValidation";

interface BackupSnapshot extends Omit<RestorableBackupData, "speakingRecordings"> {
  contentVersions: Record<string, string>;
  speakingRecordings?: SpeakingRecording[];
}

function byStringKey<T>(records: readonly T[], key: (record: T) => string): T[] {
  return [...records].sort((left, right) => key(left).localeCompare(key(right)));
}

function emptyCounts(): BackupCounts {
  return Object.fromEntries(
    BACKUP_SECTIONS.map((section) => [section, 0]),
  ) as BackupCounts;
}

function envelopeCounts(envelope: BackupEnvelope): BackupCounts {
  const counts = emptyCounts();
  for (const section of BACKUP_SECTIONS) {
    const records = envelope.data[section];
    counts[section] = records?.length ?? 0;
  }
  return counts;
}

function totalCounts(counts: BackupCounts): number {
  return Object.values(counts).reduce((total, count) => total + count, 0);
}

function buildFileName(now: Date): string {
  return `e2-study-path-backup-${now
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z")}.json`;
}

function mapBy<T>(records: readonly T[], key: (record: T) => string): Map<string, T> {
  return new Map(records.map((record) => [key(record), record]));
}

function mergeRecords<T>(
  current: readonly T[],
  incoming: readonly T[],
  key: (record: T) => string,
  merge: (currentRecord: T | undefined, incomingRecord: T) => T,
): T[] {
  const currentByKey = mapBy(current, key);
  return incoming.map((record) => merge(currentByKey.get(key(record)), record));
}

function assertAttemptReferences(
  attempts: readonly Attempt[],
  sessions: readonly StudySession[],
): void {
  const sessionIds = new Set(sessions.map((session) => session.id));
  const orphan = attempts.find((attempt) => !sessionIds.has(attempt.sessionId));
  if (orphan !== undefined) {
    throw new BackupError(
      "INVALID_REFERENCE",
      `回答履歴「${orphan.id}」が存在しない学習セッションを参照しています。`,
    );
  }
}

function decodeRestorableData(envelope: BackupEnvelope): RestorableBackupData {
  const { speakingRecordings, ...data } = envelope.data;
  return {
    ...data,
    ...(speakingRecordings === undefined
      ? {}
      : {
          speakingRecordings: speakingRecordings.map(deserializeSpeakingRecording),
        }),
  };
}

async function bulkPutIfAny<T>(
  records: readonly T[],
  bulkPut: (records: readonly T[]) => Promise<unknown>,
): Promise<void> {
  if (records.length > 0) {
    await bulkPut(records);
  }
}

export class DexieBackupService {
  constructor(private readonly db: AppDb) {}

  private async readSnapshot(
    includeSpeakingRecordings: boolean,
  ): Promise<BackupSnapshot> {
    const tables = [
      this.db.contentPacks,
      this.db.profiles,
      this.db.settings,
      this.db.reviewStates,
      this.db.mastery,
      this.db.vocabularyUserStates,
      this.db.lessonProgress,
      this.db.attempts,
      this.db.sessions,
      this.db.dailyPlans,
      this.db.writingSubmissions,
      ...(includeSpeakingRecordings ? [this.db.speakingRecordings] : []),
    ];
    return this.db.transaction("r", tables, async () => {
      const [
        contentPacks,
        profiles,
        settings,
        reviewStates,
        mastery,
        vocabularyUserStates,
        lessonProgress,
        attempts,
        sessions,
        dailyPlans,
        writingSubmissions,
        speakingRecordings,
      ] = await Promise.all([
        this.db.contentPacks.toArray(),
        this.db.profiles.toArray(),
        this.db.settings.toArray(),
        this.db.reviewStates.toArray(),
        this.db.mastery.toArray(),
        this.db.vocabularyUserStates.toArray(),
        this.db.lessonProgress.toArray(),
        this.db.attempts.toArray(),
        this.db.sessions.toArray(),
        this.db.dailyPlans.toArray(),
        this.db.writingSubmissions.toArray(),
        includeSpeakingRecordings
          ? this.db.speakingRecordings.toArray()
          : Promise.resolve(undefined),
      ]);
      return {
        contentVersions: Object.fromEntries(
          contentPacks
            .filter((pack) => pack.enabled)
            .sort((left, right) => left.id.localeCompare(right.id))
            .map((pack) => [pack.id, pack.contentVersion]),
        ),
        profiles: byStringKey(profiles, (record) => record.id),
        settings: byStringKey(settings, (record) => record.id),
        reviewStates: byStringKey(reviewStates, (record) => record.itemKey),
        mastery: byStringKey(mastery, (record) => record.itemKey),
        vocabularyUserStates: byStringKey(
          vocabularyUserStates,
          (record) => record.itemKey,
        ),
        lessonProgress: byStringKey(lessonProgress, (record) => record.lessonId),
        attempts: byStringKey(attempts, (record) => record.id),
        sessions: byStringKey(sessions, (record) => record.id),
        dailyPlans: byStringKey(dailyPlans, (record) => record.date),
        writingSubmissions: byStringKey(writingSubmissions, (record) => record.id),
        ...(speakingRecordings === undefined
          ? {}
          : {
              speakingRecordings: byStringKey(
                speakingRecordings,
                (record) => record.id,
              ),
            }),
      };
    });
  }

  async exportBackup(options: BackupExportOptions): Promise<BackupExportArtifact> {
    const now = options.now ?? new Date();
    const includeRecordings = options.includeSpeakingRecordings === true;
    const snapshot = await this.readSnapshot(includeRecordings);
    const serializedRecordings =
      snapshot.speakingRecordings === undefined
        ? undefined
        : await Promise.all(
            snapshot.speakingRecordings.map(serializeSpeakingRecording),
          );
    const envelope = parseBackupEnvelope({
      schemaVersion: BACKUP_SCHEMA_VERSION,
      exportedAt: now.toISOString(),
      appVersion: options.appVersion,
      contentVersions: snapshot.contentVersions,
      includedData: [
        ...DEFAULT_BACKUP_SECTIONS,
        ...(includeRecordings ? (["speakingRecordings"] as const) : []),
      ],
      data: {
        profiles: snapshot.profiles,
        settings: snapshot.settings,
        reviewStates: snapshot.reviewStates,
        mastery: snapshot.mastery,
        vocabularyUserStates: snapshot.vocabularyUserStates,
        lessonProgress: snapshot.lessonProgress,
        attempts: snapshot.attempts,
        sessions: snapshot.sessions,
        dailyPlans: snapshot.dailyPlans,
        writingSubmissions: snapshot.writingSubmissions,
        ...(serializedRecordings === undefined
          ? {}
          : { speakingRecordings: serializedRecordings }),
      },
    });
    const text = `${JSON.stringify(envelope, null, 2)}\n`;
    const sizeBytes = new TextEncoder().encode(text).byteLength;
    if (sizeBytes > MAX_BACKUP_FILE_BYTES) {
      throw new BackupError(
        "EXPORT_TOO_LARGE",
        "バックアップが20 MiBを超えるため書き出せません。",
      );
    }
    return {
      envelope,
      text,
      blob: new Blob([text], { type: "application/json" }),
      fileName: buildFileName(now),
      sizeBytes,
    };
  }

  createSafetyBackupForReplace(
    envelope: BackupEnvelope,
    options: Omit<BackupExportOptions, "includeSpeakingRecordings">,
  ): Promise<BackupExportArtifact> {
    const validated = parseBackupEnvelope(envelope);
    return this.exportBackup({
      ...options,
      includeSpeakingRecordings: validated.includedData.includes("speakingRecordings"),
    });
  }

  private async currentCounts(): Promise<BackupCounts> {
    const counts = emptyCounts();
    const values = await this.db.transaction(
      "r",
      [
        this.db.profiles,
        this.db.settings,
        this.db.reviewStates,
        this.db.mastery,
        this.db.vocabularyUserStates,
        this.db.lessonProgress,
        this.db.attempts,
        this.db.sessions,
        this.db.dailyPlans,
        this.db.writingSubmissions,
        this.db.speakingRecordings,
      ],
      () =>
        Promise.all([
          this.db.profiles.count(),
          this.db.settings.count(),
          this.db.reviewStates.count(),
          this.db.mastery.count(),
          this.db.vocabularyUserStates.count(),
          this.db.lessonProgress.count(),
          this.db.attempts.count(),
          this.db.sessions.count(),
          this.db.dailyPlans.count(),
          this.db.writingSubmissions.count(),
          this.db.speakingRecordings.count(),
        ]),
    );
    BACKUP_SECTIONS.forEach((section, index) => {
      counts[section] = values[index] ?? 0;
    });
    return counts;
  }

  async createPreview(
    envelope: BackupEnvelope,
    fileSizeBytes: number,
    currentAppVersion: string,
  ): Promise<BackupPreview> {
    const validated = parseBackupEnvelope(envelope);
    const [currentCounts, currentPacks] = await Promise.all([
      this.currentCounts(),
      this.db.contentPacks.filter((pack) => pack.enabled).toArray(),
    ]);
    const currentContentVersions = new Map(
      currentPacks.map((pack) => [pack.id, pack.contentVersion]),
    );
    const warnings: string[] = [];
    if (validated.appVersion !== currentAppVersion) {
      warnings.push(
        `バックアップ作成時のアプリversionは${validated.appVersion}、現在は${currentAppVersion}です。`,
      );
    }
    for (const [packId, version] of Object.entries(validated.contentVersions)) {
      const currentVersion = currentContentVersions.get(packId);
      if (currentVersion !== version) {
        warnings.push(
          `教材「${packId}」のversionが異なります（backup: ${version}、現在: ${currentVersion ?? "未導入"}）。`,
        );
      }
    }
    if (!validated.includedData.includes("speakingRecordings")) {
      warnings.push(
        "録音はこのバックアップに含まれません。置換しても端末内の録音は保持されます。",
      );
    }
    return {
      schemaVersion: validated.schemaVersion,
      exportedAt: validated.exportedAt,
      appVersion: validated.appVersion,
      fileSizeBytes,
      contentVersions: { ...validated.contentVersions },
      includedData: [...validated.includedData],
      counts: envelopeCounts(validated),
      currentCounts,
      recordingBytes:
        validated.data.speakingRecordings?.reduce(
          (total, recording) => total + recording.sizeBytes,
          0,
        ) ?? 0,
      warnings,
    };
  }

  async prepareImport(
    file: BackupFileLike,
    currentAppVersion: string,
  ): Promise<PreparedBackupImport> {
    const envelope = await parseBackupFile(file);
    return {
      envelope,
      preview: await this.createPreview(envelope, file.size, currentAppVersion),
    };
  }

  async restoreBackup(
    envelope: BackupEnvelope,
    mode: BackupRestoreMode,
  ): Promise<BackupRestoreResult> {
    const validated = parseBackupEnvelope(envelope);
    const data = decodeRestorableData(validated);
    if (mode === "replace") {
      await this.replace(data, validated.includedData);
    } else {
      await this.merge(data, validated.includedData);
    }
    return {
      mode,
      importedCounts: envelopeCounts(validated),
    };
  }

  private async replace(
    data: RestorableBackupData,
    includedData: readonly BackupSection[],
  ): Promise<void> {
    assertAttemptReferences(data.attempts, data.sessions);
    const includesRecordings = includedData.includes("speakingRecordings");
    const tables = [
      this.db.profiles,
      this.db.settings,
      this.db.reviewStates,
      this.db.mastery,
      this.db.vocabularyUserStates,
      this.db.lessonProgress,
      this.db.attempts,
      this.db.sessions,
      this.db.dailyPlans,
      this.db.writingSubmissions,
      this.db.appMeta,
      ...(includesRecordings ? [this.db.speakingRecordings] : []),
    ];
    await this.db.transaction("rw", tables, async () => {
      await this.db.profiles.clear();
      await this.db.settings.clear();
      await this.db.reviewStates.clear();
      await this.db.mastery.clear();
      await this.db.vocabularyUserStates.clear();
      await this.db.lessonProgress.clear();
      await this.db.attempts.clear();
      await this.db.sessions.clear();
      await this.db.dailyPlans.clear();
      await this.db.writingSubmissions.clear();
      if (includesRecordings) {
        await this.db.speakingRecordings.clear();
      }
      await this.db.appMeta.where("key").startsWith("diagnostic-session:").delete();

      await bulkPutIfAny(data.profiles, (records) => this.db.profiles.bulkPut(records));
      await bulkPutIfAny(data.settings, (records) => this.db.settings.bulkPut(records));
      await bulkPutIfAny(data.reviewStates, (records) =>
        this.db.reviewStates.bulkPut(records),
      );
      await bulkPutIfAny(data.mastery, (records) => this.db.mastery.bulkPut(records));
      await bulkPutIfAny(data.vocabularyUserStates, (records) =>
        this.db.vocabularyUserStates.bulkPut(records),
      );
      await bulkPutIfAny(data.lessonProgress, (records) =>
        this.db.lessonProgress.bulkPut(records),
      );
      await bulkPutIfAny(data.sessions, (records) => this.db.sessions.bulkPut(records));
      await bulkPutIfAny(data.attempts, (records) => this.db.attempts.bulkPut(records));
      await bulkPutIfAny(data.dailyPlans, (records) =>
        this.db.dailyPlans.bulkPut(records),
      );
      await bulkPutIfAny(data.writingSubmissions, (records) =>
        this.db.writingSubmissions.bulkPut(records),
      );
      if (includesRecordings) {
        await bulkPutIfAny(data.speakingRecordings ?? [], (records) =>
          this.db.speakingRecordings.bulkPut(records),
        );
      }
    });
  }

  private async merge(
    data: RestorableBackupData,
    includedData: readonly BackupSection[],
  ): Promise<void> {
    const includesRecordings = includedData.includes("speakingRecordings");
    const tables = [
      this.db.profiles,
      this.db.settings,
      this.db.reviewStates,
      this.db.mastery,
      this.db.vocabularyUserStates,
      this.db.lessonProgress,
      this.db.attempts,
      this.db.sessions,
      this.db.dailyPlans,
      this.db.writingSubmissions,
      ...(includesRecordings ? [this.db.speakingRecordings] : []),
    ];
    await this.db.transaction("rw", tables, async () => {
      const [
        currentProfiles,
        currentSettings,
        currentReviewStates,
        currentMastery,
        currentVocabularyStates,
        currentLessonProgress,
        currentAttempts,
        currentSessions,
        currentDailyPlans,
        currentWriting,
        currentRecordings,
      ] = await Promise.all([
        this.db.profiles.toArray(),
        this.db.settings.toArray(),
        this.db.reviewStates.toArray(),
        this.db.mastery.toArray(),
        this.db.vocabularyUserStates.toArray(),
        this.db.lessonProgress.toArray(),
        this.db.attempts.toArray(),
        this.db.sessions.toArray(),
        this.db.dailyPlans.toArray(),
        this.db.writingSubmissions.toArray(),
        includesRecordings ? this.db.speakingRecordings.toArray() : Promise.resolve([]),
      ]);

      const profiles = mergeRecords(
        currentProfiles,
        data.profiles,
        (record) => record.id,
        (current, incoming) =>
          chooseNewer(current, incoming, (record) => record.updatedAt),
      );
      const settings = mergeRecords(
        currentSettings,
        data.settings,
        (record) => record.id,
        mergeSettings,
      );
      const reviewStates = mergeRecords(
        currentReviewStates,
        data.reviewStates,
        (record) => record.itemKey,
        (current, incoming) =>
          chooseNewer(current, incoming, (record) => record.updatedAt),
      );
      const mastery = mergeRecords(
        currentMastery,
        data.mastery,
        (record) => record.itemKey,
        (current, incoming) =>
          chooseNewer(current, incoming, (record) => record.lastUpdatedAt),
      );
      const vocabularyStates = mergeRecords(
        currentVocabularyStates,
        data.vocabularyUserStates,
        (record) => record.itemKey,
        (current, incoming) =>
          chooseNewer(current, incoming, (record) => record.updatedAt),
      );
      const lessonProgress = mergeRecords(
        currentLessonProgress,
        data.lessonProgress,
        (record) => record.lessonId,
        (current, incoming) =>
          chooseNewer(current, incoming, (record) => record.updatedAt),
      );
      const sessions = mergeRecords(
        currentSessions,
        data.sessions,
        (record) => record.id,
        mergeStudySession,
      );
      const combinedSessions = [
        ...currentSessions.filter(
          (record) => !data.sessions.some((incoming) => incoming.id === record.id),
        ),
        ...sessions,
      ];
      assertAttemptReferences(data.attempts, combinedSessions);
      const attempts = mergeRecords(
        currentAttempts,
        data.attempts,
        (record) => record.id,
        assertAttemptCompatible,
      );
      const dailyPlans = mergeRecords(
        currentDailyPlans,
        data.dailyPlans,
        (record) => record.date,
        mergeDailyPlan,
      );
      const writing = mergeRecords(
        currentWriting,
        data.writingSubmissions,
        (record) => record.id,
        mergeWritingSubmission,
      );

      const recordings: SpeakingRecording[] = [];
      if (includesRecordings) {
        const currentById = mapBy(currentRecordings, (record) => record.id);
        for (const incoming of data.speakingRecordings ?? []) {
          const current = currentById.get(incoming.id);
          if (
            current !== undefined &&
            !(await Dexie.waitFor(speakingRecordingsEqual(current, incoming)))
          ) {
            throw new BackupError(
              "RECORDING_CONFLICT",
              `録音「${incoming.id}」は端末内データと内容が異なります。`,
            );
          }
          recordings.push(current ?? incoming);
        }
      }

      await bulkPutIfAny<UserProfile>(profiles, (records) =>
        this.db.profiles.bulkPut(records),
      );
      await bulkPutIfAny<AppSettings>(settings, (records) =>
        this.db.settings.bulkPut(records),
      );
      await bulkPutIfAny<ReviewState>(reviewStates, (records) =>
        this.db.reviewStates.bulkPut(records),
      );
      await bulkPutIfAny<MasteryProfile>(mastery, (records) =>
        this.db.mastery.bulkPut(records),
      );
      await bulkPutIfAny<VocabularyUserState>(vocabularyStates, (records) =>
        this.db.vocabularyUserStates.bulkPut(records),
      );
      await bulkPutIfAny<LessonProgress>(lessonProgress, (records) =>
        this.db.lessonProgress.bulkPut(records),
      );
      await bulkPutIfAny<StudySession>(sessions, (records) =>
        this.db.sessions.bulkPut(records),
      );
      await bulkPutIfAny<Attempt>(attempts, (records) =>
        this.db.attempts.bulkPut(records),
      );
      await bulkPutIfAny<DailyPlan>(dailyPlans, (records) =>
        this.db.dailyPlans.bulkPut(records),
      );
      await bulkPutIfAny<WritingSubmission>(writing, (records) =>
        this.db.writingSubmissions.bulkPut(records),
      );
      if (includesRecordings) {
        await bulkPutIfAny<SpeakingRecording>(recordings, (records) =>
          this.db.speakingRecordings.bulkPut(records),
        );
      }
    });
  }

  async deleteSpeakingRecordings(): Promise<number> {
    return this.db.transaction("rw", this.db.speakingRecordings, async () => {
      const count = await this.db.speakingRecordings.count();
      await this.db.speakingRecordings.clear();
      return count;
    });
  }

  async deleteAllUserData(): Promise<number> {
    return this.db.transaction(
      "rw",
      [
        this.db.profiles,
        this.db.settings,
        this.db.reviewStates,
        this.db.mastery,
        this.db.vocabularyUserStates,
        this.db.lessonProgress,
        this.db.attempts,
        this.db.sessions,
        this.db.dailyPlans,
        this.db.writingSubmissions,
        this.db.speakingRecordings,
        this.db.appMeta,
      ],
      async () => {
        const counts = await Promise.all([
          this.db.profiles.count(),
          this.db.settings.count(),
          this.db.reviewStates.count(),
          this.db.mastery.count(),
          this.db.vocabularyUserStates.count(),
          this.db.lessonProgress.count(),
          this.db.attempts.count(),
          this.db.sessions.count(),
          this.db.dailyPlans.count(),
          this.db.writingSubmissions.count(),
          this.db.speakingRecordings.count(),
          this.db.appMeta.where("key").startsWith("diagnostic-session:").count(),
        ]);
        await this.db.profiles.clear();
        await this.db.settings.clear();
        await this.db.reviewStates.clear();
        await this.db.mastery.clear();
        await this.db.vocabularyUserStates.clear();
        await this.db.lessonProgress.clear();
        await this.db.attempts.clear();
        await this.db.sessions.clear();
        await this.db.dailyPlans.clear();
        await this.db.writingSubmissions.clear();
        await this.db.speakingRecordings.clear();
        await this.db.appMeta.where("key").startsWith("diagnostic-session:").delete();
        return counts.reduce((total, count) => total + count, 0);
      },
    );
  }

  countEnvelopeRecords(envelope: BackupEnvelope): number {
    return totalCounts(envelopeCounts(parseBackupEnvelope(envelope)));
  }
}
