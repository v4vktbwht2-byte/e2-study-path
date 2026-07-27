import { describe, expect, it } from "vitest";
import backupSample from "../../../contracts/sample/backup.sample.json";
import { DEFAULT_SETTINGS } from "../../infrastructure/db/repositories";
import { BackupError } from "./errors";
import { parseBackupEnvelope } from "./schema";
import {
  BACKUP_SCHEMA_VERSION,
  DEFAULT_BACKUP_SECTIONS,
  MAX_SPEAKING_RECORDING_BYTES,
} from "./types";

function createEnvelope(): Record<string, unknown> {
  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: "2026-07-27T00:00:00.000Z",
    appVersion: "0.1.0",
    contentVersions: { pilot: "0.6.0" },
    includedData: [...DEFAULT_BACKUP_SECTIONS],
    data: {
      profiles: [],
      settings: [DEFAULT_SETTINGS],
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
}

describe("backup schema", () => {
  it("配布sampleをruntime schemaで検証できる", () => {
    expect(parseBackupEnvelope(backupSample).schemaVersion).toBe("1.0.0");
  });

  it("既定対象とsettings 1件を持つ厳密なv1 envelopeを受理する", () => {
    expect(parseBackupEnvelope(createEnvelope())).toMatchObject({
      schemaVersion: "1.0.0",
      includedData: DEFAULT_BACKUP_SECTIONS,
    });
  });

  it("settingsが0件または2件のbackupを拒否する", () => {
    for (const settings of [[], [DEFAULT_SETTINGS, DEFAULT_SETTINGS]]) {
      const envelope = createEnvelope();
      (envelope.data as Record<string, unknown>).settings = settings;
      expect(() => parseBackupEnvelope(envelope)).toThrow(BackupError);
    }
  });

  it("未知フィールド、必須対象欠落、主キー重複を拒否する", () => {
    const unknown = createEnvelope();
    (unknown.data as Record<string, unknown>).unknown = [];
    expect(() => parseBackupEnvelope(unknown)).toThrow(BackupError);

    const missingSection = createEnvelope();
    missingSection.includedData = DEFAULT_BACKUP_SECTIONS.filter(
      (section) => section !== "vocabularyUserStates",
    );
    expect(() => parseBackupEnvelope(missingSection)).toThrow(BackupError);

    const duplicate = createEnvelope();
    (duplicate.data as Record<string, unknown>).sessions = [
      {
        id: "session-1",
        type: "practice",
        startedAt: "2026-07-27T00:00:00.000Z",
        studyDate: "2026-07-27",
        itemKeys: [],
        completedItemKeys: [],
        interrupted: false,
      },
      {
        id: "session-1",
        type: "practice",
        startedAt: "2026-07-27T00:00:00.000Z",
        studyDate: "2026-07-27",
        itemKeys: [],
        completedItemKeys: [],
        interrupted: false,
      },
    ];
    expect(() => parseBackupEnvelope(duplicate)).toThrow(BackupError);
  });

  it("非互換versionを専用エラーとして拒否する", () => {
    const envelope = createEnvelope();
    envelope.schemaVersion = "2.0.0";
    expect(() => parseBackupEnvelope(envelope)).toThrowError(
      expect.objectContaining({ code: "INCOMPATIBLE_VERSION" }),
    );
  });

  it("録音はincludedDataとwire dataを同時に指定しサイズを一致させる", () => {
    const valid = createEnvelope();
    valid.includedData = [...DEFAULT_BACKUP_SECTIONS, "speakingRecordings"];
    (valid.data as Record<string, unknown>).speakingRecordings = [
      {
        id: "recording-1",
        promptId: "speaking-1",
        createdAt: "2026-07-27T00:00:00.000Z",
        durationMs: 1000,
        mimeType: "audio/webm;codecs=opus",
        sizeBytes: 3,
        dataBase64: "AQID",
        selfAssessment: {},
      },
    ];
    expect(parseBackupEnvelope(valid).data.speakingRecordings).toHaveLength(1);

    const mismatch = structuredClone(valid);
    (
      (mismatch.data as Record<string, unknown>).speakingRecordings as Record<
        string,
        unknown
      >[]
    )[0]!.sizeBytes = 4;
    expect(() => parseBackupEnvelope(mismatch)).toThrow(BackupError);

    const oversized = structuredClone(valid);
    (
      (oversized.data as Record<string, unknown>).speakingRecordings as Record<
        string,
        unknown
      >[]
    )[0]!.sizeBytes = MAX_SPEAKING_RECORDING_BYTES + 1;
    expect(() => parseBackupEnvelope(oversized)).toThrow(BackupError);
  });

  it("録音のBase64破損と許可外MIME typeを拒否する", () => {
    const envelope = createEnvelope();
    envelope.includedData = [...DEFAULT_BACKUP_SECTIONS, "speakingRecordings"];
    (envelope.data as Record<string, unknown>).speakingRecordings = [
      {
        id: "recording-1",
        promptId: "speaking-1",
        createdAt: "2026-07-27T00:00:00.000Z",
        durationMs: 1000,
        mimeType: "audio/webm",
        sizeBytes: 3,
        dataBase64: "%%%=",
        selfAssessment: {},
      },
    ];
    expect(() => parseBackupEnvelope(envelope)).toThrow(BackupError);

    const invalidMime = structuredClone(envelope);
    (
      (invalidMime.data as Record<string, unknown>).speakingRecordings as Record<
        string,
        unknown
      >[]
    )[0]!.dataBase64 = "AQID";
    (
      (invalidMime.data as Record<string, unknown>).speakingRecordings as Record<
        string,
        unknown
      >[]
    )[0]!.mimeType = "text/html";
    expect(() => parseBackupEnvelope(invalidMime)).toThrow(BackupError);
  });

  it("Attempt.scoreを0〜1、responseをJSON値へ制限する", () => {
    const envelope = createEnvelope();
    (envelope.data as Record<string, unknown>).attempts = [
      {
        id: "attempt-1",
        itemKey: "practice:reading-1",
        sessionId: "session-1",
        createdAt: "2026-07-27T00:00:00.000Z",
        studyDate: "2026-07-27",
        mode: "readingQuestion",
        response: { selected: 1 },
        correct: true,
        score: 2,
        responseTimeMs: 100,
        hintCount: 0,
      },
    ];
    expect(() => parseBackupEnvelope(envelope)).toThrow(BackupError);

    const nonJson = createEnvelope();
    (nonJson.data as Record<string, unknown>).attempts = [
      {
        id: "attempt-1",
        itemKey: "practice:reading-1",
        sessionId: "session-1",
        createdAt: "2026-07-27T00:00:00.000Z",
        studyDate: "2026-07-27",
        mode: "readingQuestion",
        response: undefined,
        correct: true,
        score: 1,
        responseTimeMs: 100,
        hintCount: 0,
      },
    ];
    expect(() => parseBackupEnvelope(nonJson)).toThrow(BackupError);
  });
});
