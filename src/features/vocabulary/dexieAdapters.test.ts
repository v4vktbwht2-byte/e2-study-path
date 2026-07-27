import { IDBKeyRange, indexedDB } from "fake-indexeddb";
import { createMasteryProfile } from "../../domain/mastery";
import type { CommitAnswerInput, StudySession } from "../../domain/models";
import { createNewReviewState } from "../../domain/review";
import type { VocabularyItem } from "../../infrastructure/content/schemas";
import { AppDb } from "../../infrastructure/db/appDb";
import {
  createDexieVocabularyContentPort,
  createDexieVocabularyStudyStore,
} from "./dexieAdapters";
import { vocabularyItemKey } from "./model";

const NOW = new Date("2026-07-27T00:00:00.000Z");
let sequence = 0;
let db: AppDb;

function createDatabase(name?: string): AppDb {
  sequence += 1;
  return new AppDb(name ?? `vocabulary-adapter-${sequence}`, {
    indexedDB,
    IDBKeyRange,
  });
}

function vocabulary(): VocabularyItem {
  return {
    id: "word-hello",
    schemaVersion: "1.0.0",
    contentRevision: 1,
    stage: 1,
    headword: "hello",
    lemma: "hello",
    partOfSpeech: "phrase",
    meanings: [{ id: "main", ja: "こんにちは" }],
    exampleSentences: [
      {
        id: "example",
        en: "I say hello every morning.",
        ja: "私は毎朝こんにちはと言います。",
        stage: 1,
      },
    ],
    collocations: [],
    synonyms: [],
    antonyms: [],
    confusionGroupIds: [],
    tags: ["test"],
    source: { type: "original", author: "テスト" },
  };
}

function session(): StudySession {
  return {
    id: "vocabulary-session-1",
    type: "vocabulary",
    startedAt: NOW.toISOString(),
    studyDate: "2026-07-27",
    itemKeys: ["vocab:word-hello"],
    completedItemKeys: [],
    interrupted: false,
  };
}

function commitInput(sessionId = "vocabulary-session-1"): CommitAnswerInput {
  const itemKey = vocabularyItemKey(vocabulary());
  return {
    attempt: {
      id: "attempt-1",
      itemKey,
      exerciseId: "vocabulary-question:word-hello:level-1",
      sessionId,
      createdAt: NOW.toISOString(),
      studyDate: "2026-07-27",
      mode: "recognitionChoice",
      response: 0,
      correct: true,
      score: 1,
      responseTimeMs: 2000,
      hintCount: 0,
      confidence: "medium",
      suggestedRating: "good",
      finalRating: "good",
    },
    reviewState: {
      ...createNewReviewState(itemKey, NOW),
      status: "learning",
      reviewCount: 1,
      lastRating: "good",
    },
    mastery: {
      ...createMasteryProfile(itemKey, NOW),
      recognition: 8,
    },
    sessionId,
  };
}

beforeEach(() => {
  db = createDatabase();
});

afterEach(async () => {
  db.close();
  await db.delete();
});

describe("単語Dexieアダプター", () => {
  it("教材の一覧と詳細を読み込む", async () => {
    await db.vocabulary.put(vocabulary());
    const content = createDexieVocabularyContentPort(db);

    await expect(content.listVocabulary()).resolves.toEqual([vocabulary()]);
    await expect(content.getVocabulary("word-hello")).resolves.toEqual(vocabulary());
  });

  it("Attempt・ReviewState・Mastery・Sessionを原子的に保存する", async () => {
    const store = createDexieVocabularyStudyStore(db);
    await store.startSession(session());

    const baseInput = commitInput();
    const result = await store.commitAnswer({
      ...baseInput,
      attempt: {
        ...baseInput.attempt,
        confusedWithItemKey: "vocab:word-book",
      },
    });
    expect(result.attempt.id).toBe("attempt-1");
    expect(result.attempt.confusedWithItemKey).toBe("vocab:word-book");
    expect(result.reviewState.status).toBe("learning");
    expect(result.mastery.recognition).toBe(8);
    expect(result.mastery.spelling).toBe(0);
    expect(result.session.completedItemKeys).toEqual(["vocab:word-hello"]);

    expect(await db.attempts.count()).toBe(1);
    expect((await db.attempts.get("attempt-1"))?.confusedWithItemKey).toBe(
      "vocab:word-book",
    );
    expect(await db.reviewStates.count()).toBe(1);
    expect(await db.mastery.count()).toBe(1);
    expect((await db.sessions.get(session().id))?.completedItemKeys).toEqual([
      "vocab:word-hello",
    ]);
  });

  it("途中で失敗した回答は部分保存しない", async () => {
    const store = createDexieVocabularyStudyStore(db);

    await expect(
      store.commitAnswer(commitInput("missing-session")),
    ).rejects.toMatchObject({ code: "SESSION_NOT_FOUND" });
    expect(await db.attempts.count()).toBe(0);
    expect(await db.reviewStates.count()).toBe(0);
    expect(await db.mastery.count()).toBe(0);
  });

  it("DBを開き直しても回答・復習・5軸・セッションを保持する", async () => {
    const databaseName = `vocabulary-reload-${sequence}`;
    db.close();
    await db.delete();
    const first = createDatabase(databaseName);
    const firstStore = createDexieVocabularyStudyStore(first);
    await firstStore.startSession(session());
    await firstStore.commitAnswer(commitInput());
    await firstStore.finishSession(session().id, "2026-07-27T00:05:00.000Z");
    first.close();

    const reopened = createDatabase(databaseName);
    const snapshot = await createDexieVocabularyStudyStore(reopened).loadSnapshot();
    expect(snapshot.attempts).toHaveLength(1);
    expect(snapshot.reviewStates[0]).toEqual(
      expect.objectContaining({ itemKey: "vocab:word-hello" }),
    );
    expect(snapshot.masteryProfiles[0]).toEqual(
      expect.objectContaining({ recognition: 8, spelling: 0 }),
    );
    await expect(reopened.sessions.get(session().id)).resolves.toEqual(
      expect.objectContaining({ endedAt: "2026-07-27T00:05:00.000Z" }),
    );
    reopened.close();
    await reopened.delete();
    db = createDatabase();
  });
});
