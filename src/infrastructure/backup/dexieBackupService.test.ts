import { IDBKeyRange, indexedDB } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  Attempt,
  DailyPlan,
  SpeakingRecording,
  StudySession,
  UserProfile,
  WritingSubmission,
} from "../../domain/models";
import type { ReviewState } from "../../domain/review";
import { AppDb } from "../db/appDb";
import { DEFAULT_SETTINGS } from "../db/repositories";
import { DexieBackupService } from "./dexieBackupService";

const NOW = "2026-07-27T00:00:00.000Z";
let sequence = 0;
let db: AppDb;
let service: DexieBackupService;

function profile(updatedAt = NOW): UserProfile {
  return {
    id: "local-user",
    createdAt: NOW,
    updatedAt,
    goals: ["grade2"],
    dailyMinutes: 15,
    recommendedStage: 1,
    selectedStage: 1,
    onboardingCompleted: true,
  };
}

function session(): StudySession {
  return {
    id: "session-1",
    type: "practice",
    startedAt: NOW,
    endedAt: NOW,
    studyDate: "2026-07-27",
    itemKeys: ["practice:reading-1"],
    completedItemKeys: ["practice:reading-1"],
    interrupted: false,
  };
}

function attempt(response: unknown = { answer: 1 }): Attempt {
  return {
    id: "attempt-1",
    itemKey: "practice:reading-1",
    sessionId: "session-1",
    createdAt: NOW,
    studyDate: "2026-07-27",
    mode: "readingQuestion",
    response,
    correct: true,
    score: 1,
    responseTimeMs: 500,
    hintCount: 0,
  };
}

function reviewState(): ReviewState {
  return {
    itemKey: "vocab:word-1",
    status: "review",
    learningStep: 0,
    intervalDays: 2,
    easeBias: 1,
    dueAt: "2026-07-29T00:00:00.000Z",
    reviewCount: 2,
    lapseCount: 0,
    consecutiveSuccesses: 2,
    updatedAt: NOW,
  };
}

function writing(submitted = true, updatedAt = NOW): WritingSubmission {
  return {
    id: "writing-1",
    promptId: "summary-1",
    type: "summary",
    draft: "A short summary.",
    wordCount: 3,
    checklist: { content: true },
    summaryMemo: "要点",
    opinionOutline: {
      opinion: "",
      reason1: "",
      detail1: "",
      reason2: "",
      detail2: "",
      conclusion: "",
    },
    createdAt: NOW,
    updatedAt,
    ...(submitted ? { submittedAt: NOW } : {}),
  };
}

function dailyPlan(completed: boolean, generatedAt = NOW): DailyPlan {
  return {
    date: "2026-07-27",
    generatedAt,
    targetMinutes: 5,
    mode: "light",
    blocks: [
      {
        blockId: "block-1",
        itemId: "practice:reading-1",
        category: "skillPractice",
        estimatedSeconds: 60,
        status: completed ? "completed" : "pending",
        skill: "reading",
      },
    ],
    completedBlockIds: completed ? ["block-1"] : [],
    sourceSnapshot: { dueCount: 0, overdueCount: 0, newLimit: 0 },
    capacity: {
      requestedMinutes: 5,
      effectiveMinutes: 5,
      budgetSeconds: 300,
      estimatedReviewItemCapacity: 20,
    },
    plannedSeconds: 60,
    remainingBudgetSeconds: 240,
  };
}

function recording(bytes = [1, 2, 3]): SpeakingRecording {
  return {
    id: "recording-1",
    promptId: "speaking-1",
    createdAt: NOW,
    durationMs: 1000,
    mimeType: "audio/webm",
    blob: new Blob([new Uint8Array(bytes)], { type: "audio/webm" }),
    selfAssessment: { pronunciation: 3 },
  };
}

function mockRecordingReads() {
  return vi.spyOn(db.speakingRecordings, "toArray").mockResolvedValue([recording()]);
}

async function seedUserData(): Promise<void> {
  await db.contentPacks.put({
    id: "pilot",
    schemaVersion: "1.0.0",
    contentVersion: "0.6.0",
    title: "Pilot",
    locale: "ja-JP",
    installedAt: NOW,
    source: "bundled",
    enabled: true,
  });
  await db.profiles.put(profile());
  await db.settings.put(DEFAULT_SETTINGS);
  await db.reviewStates.put(reviewState());
  await db.mastery.put({
    itemKey: "vocab:word-1",
    recognition: 20,
    recall: 10,
    listening: 0,
    spelling: 0,
    context: 0,
    lastUpdatedAt: NOW,
  });
  await db.vocabularyUserStates.put({
    itemKey: "vocab:word-1",
    favorite: true,
    note: "重要",
    suspended: false,
    updatedAt: NOW,
  });
  await db.lessonProgress.put({
    lessonId: "lesson-1",
    status: "completed",
    currentSectionIndex: 3,
    bestScore: 1,
    completedAt: NOW,
    updatedAt: NOW,
  });
  await db.sessions.put(session());
  await db.attempts.put(attempt());
  await db.dailyPlans.put(dailyPlan(true));
  await db.writingSubmissions.put(writing());
  await db.speakingRecordings.put(recording());
  await db.appMeta.bulkPut([
    { key: "dbVersion", value: "2", updatedAt: NOW },
    {
      key: "diagnostic-session:initial",
      value: "{}",
      updatedAt: NOW,
    },
  ]);
}

