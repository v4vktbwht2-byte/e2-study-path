import { IDBKeyRange, indexedDB } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  Attempt,
  DailyPlan,
  LessonProgress,
  StudySession,
} from "../domain/models";
import { createNewReviewState } from "../domain/review";
import type { LessonSessionIdentity, TerminalLessonProgress } from "../features/lesson";
import type { Lesson } from "../infrastructure/content/schemas";
import { AppDb } from "../infrastructure/db/appDb";
import { DEFAULT_SETTINGS } from "../infrastructure/db/repositories";
import {
  createAppStudyDayResolver,
  createPhase03FeatureAdapters,
} from "./featureAdapters";

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

function dailyPlan(): DailyPlan {
  return {
    date: "2026-07-27",
    generatedAt: "2026-07-27T00:00:00.000Z",
    targetMinutes: 5,
    mode: "light",
    blocks: [
      {
        blockId: "lesson-block",
        itemId: "lesson:lesson-a",
        category: "currentLesson",
        estimatedSeconds: 180,
        status: "pending",
      },
    ],
    completedBlockIds: [],
    sourceSnapshot: { dueCount: 0, overdueCount: 0, newLimit: 0 },
    capacity: {
      requestedMinutes: 5,
      effectiveMinutes: 5,
      budgetSeconds: 300,
      estimatedReviewItemCapacity: 20,
    },
    plannedSeconds: 180,
    remainingBudgetSeconds: 120,
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
  it("settingsの開始時刻とIANA timezoneから学習日を解決する", async () => {
    await db.settings.put({ ...DEFAULT_SETTINGS, studyDayStartHour: 4 });
    const resolver = createAppStudyDayResolver(db, "Asia/Tokyo");

    await expect(resolver(new Date("2026-07-27T18:59:59.999Z"))).resolves.toMatchObject(
      { studyDate: "2026-07-27" },
    );
    await expect(resolver(new Date("2026-07-27T19:00:00.000Z"))).resolves.toMatchObject(
      { studyDate: "2026-07-28" },
    );
  });

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

  it("新しいlesson sessionの回答時に同lessonの旧未終了sessionを中断終了する", async () => {
    const adapter = createPhase03FeatureAdapters(db).lessonProgressStore;
    const previous: StudySession = {
      id: "lesson-session:lesson-a:2026-07-26T00:00:00.000Z",
      type: "lesson",
      startedAt: "2026-07-26T00:00:00.000Z",
      studyDate: "2026-07-26",
      itemKeys: ["vocab:hello"],
      completedItemKeys: [],
      interrupted: false,
    };
    await db.sessions.put(previous);

    await adapter.recordAttempt({ attempt: attempt(), session: SESSION });

    await expect(db.sessions.get(previous.id)).resolves.toEqual({
      ...previous,
      endedAt: SESSION.startedAt,
      interrupted: true,
    });
    await expect(db.sessions.get(SESSION.id)).resolves.toEqual(
      expect.objectContaining({ interrupted: false }),
    );
  });

  it("完了済みlessonのplan復習位置と回答済み問題を保存する", async () => {
    const adapter = createPhase03FeatureAdapters(db).lessonProgressStore;
    const completed = terminalProgress("completed");
    await db.lessonProgress.put(completed);

    const saved = await adapter.saveReviewCheckpoint({
      lessonId: "lesson-a",
      progress: completed,
      planContext: {
        planDate: "2026-07-27",
        blockId: "lesson-block",
        itemKey: "lesson:lesson-a",
      },
      currentSectionIndex: 2,
      answeredExerciseIds: ["exercise-a", "exercise-a"],
      updatedAt: "2026-07-27T00:03:00.000Z",
    });

    expect(saved.reviewCheckpoint).toEqual({
      planDate: "2026-07-27",
      blockId: "lesson-block",
      currentSectionIndex: 2,
      answeredExerciseIds: ["exercise-a"],
      updatedAt: "2026-07-27T00:03:00.000Z",
    });
    await expect(db.lessonProgress.get("lesson-a")).resolves.toEqual(saved);
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

  it("レッスン終端とplan blockの表示状態・完了IDを原子的に確定する", async () => {
    const adapter = createPhase03FeatureAdapters(db).lessonProgressStore;
    const plan = dailyPlan();
    await db.dailyPlans.put(plan);
    await db.reviewStates.put({
      ...createNewReviewState("lesson:lesson-a", new Date("2026-07-26T00:00:00.000Z")),
      status: "review",
      intervalDays: 1,
      reviewCount: 1,
      dueAt: "2026-07-27T00:00:00.000Z",
    });

    await adapter.commitTerminal({
      lesson: lesson(),
      progress: terminalProgress("completed"),
      session: SESSION,
      planContext: {
        planDate: plan.date,
        blockId: "lesson-block",
        itemKey: "lesson:lesson-a",
      },
    });

    const storedPlan = await db.dailyPlans.get(plan.date);
    expect(storedPlan?.completedBlockIds).toEqual(["lesson-block"]);
    expect(storedPlan?.blocks[0]?.status).toBe("completed");
    expect((await db.reviewStates.get("lesson:lesson-a"))?.reviewCount).toBe(2);
  });

  it("plan block確定失敗時は進捗・復習・セッションをロールバックする", async () => {
    const adapter = createPhase03FeatureAdapters(db).lessonProgressStore;
    const plan = dailyPlan();
    const previous: LessonProgress = {
      lessonId: "lesson-a",
      status: "inProgress",
      currentSectionIndex: 1,
      updatedAt: "2026-07-27T00:01:00.000Z",
    };
    await db.lessonProgress.put(previous);
    await db.dailyPlans.put(plan);

    await expect(
      adapter.commitTerminal({
        lesson: lesson(),
        progress: terminalProgress("completed"),
        session: SESSION,
        planContext: {
          planDate: plan.date,
          blockId: "missing-block",
          itemKey: "lesson:lesson-a",
        },
      }),
    ).rejects.toThrow("日次プランblockが見つかりません");

    await expect(db.lessonProgress.get("lesson-a")).resolves.toEqual(previous);
    await expect(db.reviewStates.get("vocab:hello")).resolves.toBeUndefined();
    await expect(db.sessions.get(SESSION.id)).resolves.toBeUndefined();
    await expect(db.dailyPlans.get(plan.date)).resolves.toEqual(plan);
  });

  it("URLのplan項目が別レッスンを指す場合は全更新をロールバックする", async () => {
    const adapter = createPhase03FeatureAdapters(db).lessonProgressStore;
    const basePlan = dailyPlan();
    const mismatchedPlan = {
      ...basePlan,
      blocks: basePlan.blocks.map((block) => ({
        ...block,
        itemId: "lesson:lesson-b",
      })),
    };
    await db.dailyPlans.put(mismatchedPlan);

    await expect(
      adapter.commitTerminal({
        lesson: lesson(),
        progress: terminalProgress("completed"),
        session: SESSION,
        planContext: {
          planDate: mismatchedPlan.date,
          blockId: "lesson-block",
          itemKey: "lesson:lesson-b",
        },
      }),
    ).rejects.toThrow("開いているレッスンが一致しません");

    await expect(db.lessonProgress.get("lesson-a")).resolves.toBeUndefined();
    await expect(db.reviewStates.get("vocab:hello")).resolves.toBeUndefined();
    await expect(db.sessions.get(SESSION.id)).resolves.toBeUndefined();
    await expect(db.dailyPlans.get(mismatchedPlan.date)).resolves.toEqual(
      mismatchedPlan,
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
