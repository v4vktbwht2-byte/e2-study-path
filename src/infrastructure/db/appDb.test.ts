import Dexie from "dexie";
import { IDBKeyRange, indexedDB } from "fake-indexeddb";
import type {
  Attempt,
  DailyPlan,
  MasteryProfile,
  StudySession,
} from "../../domain/models";
import type { ReviewState } from "../../domain/review/types";
import { loadStarterPack } from "../content/starterPack";
import {
  AppDb,
  DB_VERSION,
  DB_VERSION_1_STORES,
  migrateLegacyDailyPlanRecord,
} from "./appDb";
import {
  DexieAnswerCommitRepository,
  DexieContentRepository,
  DexieReviewStateRepository,
} from "./repositories";

let databaseSequence = 0;
let db: AppDb;

function createDatabase(name?: string) {
  databaseSequence += 1;
  return new AppDb(name ?? `e2-study-path-test-${databaseSequence}`, {
    indexedDB,
    IDBKeyRange,
  });
}

function createReviewState(itemKey = "vocab:vocab-s0-hello-001"): ReviewState {
  return {
    itemKey,
    status: "learning",
    learningStep: 1,
    intervalDays: 0,
    easeBias: 1,
    dueAt: "2026-07-28T04:00:00.000Z",
    lastReviewedAt: "2026-07-27T00:00:00.000Z",
    firstLearnedAt: "2026-07-27T00:00:00.000Z",
    reviewCount: 1,
    lapseCount: 0,
    consecutiveSuccesses: 1,
    lastRating: "good",
    updatedAt: "2026-07-27T00:00:00.000Z",
  };
}

function createMastery(itemKey = "vocab:vocab-s0-hello-001"): MasteryProfile {
  return {
    itemKey,
    recognition: 8,
    recall: 0,
    listening: 0,
    spelling: 0,
    context: 0,
    lastUpdatedAt: "2026-07-27T00:00:00.000Z",
  };
}

function createAttempt(sessionId = "session-1"): Attempt {
  return {
    id: "attempt-1",
    itemKey: "vocab:vocab-s0-hello-001",
    exerciseId: "exercise-s0-hello-meaning-001",
    sessionId,
    createdAt: "2026-07-27T00:00:00.000Z",
    studyDate: "2026-07-27",
    mode: "recognitionChoice",
    response: 0,
    correct: true,
    score: 1,
    responseTimeMs: 2800,
    hintCount: 0,
    confidence: "medium",
    suggestedRating: "good",
    finalRating: "good",
  };
}

function createSession(): StudySession {
  return {
    id: "session-1",
    type: "daily",
    startedAt: "2026-07-27T00:00:00.000Z",
    studyDate: "2026-07-27",
    itemKeys: ["vocab:vocab-s0-hello-001"],
    completedItemKeys: [],
    interrupted: false,
  };
}

function createDailyPlan(): DailyPlan {
  return {
    date: "2026-07-27",
    generatedAt: "2026-07-27T00:00:00.000Z",
    targetMinutes: 5,
    mode: "light",
    blocks: [
      {
        blockId: "review-block",
        itemId: "vocab:vocab-s0-hello-001",
        category: "dueReview",
        estimatedSeconds: 20,
        status: "pending",
      },
    ],
    completedBlockIds: [],
    sourceSnapshot: {
      dueCount: 1,
      overdueCount: 0,
      newLimit: 3,
    },
    capacity: {
      requestedMinutes: 5,
      effectiveMinutes: 5,
      budgetSeconds: 300,
      estimatedReviewItemCapacity: 20,
    },
    plannedSeconds: 20,
    remainingBudgetSeconds: 280,
  };
}

beforeEach(() => {
  db = createDatabase();
});

afterEach(async () => {
  db.close();
  await db.delete();
});

