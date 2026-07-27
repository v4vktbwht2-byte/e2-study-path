import { IDBKeyRange, indexedDB } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createMasteryProfile } from "../../domain/mastery";
import type {
  AppSettings,
  Attempt,
  LessonProgress,
  UserProfile,
  VocabularyUserState,
} from "../../domain/models";
import { buildDailyPlan, completeDailyPlanBlock } from "../../domain/planning";
import { createNewReviewState } from "../../domain/review";
import type {
  Exercise,
  Lesson,
  PracticeSet,
  VocabularyItem,
} from "../../infrastructure/content/schemas";
import { AppDb } from "../../infrastructure/db/appDb";
import { createDexieTodayPort } from "./dexieTodayPort";

const NOW = new Date("2026-07-27T03:00:00.000Z");
let sequence = 0;
let db: AppDb;

function profile(): UserProfile {
  return {
    id: "local-user",
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
    goals: ["grade2"],
    dailyMinutes: 15,
    recommendedStage: 1,
    selectedStage: 1,
    onboardingCompleted: true,
  };
}

function settings(): AppSettings {
  return {
    id: "settings",
    theme: "system",
    fontScale: 1,
    reducedMotion: false,
    dailyNewVocabularyLimit: 5,
    reviewIntensity: "standard",
    speechRate: 1,
    autoPlayAudio: false,
    showKanaPronunciationGuide: false,
    speedAdjustmentEnabled: true,
    studyDayStartHour: 4,
  };
}