beforeEach(async () => {
  sequence += 1;
  db = new AppDb(`backup-test-${sequence}`, { indexedDB, IDBKeyRange });
  await db.open();
  service = new DexieBackupService(db);
  await seedUserData();
});

afterEach(async () => {
  db.close();
  await db.delete();
});

describe("DexieBackupService", () => {
  it("既定exportは利用者データを含み、教材と録音を含めない", async () => {
    const artifact = await service.exportBackup({
      appVersion: "0.1.0",
      now: new Date(NOW),
    });
    expect(artifact.envelope.contentVersions).toEqual({ pilot: "0.6.0" });
    expect(artifact.envelope.data.vocabularyUserStates).toHaveLength(1);
    expect(artifact.envelope.data.speakingRecordings).toBeUndefined();
    expect(artifact.envelope.includedData).not.toContain("speakingRecordings");
    expect(artifact.text).not.toContain('"contentPacks"');
    expect(artifact.text).not.toContain('"vocabulary"');
  });

  it("録音opt-inでBlobを往復し、replace後も全既定データが一致する", async () => {
    const recordingRead = mockRecordingReads();
    const artifact = await service.exportBackup({
      appVersion: "0.1.0",
      now: new Date(NOW),
      includeSpeakingRecordings: true,
    });
    recordingRead.mockRestore();
    expect(artifact.envelope.data.speakingRecordings?.[0]?.dataBase64).toBe("AQID");

    await service.deleteAllUserData();
    await db.settings.put(DEFAULT_SETTINGS);
    await service.restoreBackup(artifact.envelope, "replace");

    expect(await db.profiles.toArray()).toEqual([profile()]);
    expect(await db.settings.toArray()).toEqual([DEFAULT_SETTINGS]);
    expect(await db.reviewStates.toArray()).toEqual([reviewState()]);
    expect(await db.mastery.toArray()).toEqual([
      {
        itemKey: "vocab:word-1",
        recognition: 20,
        recall: 10,
        listening: 0,
        spelling: 0,
        context: 0,
        lastUpdatedAt: NOW,
      },
    ]);
    expect(await db.vocabularyUserStates.toArray()).toEqual([
      expect.objectContaining({ favorite: true, note: "重要" }),
    ]);
    expect(await db.lessonProgress.toArray()).toEqual([
      {
        lessonId: "lesson-1",
        status: "completed",
        currentSectionIndex: 3,
        bestScore: 1,
        completedAt: NOW,
        updatedAt: NOW,
      },
    ]);
    expect(await db.sessions.toArray()).toEqual([session()]);
    expect(await db.attempts.toArray()).toEqual([attempt()]);
    expect(await db.dailyPlans.toArray()).toEqual([dailyPlan(true)]);
    expect(await db.writingSubmissions.toArray()).toEqual([writing()]);
    const restored = await db.speakingRecordings.get("recording-1");
    expect(restored).toMatchObject({
      id: "recording-1",
      mimeType: "audio/webm",
      durationMs: 1000,
    });
  });

  it("録音なしreplaceは既存録音を保持し診断途中だけ削除する", async () => {
    const artifact = await service.exportBackup({
      appVersion: "0.1.0",
      now: new Date(NOW),
    });
    await db.profiles.put(profile("2026-07-28T00:00:00.000Z"));
    await service.restoreBackup(artifact.envelope, "replace");

    expect(await db.speakingRecordings.count()).toBe(1);
    expect(await db.appMeta.get("diagnostic-session:initial")).toBeUndefined();
    expect(await db.appMeta.get("dbVersion")).toBeDefined();
  });

  it("previewへ件数、録音bytes、version警告を返す", async () => {
    const recordingRead = mockRecordingReads();
    const artifact = await service.exportBackup({
      appVersion: "0.1.0",
      now: new Date(NOW),
      includeSpeakingRecordings: true,
    });
    recordingRead.mockRestore();
    const preview = await service.createPreview(
      artifact.envelope,
      artifact.sizeBytes,
      "0.2.0",
    );
    expect(preview.counts.attempts).toBe(1);
    expect(preview.currentCounts.speakingRecordings).toBe(1);
    expect(preview.recordingBytes).toBe(3);
    expect(preview.warnings).toEqual([expect.stringContaining("0.1.0")]);
  });

  it("mergeはDailyPlan完了と提出済み作文を後退させない", async () => {
    const artifact = await service.exportBackup({
      appVersion: "0.1.0",
      now: new Date(NOW),
    });
    artifact.envelope.data.dailyPlans = [dailyPlan(false, "2026-07-28T00:00:00.000Z")];
    artifact.envelope.data.writingSubmissions = [
      writing(false, "2026-07-28T00:00:00.000Z"),
    ];
    await service.restoreBackup(artifact.envelope, "merge");

    expect((await db.dailyPlans.get("2026-07-27"))?.completedBlockIds).toEqual([
      "block-1",
    ]);
    expect((await db.writingSubmissions.get("writing-1"))?.submittedAt).toBe(NOW);
  });

  it("異内容Attemptの同一IDを拒否し既存DBを変更しない", async () => {
    const artifact = await service.exportBackup({
      appVersion: "0.1.0",
      now: new Date(NOW),
    });
    artifact.envelope.data.profiles = [profile("2026-07-28T00:00:00.000Z")];
    artifact.envelope.data.attempts = [attempt({ answer: 2 })];
    await expect(
      service.restoreBackup(artifact.envelope, "merge"),
    ).rejects.toMatchObject({ code: "ATTEMPT_CONFLICT" });
    expect((await db.profiles.get("local-user"))?.updatedAt).toBe(NOW);
    expect((await db.attempts.get("attempt-1"))?.response).toEqual({ answer: 1 });
  });

  it("異内容録音の同一IDを拒否する", async () => {
    const recordingRead = mockRecordingReads();
    const artifact = await service.exportBackup({
      appVersion: "0.1.0",
      now: new Date(NOW),
      includeSpeakingRecordings: true,
    });
    artifact.envelope.data.speakingRecordings![0]!.dataBase64 = "BAUG";
    artifact.envelope.data.speakingRecordings![0]!.sizeBytes = 3;
    await expect(
      service.restoreBackup(artifact.envelope, "merge"),
    ).rejects.toMatchObject({ code: "RECORDING_CONFLICT" });
    recordingRead.mockRestore();
  });

  it("replaceの参照不正をDB変更前に拒否する", async () => {
    const artifact = await service.exportBackup({
      appVersion: "0.1.0",
      now: new Date(NOW),
    });
    artifact.envelope.data.sessions = [];
    await expect(
      service.restoreBackup(artifact.envelope, "replace"),
    ).rejects.toMatchObject({ code: "INVALID_REFERENCE" });
    expect(await db.attempts.count()).toBe(1);
    expect(await db.profiles.count()).toBe(1);
  });

  it("replace途中のIndexedDB失敗時はclearとappMeta削除をrollbackする", async () => {
    const artifact = await service.exportBackup({
      appVersion: "0.1.0",
      now: new Date(NOW),
    });
    artifact.envelope.data.profiles = [profile("2026-07-28T00:00:00.000Z")];
    const failWritingCreate = () => {
      throw new Error("テスト用の保存失敗");
    };
    db.writingSubmissions.hook("creating", failWritingCreate);
    try {
      await expect(service.restoreBackup(artifact.envelope, "replace")).rejects.toThrow(
        "テスト用の保存失敗",
      );
    } finally {
      db.writingSubmissions.hook("creating").unsubscribe(failWritingCreate);
    }

    expect((await db.profiles.get("local-user"))?.updatedAt).toBe(NOW);
    expect(await db.writingSubmissions.get("writing-1")).toEqual(writing());
    expect(await db.appMeta.get("diagnostic-session:initial")).toBeDefined();
  });

  it("安全backup APIはreplace対象に録音を含む場合だけ録音を退避する", async () => {
    const withoutRecordings = await service.exportBackup({
      appVersion: "0.1.0",
      now: new Date(NOW),
    });
    const safeWithout = await service.createSafetyBackupForReplace(
      withoutRecordings.envelope,
      { appVersion: "0.1.0", now: new Date(NOW) },
    );
    expect(safeWithout.envelope.data.speakingRecordings).toBeUndefined();

    const recordingRead = mockRecordingReads();
    const withRecordings = await service.exportBackup({
      appVersion: "0.1.0",
      now: new Date(NOW),
      includeSpeakingRecordings: true,
    });
    const safeWith = await service.createSafetyBackupForReplace(
      withRecordings.envelope,
      { appVersion: "0.1.0", now: new Date(NOW) },
    );
    expect(safeWith.envelope.data.speakingRecordings).toHaveLength(1);
    recordingRead.mockRestore();
  });

  it("録音だけ削除と全利用者データ削除を教材・内部versionから分離する", async () => {
    expect(await service.deleteSpeakingRecordings()).toBe(1);
    expect(await db.attempts.count()).toBe(1);
    expect(await db.contentPacks.count()).toBe(1);

    const affected = await service.deleteAllUserData();
    expect(affected).toBeGreaterThan(0);
    expect(await db.profiles.count()).toBe(0);
    expect(await db.attempts.count()).toBe(0);
    expect(await db.contentPacks.count()).toBe(1);
    expect(await db.appMeta.get("dbVersion")).toBeDefined();
  });
});
