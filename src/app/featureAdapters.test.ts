import { IDBKeyRange, indexedDB } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Attempt, LessonProgress } from "../domain/models";
import type { LessonSessionIdentity, TerminalLessonProgress } from "../features/lesson";
import type { Lesson } from "../infrastructure/content/schemas";
import { AppDb } from "../infrastructure/db/appDb";
import { createPhase03FeatureAdapters } from "./featureAdapters";

let databaseSequence = 0;
let db: AppDb;

const SESSION: LessonSessionIdentity = {
  id: "lesson-session:lesson-a:2026-07-27T00:00:00.000Z",
  startedAt: "2026-07-27T00:00:00.000Z",
  studyDate: "2026-07-27",
};

function createDatabase(): AppDb {
  databaseSequence += 1;
  return new AppDb(`phase03-adapter-test-${databaseSequence}`, {
    indexedDB,
    IDBKeyRange,
  });
}

function lesson(): Lesson {
  return {
    id: "lesson-a",
    schemaVersion: "1.0.0",
    contentRevision: 1,
    stage: 1,
    unitId: "S1-U1",
    order: 1,
    titleJa: "hello であいさつする",
    descriptionJa: "基本のあいさつです。",
    objectivesJa: ["hello の意味が分かる"],
    prerequisites: [],
    sections: [
      {
        id: "summary",
        type: "summary",
        titleJa: "まとめ",
        bodyJa: "hello を確認しました。",
        estimatedMinutes: 1,
      },
    ],
    estimatedMinutes: 3,
    reviewItemKeys: ["vocab:hello"],
    source: { type: "original", author: "テスト" },
  };
}

function attempt(): Attempt {
  return {
    id: `${SESSION.id}:attempt:1`,
    itemKey: "vocab:hello",
    exerciseId: "exercise-a",
    sessionId: SESSION.id,
    createdAt: "2026-07-27T00:01:00.000Z",
    studyDate: "2026-07-27",
    mode: "multipleChoice",
    response: 0,
    correct: true,
    score: 1,
    responseTimeMs: 0,
    hintCount: 1,
  };
}

function terminalProgress(
  status: TerminalLessonProgress["status"],
  updatedAt = "2026-07-27T00:05:00.000Z",
): TerminalLessonProgress {
  return {
    lessonId: "lesson-a",
    status,
    currentSectionIndex: 2,
    updatedAt,
    ...(status === "completed" ? { completedAt: updatedAt } : {}),
  };
}

beforeEach(() => {
  db = createDatabase();
});

afterEach(async () => {
  db.close();
  await db.delete();
});

describe("Phase03 Dexieアダプター", () => {
  it("回答内容・正誤・ヒント数とレッスンセッションを同時に保存する", async () => {
    const adapter = createPhase03FeatureAdapters(db).lessonProgressStore;

    await adapter.recordAttempt({ attempt: attempt(), session: SESSION });

    await expect(db.attempts.get(attempt().id)).resolves.toEqual(attempt());
    await expect(db.sessions.get(SESSION.id)).resolves.toEqual({
      id: SESSION.id,
      type: "lesson",
      startedAt: SESSION.startedAt,
      studyDate: "2026-07-27",
      itemKeys: ["vocab:hello"],
      completedItemKeys: ["vocab:hello"],
      interrupted: false,
    });
  });

  it("完了進捗・復習状態・セッション終了を1トランザクションで保存する", async () => {
    const adapter = createPhase03FeatureAdapters(db).lessonProgressStore;
    const progress = terminalProgress("completed");

    await adapter.commitTerminal({
      lesson: lesson(),
      progress,
      session: SESSION,
    });

    await expect(db.lessonProgress.get("lesson-a")).resolves.toEqual(progress);
    await expect(db.reviewStates.get("vocab:hello")).resolves.toEqual(
      expect.objectContaining({
        itemKey: "vocab:hello",
        status: "learning",
        reviewCount: 1,
        lastRating: "good",
      }),
    );
    await expect(db.sessions.get(SESSION.id)).resolves.toEqual(
      expect.objectContaining({
        endedAt: progress.updatedAt,
        itemKeys: ["vocab:hello"],
        completedItemKeys: ["vocab:hello"],
        interrupted: false,
      }),
    );
  });

  it("スキップ後に完了するとnewの復習状態をGoodで学習開始へ進める", async () => {
    const adapter = createPhase03FeatureAdapters(db).lessonProgressStore;

    await adapter.commitTerminal({
      lesson: lesson(),
      progress: terminalProgress("skipped"),
      session: SESSION,
    });
    await expect(db.reviewStates.get("vocab:hello")).resolves.toEqual(
      expect.objectContaining({ status: "new", reviewCount: 0 }),
    );

    await adapter.commitTerminal({
      lesson: lesson(),
      progress: terminalProgress("completed", "2026-07-27T00:10:00.000Z"),
      session: SESSION,
    });
    await expect(db.reviewStates.get("vocab:hello")).resolves.toEqual(
      expect.objectContaining({
        status: "learning",
        reviewCount: 1,
        lastRating: "good",
      }),
    );
  });

  it("復習状態の保存に失敗したら終端進捗とセッションもロールバックする", async () => {
    const adapter = createPhase03FeatureAdapters(db).lessonProgressStore;
    const previous: LessonProgress = {
      lessonId: "lesson-a",
      status: "inProgress",
      currentSectionIndex: 1,
      updatedAt: "2026-07-27T00:01:00.000Z",
    };
    await db.lessonProgress.put(previous);
    vi.spyOn(db.reviewStates, "put").mockRejectedValueOnce(
      new Error("復習状態を書き込めません"),
    );

    await expect(
      adapter.commitTerminal({
        lesson: lesson(),
        progress: terminalProgress("completed"),
        session: SESSION,
      }),
    ).rejects.toThrow("復習状態を書き込めません");

    await expect(db.lessonProgress.get("lesson-a")).resolves.toEqual(previous);
    await expect(db.sessions.get(SESSION.id)).resolves.toBeUndefined();
    await expect(db.reviewStates.get("vocab:hello")).resolves.toBeUndefined();
  });
});