describe("IndexedDB schemaとrepository", () => {
  it("最新版の全テーブルを作成する", async () => {
    await db.open();

    expect(db.verno).toBe(DB_VERSION);
    expect(db.tables.map((table) => table.name).sort()).toEqual(
      [
        "appMeta",
        "attempts",
        "contentPacks",
        "dailyPlans",
        "exercises",
        "lessonProgress",
        "lessons",
        "mastery",
        "practiceSets",
        "profiles",
        "reviewStates",
        "sessions",
        "settings",
        "speakingRecordings",
        "vocabulary",
        "vocabularyUserStates",
        "writingSubmissions",
      ].sort(),
    );
  });

  it("version 1の旧DailyPlanをblock状態付きの現行契約へ移行する", async () => {
    const databaseName = `e2-study-path-migration-${databaseSequence}`;
    db.close();
    await db.delete();
    const legacyDb = new Dexie(databaseName, {
      indexedDB,
      IDBKeyRange,
    });
    legacyDb.version(1).stores(DB_VERSION_1_STORES);
    await legacyDb.open();
    await legacyDb.table("dailyPlans").put({
      date: "2026-07-27",
      generatedAt: "2026-07-27T00:00:00.000Z",
      targetMinutes: 15,
      mode: "standard",
      blocks: [
        {
          id: "legacy-review",
          type: "due",
          titleJa: "復習",
          itemKeys: ["vocab:a", "vocab:b"],
          estimatedSeconds: 20,
        },
      ],
      completedBlockIds: ["legacy-review"],
      sourceSnapshot: {
        dueCount: 2,
        overdueCount: 0,
        newLimit: 3,
      },
    });
    legacyDb.close();

    const migratedDb = new AppDb(databaseName, {
      indexedDB,
      IDBKeyRange,
    });
    await migratedDb.open();
    const migrated = await migratedDb.dailyPlans.get("2026-07-27");

    expect(migratedDb.verno).toBe(2);
    expect(migrated?.blocks).toEqual([
      expect.objectContaining({
        blockId: "legacy-review:1",
        itemId: "vocab:a",
        category: "dueReview",
        status: "completed",
      }),
      expect.objectContaining({
        blockId: "legacy-review:2",
        itemId: "vocab:b",
        category: "dueReview",
        status: "completed",
      }),
    ]);
    expect(migrated?.completedBlockIds).toEqual(["legacy-review:1", "legacy-review:2"]);
    expect(migrated?.capacity.requestedMinutes).toBe(15);
    migratedDb.close();
    await migratedDb.delete();

    db = createDatabase();
  });

  it("現行DailyPlanはmigration helperで同じ参照を保つ", () => {
    const current = createDailyPlan();
    expect(migrateLegacyDailyPlanRecord(current)).toBe(current);
  });

  it("同一contentVersionを重複seedしない", async () => {
    const repository = new DexieContentRepository(db);
    const pack = loadStarterPack();

    await expect(
      repository.seedBundledPack(pack, "2026-07-27T00:00:00.000Z"),
    ).resolves.toBe("installed");
    await expect(
      repository.seedBundledPack(pack, "2026-07-27T01:00:00.000Z"),
    ).resolves.toBe("unchanged");

    expect(await db.vocabulary.count()).toBe(pack.vocabulary.length);
    expect(await db.lessons.count()).toBe(pack.lessons.length);
    expect(await db.exercises.count()).toBe(pack.exercises.length);
    expect((await db.contentPacks.get(pack.id))?.installedAt).toBe(
      "2026-07-27T00:00:00.000Z",
    );
  });

  it("教材更新時も同じIDの履歴を維持する", async () => {
    const repository = new DexieContentRepository(db);
    const pack = loadStarterPack();
    const state = createReviewState();
    await repository.seedBundledPack(pack, "2026-07-27T00:00:00.000Z");
    await db.reviewStates.put(state);

    await expect(
      repository.seedBundledPack(
        { ...pack, contentVersion: "0.2.0" },
        "2026-07-28T00:00:00.000Z",
      ),
    ).resolves.toBe("updated");

    expect(await db.reviewStates.get(state.itemKey)).toEqual(state);
  });

  it("dueAt以前の復習だけを日時順で取得する", async () => {
    const repository = new DexieReviewStateRepository(db);
    await db.reviewStates.bulkPut([
      createReviewState("vocab:a"),
      {
        ...createReviewState("vocab:b"),
        dueAt: "2026-07-29T04:00:00.000Z",
      },
    ]);

    await expect(repository.listDue("2026-07-28T23:59:59.999Z")).resolves.toEqual([
      expect.objectContaining({ itemKey: "vocab:a" }),
    ]);
  });

  it("回答確定を5領域へ同一transactionで反映する", async () => {
    const repository = new DexieAnswerCommitRepository(db);
    await db.sessions.put(createSession());
    await db.dailyPlans.put(createDailyPlan());

    const result = await repository.commit({
      attempt: createAttempt(),
      reviewState: createReviewState(),
      mastery: createMastery(),
      sessionId: "session-1",
      dailyPlanDate: "2026-07-27",
      completedPlanBlockId: "review-block",
    });

    expect(await db.attempts.count()).toBe(1);
    expect(await db.reviewStates.count()).toBe(1);
    expect(await db.mastery.count()).toBe(1);
    expect(result.session.completedItemKeys).toEqual(["vocab:vocab-s0-hello-001"]);
    expect(result.dailyPlan?.completedBlockIds).toEqual(["review-block"]);
    expect(result.dailyPlan?.blocks[0]?.status).toBe("completed");
  });

  it("同じplan blockを再確定してもstatusと完了IDを重複させない", async () => {
    const repository = new DexieAnswerCommitRepository(db);
    await db.sessions.put(createSession());
    await db.dailyPlans.put(createDailyPlan());
    const base = {
      reviewState: createReviewState(),
      mastery: createMastery(),
      sessionId: "session-1",
      dailyPlanDate: "2026-07-27",
      completedPlanBlockId: "review-block",
    };

    await repository.commit({ ...base, attempt: createAttempt() });
    await repository.commit({
      ...base,
      attempt: { ...createAttempt(), id: "attempt-2" },
    });

    const plan = await db.dailyPlans.get("2026-07-27");
    expect(plan?.completedBlockIds).toEqual(["review-block"]);
    expect(plan?.blocks[0]?.status).toBe("completed");
    expect(await db.attempts.count()).toBe(2);
  });

  it("plan block確定に失敗したら回答の5領域をすべてロールバックする", async () => {
    const repository = new DexieAnswerCommitRepository(db);
    const session = createSession();
    const plan = createDailyPlan();
    await db.sessions.put(session);
    await db.dailyPlans.put(plan);

    await expect(
      repository.commit({
        attempt: createAttempt(),
        reviewState: createReviewState(),
        mastery: createMastery(),
        sessionId: session.id,
        dailyPlanDate: plan.date,
        completedPlanBlockId: "missing-block",
      }),
    ).rejects.toThrow("日次プランblockが見つかりません");

    expect(await db.attempts.count()).toBe(0);
    expect(await db.reviewStates.count()).toBe(0);
    expect(await db.mastery.count()).toBe(0);
    await expect(db.sessions.get(session.id)).resolves.toEqual(session);
    await expect(db.dailyPlans.get(plan.date)).resolves.toEqual(plan);
  });

  it("transaction途中の失敗で部分データを残さない", async () => {
    const repository = new DexieAnswerCommitRepository(db);

    await expect(
      repository.commit({
        attempt: createAttempt("missing-session"),
        reviewState: createReviewState(),
        mastery: createMastery(),
        sessionId: "missing-session",
      }),
    ).rejects.toMatchObject({ code: "SESSION_NOT_FOUND" });

    expect(await db.attempts.count()).toBe(0);
    expect(await db.reviewStates.count()).toBe(0);
    expect(await db.mastery.count()).toBe(0);
  });

  it("DBを閉じて開き直しても保存状態を読める", async () => {
    const databaseName = `e2-study-path-reload-${databaseSequence}`;
    db.close();
    await db.delete();
    const first = createDatabase(databaseName);
    await first.reviewStates.put(createReviewState());
    first.close();

    const reopened = createDatabase(databaseName);
    await expect(
      reopened.reviewStates.get("vocab:vocab-s0-hello-001"),
    ).resolves.toEqual(expect.objectContaining({ status: "learning", reviewCount: 1 }));
    reopened.close();
    await reopened.delete();

    db = createDatabase();
  });
});
