import { describe, expect, it } from "vitest";
import {
  calculateNewItemLimit,
  calculateReviewPriority,
  rankReviewQueue,
} from "./queue";
import type { ReviewState } from "./types";

const NOW = new Date("2026-07-27T00:00:00.000Z");

function state(itemKey: string, overrides: Partial<ReviewState> = {}): ReviewState {
  return {
    itemKey,
    status: "review",
    learningStep: 0,
    intervalDays: 10,
    easeBias: 1,
    dueAt: "2026-07-22T00:00:00.000Z",
    lastReviewedAt: "2026-07-17T00:00:00.000Z",
    reviewCount: 1,
    lapseCount: 2,
    consecutiveSuccesses: 1,
    updatedAt: "2026-07-17T00:00:00.000Z",
    ...overrides,
  };
}

describe("復習キュー優先度", () => {
  it("仕様の5要素と重みで優先度を計算する", () => {
    const result = calculateReviewPriority({
      state: state("vocab:a"),
      now: NOW,
      examImportanceScore: 0.8,
      userPinned: true,
    });

    expect(result).toMatchObject({
      overdueScore: 0.5,
      lapseScore: 0.4,
      examImportanceScore: 0.8,
      userPinnedScore: 1,
    });
    expect(result.riskScore).toBeCloseTo(0.1, 12);
    expect(result.predictedRetention).toBeCloseTo(0.9, 12);
    expect(result.priority).toBeCloseTo(0.36, 12);
  });

  it("未来のdueAtは期限超過を0へ丸める", () => {
    const result = calculateReviewPriority({
      state: state("vocab:a", {
        dueAt: "2026-08-01T00:00:00.000Z",
      }),
      now: NOW,
    });
    expect(result.overdueScore).toBe(0);
  });

  it("一時停止と未到来を除外し同点なら古いdueAtを先にする", () => {
    const ranked = rankReviewQueue(
      [
        {
          state: state("vocab:newer", {
            dueAt: "2026-07-26T00:00:00.000Z",
          }),
        },
        {
          state: state("vocab:older", {
            dueAt: "2026-07-25T00:00:00.000Z",
          }),
        },
        {
          state: state("vocab:suspended", { status: "suspended" }),
        },
        {
          state: state("vocab:future", {
            dueAt: "2026-07-28T00:00:00.000Z",
          }),
        },
      ],
      NOW,
      { interleaveWindow: 0 },
    );

    // dueAt差はoverdueScoreにも反映されるためolderが先になる。
    expect(ranked.map(({ state: item }) => item.itemKey)).toEqual([
      "vocab:older",
      "vocab:newer",
    ]);
  });

  it("同形式が続くと探索窓内の別形式を軽く差し込む", () => {
    const common = {
      dueAt: "2026-07-27T00:00:00.000Z",
      lastReviewedAt: "2026-07-27T00:00:00.000Z",
      lapseCount: 0,
    } satisfies Partial<ReviewState>;
    const ranked = rankReviewQueue(
      [
        {
          state: state("vocab:a", common),
          questionFormat: "choice",
          examImportanceScore: 1,
        },
        {
          state: state("vocab:b", common),
          questionFormat: "choice",
          examImportanceScore: 0.9,
        },
        {
          state: state("vocab:c", common),
          questionFormat: "typing",
          examImportanceScore: 0.8,
        },
      ],
      NOW,
      { interleaveWindow: 3 },
    );

    expect(ranked.map(({ state: item }) => item.itemKey)).toEqual([
      "vocab:a",
      "vocab:c",
      "vocab:b",
    ]);
  });

  it("同一入力で同一のキュー順を返す", () => {
    const candidates = [{ state: state("vocab:b") }, { state: state("vocab:a") }];
    expect(rankReviewQueue(candidates, NOW)).toEqual(rankReviewQueue(candidates, NOW));
  });
});

describe("復習バックログ時の新規抑制", () => {
  it("期限超過が40件を超えたら新規を0件にする", () => {
    expect(calculateNewItemLimit(41, 20, 30, 10)).toBe(0);
  });

  it("期限件数が容量の70%を超えたら最大3件にする", () => {
    expect(calculateNewItemLimit(10, 22, 30, 10)).toBe(3);
    expect(calculateNewItemLimit(10, 22, 30, 2)).toBe(2);
  });

  it("バックログが少なければ設定件数を維持する", () => {
    expect(calculateNewItemLimit(10, 20, 30, 10)).toBe(10);
  });
});
