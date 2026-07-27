import { describe, expect, it, vi } from "vitest";
import { createMasteryProfile } from "../../domain/mastery";
import type { AppSettings, UserProfile } from "../../domain/models";
import { completeDailyPlanBlock, type DailyPlan } from "../../domain/planning";
import { createNewReviewState, type ReviewState } from "../../domain/review";
import type {
  Lesson,
  PracticeSet,
  VocabularyItem,
} from "../../infrastructure/content/schemas";
import { buildTodayPlanPreviews, buildTodaySource, generateTodayPlan } from "./model";
import { loadToday } from "./service";
import type { TodayDataPort, TodayDataSnapshot } from "./types";

const NOW = new Date("2026-07-27T03:00:00.000Z");
const STUDY_DAY_START_MS = new Date("2026-07-26T19:00:00.000Z").getTime();

function profile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: "local-user",
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
    goals: ["grade2"],
    dailyMinutes: 15,
    recommendedStage: 1,
    selectedStage: 1,
    onboardingCompleted: true,
    ...overrides,
  };
}

function settings(overrides: Partial<AppSettings> = {}): AppSettings {
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
    ...overrides,
  };
}

function vocabulary(index: number): VocabularyItem {
  return {
    id: `word-${index}`,
    schemaVersion: "1.0.0",
    contentRevision: 1,
    stage: 1,
    headword: `word${index}`,
    lemma: `word${index}`,
    partOfSpeech: "noun",
    meanings: [{ id: "main", ja: `意味${index}` }],
    exampleSentences: [
      {
        id: "example",
        en: `This is word ${index}.`,
        ja: `単語${index}の例です。`,
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
    id: "lesson-current",
    schemaVersion: "1.0.0",
    contentRevision: 1,
    stage: 1,
    unitId: "unit-1",
    order: 1,
    titleJa: "現在形の基礎",
    objectivesJa: ["現在形を使う"],
    prerequisites: [],
    sections: [
      {
        id: "section-1",
        type: "explanation",
        titleJa: "説明",
        bodyJa: "現在形を確認します。",
        estimatedMinutes: 2,
      },
    ],
    estimatedMinutes: 2,
    reviewItemKeys: [],
    source: { type: "original", author: "テスト" },
  };
}

function practiceSet(): PracticeSet {
  return {
    id: "practice-reading",
    schemaVersion: "1.0.0",
    contentRevision: 1,
    type: "reading",
    stage: 1,
    titleJa: "短い読解",
    descriptionJa: "短文を読みます。",
    estimatedMinutes: 3,
    payload: {},
    tags: ["test"],
    source: { type: "original", author: "テスト" },
  };
}

function review(
  itemKey: string,
  dueAt: string,
  overrides: Partial<ReviewState> = {},
): ReviewState {
  return {
    ...createNewReviewState(itemKey, NOW),
    status: "review",
    dueAt,
    intervalDays: 2,
    reviewCount: 2,
    ...overrides,
  };
}

function snapshot(overrides: Partial<TodayDataSnapshot> = {}): TodayDataSnapshot {
  return {
    profile: profile(),
    settings: settings(),
    reviewStates: [],
    masteryProfiles: [],
    attempts: [],
    vocabularyUserStates: [],
    vocabulary: [],
    exercises: [],
    lessons: [],
    lessonProgress: [],
    practiceSets: [],
    dailyPlans: [],
    ...overrides,
  };
}

function sourceFor(value: TodayDataSnapshot) {
  return buildTodaySource({
    snapshot: value,
    now: NOW,
    studyDate: "2026-07-27",
    studyDayStartMs: STUDY_DAY_START_MS,
  });
}

describe("今日の候補生成", () => {
  it("期限→苦手→現在レッスン→新規の順にし、重複・停止中・架空技能を除く", () => {
    const items = [0, 1, 2, 3].map(vocabulary);
    const dueKey = "vocab:word-0";
    const suspendedKey = "vocab:word-1";
    const weakKey = "vocab:word-2";
    const value = snapshot({
      vocabulary: items,
      lessons: [lesson()],
      lessonProgress: [
        {
          lessonId: "lesson-current",
          status: "inProgress",
          currentSectionIndex: 0,
          updatedAt: NOW.toISOString(),
        },
      ],
      reviewStates: [
        review(dueKey, "2026-07-25T00:00:00.000Z", { lapseCount: 4 }),
        review(suspendedKey, "2026-07-25T00:00:00.000Z"),
        review(weakKey, "2026-08-01T00:00:00.000Z", { lapseCount: 3 }),
      ],
      masteryProfiles: [
        createMasteryProfile(dueKey, NOW),
        createMasteryProfile(weakKey, NOW),
      ],
      vocabularyUserStates: [
        {
          itemKey: suspendedKey,
          favorite: false,
          note: "",
          suspended: true,
          updatedAt: NOW.toISOString(),
        },
      ],
    });

    const plan = generateTodayPlan({
      source: sourceFor(value),
      now: NOW,
      targetMinutes: 15,
      mode: "all",
    });

    expect(plan.blocks.map((block) => block.category)).toEqual([
      "overdueReview",
      "weakItem",
      "currentLesson",
      "newVocabulary",
    ]);
    expect(plan.blocks.map((block) => block.itemId)).toEqual([
      dueKey,
      weakKey,
      "lesson:lesson-current",
      "vocab:word-3",
    ]);
    expect(plan.blocks.some((block) => block.itemId === suspendedKey)).toBe(false);
    expect(plan.blocks.some((block) => block.category === "skillPractice")).toBe(false);
    expect(new Set(plan.blocks.map((block) => block.itemId)).size).toBe(
      plan.blocks.length,
    );
  });

  it("教材にPracticeSetがある場合だけ技能候補を作る", () => {
    const source = sourceFor(
      snapshot({
        practiceSets: [practiceSet()],
      }),
    );
    expect(source.candidates).toContainEqual(
      expect.objectContaining({
        id: "practice:practice-reading",
        kind: "skillPractice",
        skill: "reading",
      }),
    );
  });

  it("Lesson完了後に期限を迎えた復習はレッスン全体の所要時間で見積もる", () => {
    const value = snapshot({
      lessons: [lesson()],
      lessonProgress: [
        {
          lessonId: "lesson-current",
          status: "completed",
          currentSectionIndex: 0,
          completedAt: "2026-07-26T03:00:00.000Z",
          updatedAt: "2026-07-26T03:00:00.000Z",
        },
      ],
      reviewStates: [review("lesson:lesson-current", "2026-07-25T00:00:00.000Z")],
    });
    const plan = generateTodayPlan({
      source: sourceFor(value),
      now: NOW,
      targetMinutes: 15,
      mode: "all",
    });

    expect(plan.blocks).toEqual([
      expect.objectContaining({
        itemId: "lesson:lesson-current",
        category: "overdueReview",
        estimatedSeconds: 120,
      }),
    ]);
  });

  it("レッスン候補はexerciseごとのestimatedSecondsで残り時間を見積もる", () => {
    const baseLesson = lesson();
    const exerciseId = "exercise-estimate";
    const value = snapshot({
      lessons: [
        {
          ...baseLesson,
          sections: [
            {
              ...baseLesson.sections[0]!,
              type: "exercise",
              exerciseIds: [exerciseId],
              estimatedMinutes: 10,
            },
          ],
          estimatedMinutes: 10,
        },
      ],
      exercises: [
        {
          id: exerciseId,
          schemaVersion: "1.0.0",
          contentRevision: 1,
          type: "multipleChoice",
          stage: 1,
          lessonId: baseLesson.id,
          prompt: "正しい文を選んでください。",
          payload: { choices: ["I study.", "I studies."] },
          answer: 0,
          explanation: "Iの後はstudyです。",
          hints: [],
          targetSkills: ["grammar"],
          targetMasteryDimensions: ["recognition"],
          reviewItemKeys: ["lesson:lesson-current"],
          estimatedSeconds: 75,
          tags: ["test"],
          source: { type: "original", author: "テスト" },
        },
      ],
    });

    const plan = generateTodayPlan({
      source: sourceFor(value),
      now: NOW,
      targetMinutes: 15,
      mode: "all",
    });

    expect(plan.blocks).toContainEqual(
      expect.objectContaining({
        itemId: "lesson:lesson-current",
        category: "currentLesson",
        estimatedSeconds: 75,
      }),
    );
  });

  it("期限超過84件では軽め15・標準30・しっかり50・すべて84、新規0にする", () => {
    const items = Array.from({ length: 85 }, (_, index) => vocabulary(index));
    const value = snapshot({
      vocabulary: items,
      reviewStates: items
        .slice(0, 84)
        .map((item) => review(`vocab:${item.id}`, "2026-07-20T00:00:00.000Z")),
    });
    const source = sourceFor(value);
    const previews = buildTodayPlanPreviews({
      source,
      now: NOW,
      targetMinutes: 15,
    });

    expect(
      previews.map((preview) => [preview.mode, preview.reviewCount, preview.newCount]),
    ).toEqual([
      ["light", 15, 0],
      ["standard", 30, 0],
      ["thorough", 50, 0],
      ["all", 84, 0],
    ]);
  });

  it("時間変更後も完了済みblockを保持して未完了だけ再計算する", () => {
    const items = [0, 1, 2, 3].map(vocabulary);
    const value = snapshot({
      vocabulary: items,
      reviewStates: items.map((item) =>
        review(`vocab:${item.id}`, "2026-07-25T00:00:00.000Z"),
      ),
    });
    const source = sourceFor(value);
    const initial = generateTodayPlan({
      source,
      now: NOW,
      targetMinutes: 15,
      mode: "all",
    });
    const firstBlock = initial.blocks[0];
    expect(firstBlock).toBeDefined();
    const completed = completeDailyPlanBlock(initial, firstBlock!.blockId);
    const recalculated = generateTodayPlan({
      source,
      now: NOW,
      targetMinutes: 1,
      mode: "standard",
      previousPlan: completed,
    });

    expect(recalculated.blocks[0]).toMatchObject({
      blockId: firstBlock!.blockId,
      status: "completed",
    });
    expect(recalculated.completedBlockIds).toContain(firstBlock!.blockId);
    expect(
      recalculated.blocks.filter((block) => block.status === "pending"),
    ).toHaveLength(2);
  });
});

describe("今日のプランservice", () => {
  it("4時より前は前の学習日で新規planを保存し、再読込では同じplanを使う", async () => {
    const previousDayPlan = buildTodayPlanPreviews({
      source: buildTodaySource({
        snapshot: snapshot({
          vocabulary: [vocabulary(99)],
        }),
        now: new Date("2026-07-26T03:00:00.000Z"),
        studyDate: "2026-07-26",
        studyDayStartMs: new Date("2026-07-25T19:00:00.000Z").getTime(),
      }),
      now: new Date("2026-07-26T03:00:00.000Z"),
      targetMinutes: 5,
    }).find((preview) => preview.mode === "standard")!.plan;
    const base = snapshot({
      profile: profile({ dailyMinutes: 5 }),
      dailyPlans: [previousDayPlan],
    });
    let storedPlan: DailyPlan | undefined;
    const savePlan = vi.fn<TodayDataPort["savePlan"]>((plan: DailyPlan) => {
      storedPlan = plan;
      return Promise.resolve(plan);
    });
    const port: TodayDataPort = {
      loadSnapshot: vi.fn(() =>
        Promise.resolve({
          ...base,
          dailyPlans:
            storedPlan === undefined
              ? [previousDayPlan]
              : [previousDayPlan, storedPlan],
        }),
      ),
      savePlan,
    };
    const clock = {
      now: () => new Date("2026-07-27T18:30:00.000Z"),
      timeZone: () => "Asia/Tokyo",
    };

    const first = await loadToday(port, clock);
    const second = await loadToday(port, clock);

    expect(first.source.studyDate).toBe("2026-07-27");
    expect(first.plan?.date).toBe("2026-07-27");
    expect(previousDayPlan.blocks).toHaveLength(1);
    expect(first.plan?.blocks).toHaveLength(0);
    expect(first.plan?.completedBlockIds).toEqual([]);
    expect(second.plan).toEqual(first.plan);
    expect(savePlan).toHaveBeenCalledTimes(1);
  });
});
