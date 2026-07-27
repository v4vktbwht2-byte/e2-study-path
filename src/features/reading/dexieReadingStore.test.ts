import { IDBKeyRange, indexedDB } from "fake-indexeddb";
import { afterEach, describe, expect, it } from "vitest";
import { pilotReadingPracticeSets } from "../../content/pilot/practiceReading";
import { pilotVocabulary } from "../../content/pilot/vocabulary";
import type { Attempt, DailyPlan, StudySession } from "../../domain/models";
import { AppDb } from "../../infrastructure/db/appDb";
import {
  createDexieReadingContentPort,
  createDexieReadingLearningStore,
} from "./dexieReadingStore";
import { readingItemKey } from "./model";
import { parseReadingPracticeSet } from "./schema";

let databaseSequence = 0;
const databases: AppDb[] = [];

function createDatabase(name?: string): AppDb {
  databaseSequence += 1;
  const db = new AppDb(name ?? `reading-test-${databaseSequence}`, {
    indexedDB,
    IDBKeyRange,
  });
  databases.push(db);
  return db;
}

function createSession(setId: string): StudySession {
  return {
    id: `reading-session:${setId}:1`,
    type: "practice",
    startedAt: "2026-07-27T00:00:00.000Z",
    studyDate: "2026-07-27",
    itemKeys: [readingItemKey(setId)],
    completedItemKeys: [],
    interrupted: true,
  };
}

function createAttempts(setId: string, sessionId: string): Attempt[] {
  return [
    {
      id: `${sessionId}:attempt:01`,
      itemKey: readingItemKey(setId),
      exerciseId: "question-1",
      sessionId,
      createdAt: "2026-07-27T00:02:00.000Z",
      studyDate: "2026-07-27",
      mode: "readingQuestion",
      response: {
        choiceIndex: 0,
        evidenceSentenceId: "sentence-1",
        evidenceCorrect: true,
      },
      correct: true,
      score: 1,
      responseTimeMs: 4_000,
      hintCount: 0,
    },
  ];
}

function createPlan(setId: string): DailyPlan {
  return {
    date: "2026-07-27",
    generatedAt: "2026-07-27T00:00:00.000Z",
    targetMinutes: 15,
    mode: "standard",
    blocks: [
      {
        blockId: `practice:${setId}`,
        itemId: readingItemKey(setId),
        category: "skillPractice",
        estimatedSeconds: 360,
        status: "pending",
        skill: "reading",
      },
    ],
    completedBlockIds: [],
    sourceSnapshot: {
      dueCount: 0,
      overdueCount: 0,
      newLimit: 3,
    },
    capacity: {
      requestedMinutes: 15,
      effectiveMinutes: 15,
      budgetSeconds: 900,
      estimatedReviewItemCapacity: 60,
    },
    plannedSeconds: 360,
    remainingBudgetSeconds: 540,
  };
}

afterEach(async () => {
  while (databases.length > 0) {
    const db = databases.pop()!;
    db.close();
    await db.delete();
  }
});

describe("読解Dexie adapter", () => {
  it("読解PracticeSetだけを厳密検証してstage順で返す", async () => {
    const db = createDatabase();
    await db.practiceSets.bulkPut([...pilotReadingPracticeSets].reverse());
    const content = createDexieReadingContentPort(db);

    const sets = await content.listReadingSets();

    expect(sets).toHaveLength(6);
    expect(sets[0]?.stage).toBeLessThanOrEqual(sets[1]?.stage ?? 6);
    await expect(
      content.getReadingSet(pilotReadingPracticeSets[0]!.id),
    ).resolves.toEqual(parseReadingPracticeSet(pilotReadingPracticeSets[0]));
  });

  it("Attempt・StudySession・DailyPlanを1transactionで完了する", async () => {
    const db = createDatabase();
    const setId = pilotReadingPracticeSets[0]!.id;
    const session = createSession(setId);
    const attempts = createAttempts(setId, session.id);
    const plan = createPlan(setId);
    await db.dailyPlans.put(plan);

    const result = await createDexieReadingLearningStore(db).completePractice({
      setId,
      session,
      attempts,
      completedAt: "2026-07-27T00:03:00.000Z",
      planContext: {
        planDate: plan.date,
        blockId: plan.blocks[0]!.blockId,
        itemKey: readingItemKey(setId),
      },
    });

    expect(await db.attempts.toArray()).toEqual(attempts);
    expect(await db.sessions.get(session.id)).toMatchObject({
      endedAt: "2026-07-27T00:03:00.000Z",
      interrupted: false,
      completedItemKeys: [readingItemKey(setId)],
    });
    expect((await db.dailyPlans.get(plan.date))?.blocks[0]?.status).toBe("completed");
    expect(result.dailyPlan?.completedBlockIds).toEqual([plan.blocks[0]!.blockId]);
  });

  it("plan blockが不正ならAttemptとSessionを残さずロールバックする", async () => {
    const db = createDatabase();
    const setId = pilotReadingPracticeSets[0]!.id;
    const session = createSession(setId);
    const attempts = createAttempts(setId, session.id);
    const plan = createPlan(setId);
    await db.dailyPlans.put(plan);

    await expect(
      createDexieReadingLearningStore(db).completePractice({
        setId,
        session,
        attempts,
        completedAt: "2026-07-27T00:03:00.000Z",
        planContext: {
          planDate: plan.date,
          blockId: "missing-block",
          itemKey: readingItemKey(setId),
        },
      }),
    ).rejects.toThrow(/blockが見つかりません/);

    expect(await db.attempts.count()).toBe(0);
    expect(await db.sessions.count()).toBe(0);
    await expect(db.dailyPlans.get(plan.date)).resolves.toEqual(plan);
  });

  it("DBを閉じて開き直しても読解履歴を読み出せる", async () => {
    const databaseName = `reading-reload-${databaseSequence}`;
    const first = createDatabase(databaseName);
    const setId = pilotReadingPracticeSets[0]!.id;
    const session = createSession(setId);
    const attempts = createAttempts(setId, session.id);
    await createDexieReadingLearningStore(first).completePractice({
      setId,
      session,
      attempts,
      completedAt: "2026-07-27T00:03:00.000Z",
    });
    first.close();
    databases.splice(databases.indexOf(first), 1);

    const reopened = createDatabase(databaseName);
    const history = await createDexieReadingLearningStore(reopened).loadHistory(setId);

    expect(history.attempts).toEqual(attempts);
    expect(history.sessions[0]).toMatchObject({
      id: session.id,
      interrupted: false,
      endedAt: "2026-07-27T00:03:00.000Z",
    });
  });

  it("重要語句を既存のメモと停止状態を保ってお気に入りにする", async () => {
    const db = createDatabase();
    const vocabulary = pilotVocabulary.find(
      (item) => item.id === "vocab-s3-community",
    )!;
    const itemKey = `vocab:${vocabulary.id}`;
    await db.vocabulary.put(vocabulary);
    await db.vocabularyUserStates.put({
      itemKey,
      favorite: false,
      note: "地域活動で見た",
      suspended: true,
      updatedAt: "2026-07-26T00:00:00.000Z",
    });

    const store = createDexieReadingLearningStore(db);
    await store.addVocabularyFavorite(vocabulary.id, "2026-07-27T00:00:00.000Z");

    await expect(store.getVocabularyUserState(itemKey)).resolves.toEqual({
      itemKey,
      favorite: true,
      note: "地域活動で見た",
      suspended: true,
      updatedAt: "2026-07-27T00:00:00.000Z",
    });
  });
});
