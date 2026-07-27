import { describe, expect, it } from "vitest";

import {
  calculateDailyPlanCapacity,
  calculateNewItemLimit,
  normalizeDailyMinutes,
} from "./capacity";
import {
  buildDailyPlan,
  completeDailyPlanBlock,
  mergeDailyPlanCompletions,
} from "./dailyPlan";
import type {
  BuildDailyPlanInput,
  CompletedDailyPlanBlock,
  DailyPlanCandidate,
  ReviewCandidate,
} from "./types";

const STUDY_DAY_START_MS = Date.UTC(2026, 6, 27, 0, 0, 0);
const NOW_MS = Date.UTC(2026, 6, 27, 12, 0, 0);

function review(id: string, dueAtMs: number, estimatedSeconds = 10): ReviewCandidate {
  return { id, kind: "review", dueAtMs, estimatedSeconds };
}

function createInput(
  overrides: Partial<BuildDailyPlanInput> = {},
): BuildDailyPlanInput {
  return {
    studyDate: "2026-07-27",
    nowMs: NOW_MS,
    studyDayStartMs: STUDY_DAY_START_MS,
    targetMinutes: 15,
    mode: "standard",
    configuredNewItemLimit: 10,
    currentStage: 2,
    candidates: [],
    ...overrides,
  };
}

describe("日次プラン容量", () => {
  it.each([
    [5, 5],
    [15, 15],
    [30, 30],
    [45, 45],
    [22, 22],
  ])("%i分とカスタム時間を標準コースへ反映する", (minutes, expected) => {
    expect(calculateDailyPlanCapacity(minutes, "standard").effectiveMinutes).toBe(
      expected,
    );
  });

  it("軽めは最大5分、しっかりは設定時間の1.5倍にする", () => {
    expect(calculateDailyPlanCapacity(30, "light").budgetSeconds).toBe(5 * 60);
    expect(calculateDailyPlanCapacity(30, "thorough").budgetSeconds).toBe(45 * 60);
  });

  it("すべてコースは時間上限を設けない", () => {
    expect(calculateDailyPlanCapacity(15, "all")).toMatchObject({
      effectiveMinutes: null,
      budgetSeconds: null,
      estimatedReviewItemCapacity: Number.POSITIVE_INFINITY,
    });
  });

  it("カスタム時間を1〜180分へ丸める", () => {
    expect(normalizeDailyMinutes(0)).toBe(1);
    expect(normalizeDailyMinutes(12.6)).toBe(13);
    expect(normalizeDailyMinutes(999)).toBe(180);
  });
});

describe("新規導入上限", () => {
  it("期限超過が40件を超えると新規を0件にする", () => {
    expect(calculateNewItemLimit(41, 41, 100, 12)).toBe(0);
  });

  it("復習期限が容量の70%を超えると新規を最大3件にする", () => {
    expect(calculateNewItemLimit(0, 15, 20, 12)).toBe(3);
    expect(calculateNewItemLimit(0, 14, 20, 12)).toBe(12);
  });

  it("すべてコースでも設定した新規上限を維持する", () => {
    expect(calculateNewItemLimit(0, 100, Number.POSITIVE_INFINITY, 8)).toBe(8);
  });
});

