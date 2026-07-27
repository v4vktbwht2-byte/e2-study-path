import { IDBKeyRange, indexedDB } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { pilotListeningPracticeSets } from "../../content/pilot/practiceListening";
import type { DailyPlan } from "../../domain/models";
import { AppDb } from "../../infrastructure/db/appDb";
import { createListeningCompletionRecords, listeningItemKey } from "./model";
import { parseListeningPracticeSet } from "./schemas";
import {
  createDexieListeningContentPort,
  createDexieListeningStudyStore,
} from "./dexieListeningStore";

const NOW = new Date("2026-07-27T03:00:00.000Z");
const set = parseListeningPracticeSet(pilotListeningPracticeSets[0]);
let sequence = 0;
let db: AppDb;

function createDatabase(name?: string): AppDb {
  sequence += 1;
  return new AppDb(name ?? `listening-store-${sequence}`, {
    indexedDB,
    IDBKeyRange,
  });
}

function createRecords(suffix = "1") {
  return createListeningCompletionRecords({
    set,
    mode: "exam",
    selectedChoiceId: set.payload.question.correctChoiceId,
    dictation: "",
    selfPractice: false,
    attemptId: `listening-attempt-${suffix}`,
    sessionId: `listening-session-${suffix}`,
    startedAt: new Date(NOW.getTime() - 20_000),
    completedAt: NOW,
    studyDate: "2026-07-27",
  });
}

function createPlan(): DailyPlan {
  const itemKey = listeningItemKey(set.id);
  return {
    date: "2026-07-27",
    generatedAt: NOW.toISOString(),
    targetMinutes: 15,
    mode: "standard",
    blocks: [
      {
        blockId: "listening-block-1",
        itemId: itemKey,
        category: "skillPractice",
        estimatedSeconds: set.estimatedMinutes * 60,
        status: "pending",
        skill: "listening",
      },
    ],
    completedBlockIds: [],
    sourceSnapshot: { dueCount: 0, overdueCount: 0, newLimit: 3 },
    capacity: {
      requestedMinutes: 15,
      effectiveMinutes: 15,
      budgetSeconds: 900,
      estimatedReviewItemCapacity: 60,
    },
    plannedSeconds: set.estimatedMinutes * 60,
    remainingBudgetSeconds: 900 - set.estimatedMinutes * 60,
  };
}

beforeEach(() => {
  db = createDatabase();
});

afterEach(async () => {
  db.close();
  await db.delete();
});

describe("リスニングDexieアダプター", () => {
  it("Attempt・StudySession・DailyPlan blockを1トランザクションで保存する", async () => {
    const plan = createPlan();
    await db.dailyPlans.put(plan);
    const store = createDexieListeningStudyStore(db);
    const records = createRecords();
    const result = await store.commitCompletion({
      ...records,
      planContext: {
        planDate: plan.date,
        blockId: "listening-block-1",
        itemKey: listeningItemKey(set.id),
      },
    });

    expect(await db.attempts.get(records.attempt.id)).toEqual(records.attempt);
    expect(await db.sessions.get(records.session.id)).toEqual(records.session);
    expect(result.dailyPlan?.completedBlockIds).toEqual(["listening-block-1"]);
    expect((await db.dailyPlans.get(plan.date))?.blocks[0]?.status).toBe("completed");
  });

  it("plan確定に失敗したらAttemptとStudySessionをロールバックする", async () => {
    const store = createDexieListeningStudyStore(db);
    const records = createRecords("rollback");

    await expect(
      store.commitCompletion({
        ...records,
        planContext: {
          planDate: "2026-07-27",
          blockId: "missing",
          itemKey: listeningItemKey(set.id),
        },
      }),
    ).rejects.toMatchObject({ code: "DAILY_PLAN_NOT_FOUND" });

    expect(await db.attempts.count()).toBe(0);
    expect(await db.sessions.count()).toBe(0);
  });

  it("planの教材が違う場合も3領域を変更しない", async () => {
    const plan = createPlan();
    await db.dailyPlans.put(plan);
    const store = createDexieListeningStudyStore(db);
    const records = createRecords("mismatch");

    await expect(
      store.commitCompletion({
        ...records,
        planContext: {
          planDate: plan.date,
          blockId: "listening-block-1",
          itemKey: "practice:listening-other",
        },
      }),
    ).rejects.toMatchObject({ code: "DAILY_PLAN_ITEM_MISMATCH" });

    expect(await db.attempts.count()).toBe(0);
    expect(await db.sessions.count()).toBe(0);
    await expect(db.dailyPlans.get(plan.date)).resolves.toEqual(plan);
  });

  it("DBを開き直しても教材・回答・完了sessionを読める", async () => {
    const databaseName = `listening-reload-${sequence}`;
    db.close();
    await db.delete();
    const first = createDatabase(databaseName);
    await first.practiceSets.put(pilotListeningPracticeSets[0]!);
    const records = createRecords("reload");
    await createDexieListeningStudyStore(first).commitCompletion(records);
    first.close();

    const reopened = createDatabase(databaseName);
    const content = await createDexieListeningContentPort(reopened).listListeningSets();
    const history = await createDexieListeningStudyStore(reopened).loadHistory();

    expect(content).toEqual([pilotListeningPracticeSets[0]]);
    expect(history.attempts).toEqual([records.attempt]);
    expect(history.sessions).toEqual([records.session]);
    reopened.close();
    await reopened.delete();
    db = createDatabase();
  });
});