function vocabulary(): VocabularyItem {
  return {
    id: "word-0",
    schemaVersion: "1.0.0",
    contentRevision: 1,
    stage: 1,
    headword: "today",
    lemma: "today",
    partOfSpeech: "adverb",
    meanings: [{ id: "main", ja: "今日" }],
    exampleSentences: [
      {
        id: "example",
        en: "I study today.",
        ja: "私は今日勉強します。",
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

function lesson(): Lesson {
  return {
    id: "lesson-0",
    schemaVersion: "1.0.0",
    contentRevision: 1,
    stage: 1,
    unitId: "unit-0",
    order: 1,
    titleJa: "今日のレッスン",
    objectivesJa: ["短文を作る"],
    prerequisites: [],
    sections: [
      {
        id: "section-0",
        type: "explanation",
        titleJa: "説明",
        bodyJa: "短文を確認します。",
        estimatedMinutes: 1,
      },
    ],
    estimatedMinutes: 1,
    reviewItemKeys: [],
    source: { type: "original", author: "テスト" },
  };
}

function exercise(): Exercise {
  return {
    id: "exercise-0",
    schemaVersion: "1.0.0",
    contentRevision: 1,
    type: "multipleChoice",
    stage: 1,
    lessonId: "lesson-0",
    prompt: "正しい文を選んでください。",
    payload: { choices: ["I study.", "I studies."] },
    answer: 0,
    explanation: "Iの後はstudyです。",
    hints: [],
    targetSkills: ["grammar"],
    targetMasteryDimensions: ["recognition"],
    reviewItemKeys: ["lesson:lesson-0"],
    estimatedSeconds: 20,
    tags: ["test"],
    source: { type: "original", author: "テスト" },
  };
}

function practiceSet(): PracticeSet {
  return {
    id: "practice-0",
    schemaVersion: "1.0.0",
    contentRevision: 1,
    type: "listening",
    stage: 1,
    titleJa: "短いリスニング",
    descriptionJa: "一文を聞きます。",
    estimatedMinutes: 2,
    payload: {},
    tags: ["test"],
    source: { type: "original", author: "テスト" },
  };
}

beforeEach(() => {
  sequence += 1;
  db = new AppDb(`today-port-${sequence}`, {
    indexedDB,
    IDBKeyRange,
  });
});

afterEach(async () => {
  db.close();
  await db.delete();
});

describe("Today Dexie port", () => {
  it("必要な全tableをsnapshotで読み、planを保存・再読込する", async () => {
    const itemKey = "vocab:word-0";
    const reviewState = {
      ...createNewReviewState(itemKey, NOW),
      status: "review" as const,
      dueAt: "2026-07-26T00:00:00.000Z",
    };
    const attempt: Attempt = {
      id: "attempt-0",
      itemKey,
      sessionId: "session-0",
      createdAt: NOW.toISOString(),
      studyDate: "2026-07-27",
      mode: "recognitionChoice",
      response: 0,
      correct: true,
      score: 1,
      responseTimeMs: 2_000,
      hintCount: 0,
    };
    const userState: VocabularyUserState = {
      itemKey,
      favorite: true,
      note: "重点",
      suspended: false,
      updatedAt: NOW.toISOString(),
    };
    const progress: LessonProgress = {
      lessonId: "lesson-0",
      status: "inProgress",
      currentSectionIndex: 0,
      updatedAt: NOW.toISOString(),
    };
    const plan = buildDailyPlan({
      studyDate: "2026-07-27",
      nowMs: NOW.getTime(),
      studyDayStartMs: new Date("2026-07-26T19:00:00.000Z").getTime(),
      targetMinutes: 15,
      mode: "standard",
      configuredNewItemLimit: 5,
      currentStage: 1,
      candidates: [
        {
          id: itemKey,
          kind: "review",
          dueAtMs: new Date(reviewState.dueAt).getTime(),
          estimatedSeconds: 10,
        },
      ],
    });

    await Promise.all([
      db.profiles.put(profile()),
      db.settings.put(settings()),
      db.reviewStates.put(reviewState),
      db.mastery.put(createMasteryProfile(itemKey, NOW)),
      db.attempts.put(attempt),
      db.vocabularyUserStates.put(userState),
      db.vocabulary.put(vocabulary()),
      db.exercises.put(exercise()),
      db.lessons.put(lesson()),
      db.lessonProgress.put(progress),
      db.practiceSets.put(practiceSet()),
      db.dailyPlans.put(plan),
    ]);

    const port = createDexieTodayPort(db);
    const loaded = await port.loadSnapshot();
    expect(loaded.profile).toEqual(profile());
    expect(loaded.settings).toEqual(settings());
    expect(loaded.reviewStates).toEqual([reviewState]);
    expect(loaded.masteryProfiles).toHaveLength(1);
    expect(loaded.attempts).toEqual([attempt]);
    expect(loaded.vocabularyUserStates).toEqual([userState]);
    expect(loaded.vocabulary).toEqual([vocabulary()]);
    expect(loaded.exercises).toEqual([exercise()]);
    expect(loaded.lessons).toEqual([lesson()]);
    expect(loaded.lessonProgress).toEqual([progress]);
    expect(loaded.practiceSets).toEqual([practiceSet()]);
    expect(loaded.dailyPlans).toEqual([plan]);

    const completed = completeDailyPlanBlock(plan, itemKey);
    await port.savePlan(completed);
    db.close();
    db = new AppDb(`today-port-${sequence}`, {
      indexedDB,
      IDBKeyRange,
    });

    const reloaded = await createDexieTodayPort(db).loadSnapshot();
    expect(reloaded.dailyPlans).toEqual([completed]);
    expect(reloaded.dailyPlans[0]?.completedBlockIds).toEqual([itemKey]);
  });

  it("古い再計算planを保存してもDBで確定済みのblock完了を戻さない", async () => {
    const itemKey = "vocab:word-0";
    const plan = buildDailyPlan({
      studyDate: "2026-07-27",
      nowMs: NOW.getTime(),
      studyDayStartMs: new Date("2026-07-26T19:00:00.000Z").getTime(),
      targetMinutes: 15,
      mode: "standard",
      configuredNewItemLimit: 5,
      currentStage: 1,
      candidates: [
        {
          id: itemKey,
          kind: "review",
          dueAtMs: NOW.getTime(),
          estimatedSeconds: 10,
        },
      ],
    });
    await db.dailyPlans.put(completeDailyPlanBlock(plan, itemKey));
    const staleRecalculation = {
      ...plan,
      generatedAt: "2026-07-27T03:05:00.000Z",
      targetMinutes: 30,
      capacity: {
        ...plan.capacity,
        requestedMinutes: 30,
        effectiveMinutes: 30,
        budgetSeconds: 1_800,
      },
      remainingBudgetSeconds: 1_790,
    };

    const persisted = await createDexieTodayPort(db).savePlan(staleRecalculation);

    expect(persisted.targetMinutes).toBe(30);
    expect(persisted.completedBlockIds).toEqual([itemKey]);
    expect(persisted.blocks[0]?.status).toBe("completed");
    await expect(db.dailyPlans.get(plan.date)).resolves.toEqual(persisted);
  });
});