describe("日次プラン編成", () => {
  it("期限超過、当日、苦手、現行レッスン、新規、技能の順で編成する", () => {
    const candidates: DailyPlanCandidate[] = [
      {
        id: "skill",
        kind: "skillPractice",
        skill: "reading",
        estimatedSeconds: 10,
      },
      { id: "new", kind: "newVocabulary", estimatedSeconds: 10 },
      { id: "lesson", kind: "currentLesson", estimatedSeconds: 10 },
      { id: "weak", kind: "weak", estimatedSeconds: 10 },
      review("due", NOW_MS - 1_000),
      review("overdue", STUDY_DAY_START_MS - 1_000),
    ];

    const plan = buildDailyPlan(createInput({ mode: "all", candidates }));

    expect(plan.blocks.map((block) => block.category)).toEqual([
      "overdueReview",
      "dueReview",
      "weakItem",
      "currentLesson",
      "newVocabulary",
      "skillPractice",
    ]);
  });

  it("現在時刻より未来の復習は含めず、時刻境界の復習は当日扱いにする", () => {
    const plan = buildDailyPlan(
      createInput({
        mode: "all",
        candidates: [
          review("future", NOW_MS + 1),
          review("now", NOW_MS),
          review("old", STUDY_DAY_START_MS - 1),
        ],
      }),
    );

    expect(plan.blocks.map((block) => [block.itemId, block.category])).toEqual([
      ["old", "overdueReview"],
      ["now", "dueReview"],
    ]);
  });

  it("同じ復習区分では優先度スコアを先に、同点なら古い期限を先にする", () => {
    const lowPriorityOld = {
      ...review("low-old", STUDY_DAY_START_MS - 3_000),
      priorityScore: 0.2,
    };
    const highPriorityNew = {
      ...review("high-new", STUDY_DAY_START_MS - 1_000),
      priorityScore: 0.9,
    };
    const highPriorityOld = {
      ...review("high-old", STUDY_DAY_START_MS - 2_000),
      priorityScore: 0.9,
    };
    const plan = buildDailyPlan(
      createInput({
        mode: "all",
        candidates: [lowPriorityOld, highPriorityNew, highPriorityOld],
      }),
    );

    expect(plan.blocks.map((block) => block.itemId)).toEqual([
      "high-old",
      "high-new",
      "low-old",
    ]);
  });

  it("候補が0件でも有効な空プランを返す", () => {
    const plan = buildDailyPlan(createInput());

    expect(plan.blocks).toEqual([]);
    expect(plan.sourceSnapshot).toEqual({
      dueCount: 0,
      overdueCount: 0,
      newLimit: 10,
    });
    expect(plan.generatedAt).toBe("2026-07-27T12:00:00.000Z");
  });

  it("大量滞留時の軽めコースは優先度上位15件だけを選び、新規を止める", () => {
    const overdue = Array.from({ length: 84 }, (_, index) =>
      review(
        `review-${String(index).padStart(2, "0")}`,
        STUDY_DAY_START_MS - (84 - index) * 1_000,
      ),
    );
    const plan = buildDailyPlan(
      createInput({
        mode: "light",
        candidates: [
          ...overdue,
          { id: "new", kind: "newVocabulary", estimatedSeconds: 10 },
        ],
      }),
    );

    expect(plan.blocks).toHaveLength(15);
    expect(plan.blocks.every((block) => block.category === "overdueReview")).toBe(true);
    expect(plan.sourceSnapshot).toMatchObject({
      dueCount: 84,
      overdueCount: 84,
      newLimit: 0,
    });
  });

  it("再計算時に完了済みblockを保ち、残り時間だけで未完了分を選ぶ", () => {
    const candidates: DailyPlanCandidate[] = [
      review("done", NOW_MS - 4_000, 120),
      review("pending-a", NOW_MS - 3_000, 100),
      review("pending-b", NOW_MS - 2_000, 100),
      review("pending-c", NOW_MS - 1_000, 100),
    ];
    const completedPlan = completeDailyPlanBlock(
      buildDailyPlan(createInput({ mode: "all", candidates })),
      "done",
    );
    const completedBlocks = completedPlan.blocks.filter(
      (block): block is CompletedDailyPlanBlock => block.status === "completed",
    );

    const fiveMinutePlan = buildDailyPlan(
      createInput({
        targetMinutes: 5,
        candidates,
        completedBlocks,
      }),
    );
    const oneMinutePlan = buildDailyPlan(
      createInput({
        targetMinutes: 1,
        candidates,
        completedBlocks,
      }),
    );

    expect(fiveMinutePlan.blocks[0]).toEqual(completedBlocks[0]);
    expect(fiveMinutePlan.blocks.map((block) => block.itemId)).toEqual([
      "done",
      "pending-a",
    ]);
    expect(fiveMinutePlan.completedBlockIds).toEqual(["done"]);
    expect(oneMinutePlan.blocks).toEqual(completedBlocks);
    expect(oneMinutePlan.remainingBudgetSeconds).toBe(0);
  });

  it("block完了をstatusとID一覧へ冪等に反映する", () => {
    const plan = buildDailyPlan(
      createInput({
        mode: "all",
        candidates: [review("done", NOW_MS - 1_000)],
      }),
    );

    const completedOnce = completeDailyPlanBlock(plan, "done");
    const completedTwice = completeDailyPlanBlock(completedOnce, "done");

    expect(completedOnce.blocks[0]?.status).toBe("completed");
    expect(completedOnce.completedBlockIds).toEqual(["done"]);
    expect(completedTwice).toBe(completedOnce);
    expect(() => completeDailyPlanBlock(plan, "missing")).toThrow(
      "日次プランblockが見つかりません",
    );
  });

  it("古い再計算planへ別処理で確定した完了状態を単調増加で統合する", () => {
    const candidates = [
      review("first", NOW_MS - 2_000, 60),
      review("second", NOW_MS - 1_000, 60),
    ];
    const base = buildDailyPlan(createInput({ mode: "all", candidates }));
    const latest = completeDailyPlanBlock(base, "first");
    const staleRecalculation = buildDailyPlan(
      createInput({
        targetMinutes: 5,
        candidates,
        completedBlocks: [],
      }),
    );
    const locallyCompleted = completeDailyPlanBlock(staleRecalculation, "second");

    const merged = mergeDailyPlanCompletions(latest, locallyCompleted);

    expect(merged.completedBlockIds).toEqual(["first", "second"]);
    expect(merged.blocks.map((block) => [block.blockId, block.status])).toEqual([
      ["first", "completed"],
      ["second", "completed"],
    ]);
    expect(merged.plannedSeconds).toBe(120);
    expect(merged.remainingBudgetSeconds).toBe(180);
    expect(() =>
      mergeDailyPlanCompletions({ ...latest, date: "2026-07-26" }, locallyCompleted),
    ).toThrow("異なる学習日");
  });

  it("再計算時の復習・新規上限へ完了済みblockを含める", () => {
    const overdue = Array.from({ length: 84 }, (_, index) =>
      review(
        `review-${String(index).padStart(2, "0")}`,
        STUDY_DAY_START_MS - (84 - index) * 1_000,
      ),
    );
    const completedReviewPlan = completeDailyPlanBlock(
      buildDailyPlan(createInput({ mode: "all", candidates: overdue })),
      "review-00",
    );
    const completedReviewBlocks = completedReviewPlan.blocks.filter(
      (block): block is CompletedDailyPlanBlock => block.status === "completed",
    );
    const recalculatedLight = buildDailyPlan(
      createInput({
        mode: "light",
        candidates: overdue,
        completedBlocks: completedReviewBlocks,
      }),
    );

    expect(recalculatedLight.blocks).toHaveLength(15);
    expect(
      recalculatedLight.blocks.filter((block) => block.status === "pending"),
    ).toHaveLength(14);

    const completedNew: CompletedDailyPlanBlock = {
      blockId: "new-0",
      itemId: "new-0",
      category: "newVocabulary",
      estimatedSeconds: 10,
      status: "completed",
    };
    const newCandidates: DailyPlanCandidate[] = Array.from(
      { length: 4 },
      (_, index) => ({
        id: `new-${index}`,
        kind: "newVocabulary",
        estimatedSeconds: 10,
      }),
    );
    const recalculatedNew = buildDailyPlan(
      createInput({
        mode: "all",
        configuredNewItemLimit: 3,
        candidates: newCandidates,
        completedBlocks: [completedNew],
      }),
    );

    expect(
      recalculatedNew.blocks.filter((block) => block.category === "newVocabulary"),
    ).toHaveLength(3);
    expect(
      recalculatedNew.blocks.filter((block) => block.status === "pending"),
    ).toHaveLength(2);
  });

  it("復習負荷が容量の70%を超える日は新規を3件までにする", () => {
    const due = Array.from({ length: 15 }, (_, index) =>
      review(`review-${index}`, NOW_MS - index, 10),
    );
    const newItems: DailyPlanCandidate[] = Array.from({ length: 8 }, (_, index) => ({
      id: `new-${index}`,
      kind: "newVocabulary",
      estimatedSeconds: 10,
    }));
    const plan = buildDailyPlan(
      createInput({
        targetMinutes: 5,
        candidates: [...due, ...newItems],
      }),
    );

    expect(plan.sourceSnapshot.newLimit).toBe(3);
    expect(
      plan.blocks.filter((block) => block.category === "newVocabulary"),
    ).toHaveLength(3);
  });

  it("弱点技能を先にし、現在ステージから技能をローテーションする", () => {
    const candidates: DailyPlanCandidate[] = [
      {
        id: "vocabulary",
        kind: "skillPractice",
        skill: "vocabulary",
        estimatedSeconds: 10,
      },
      {
        id: "reading",
        kind: "skillPractice",
        skill: "reading",
        estimatedSeconds: 10,
      },
      {
        id: "listening",
        kind: "skillPractice",
        skill: "listening",
        estimatedSeconds: 10,
      },
      {
        id: "future-stage",
        kind: "skillPractice",
        skill: "writing",
        minimumStage: 3,
        estimatedSeconds: 10,
      },
    ];
    const plan = buildDailyPlan(
      createInput({
        mode: "all",
        currentStage: 2,
        weakSkills: ["listening"],
        candidates,
      }),
    );

    expect(plan.blocks.map((block) => block.itemId)).toEqual([
      "listening",
      "reading",
      "vocabulary",
    ]);
  });

  it("同じ入力から同じ結果を返す", () => {
    const input = createInput({
      candidates: [
        review("b", NOW_MS - 1_000),
        review("a", NOW_MS - 1_000),
        { id: "new", kind: "newVocabulary", estimatedSeconds: 20 },
      ],
    });

    expect(buildDailyPlan(input)).toEqual(buildDailyPlan(input));
  });
});
