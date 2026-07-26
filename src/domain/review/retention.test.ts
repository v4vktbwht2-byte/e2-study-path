import { describe, expect, it } from "vitest";
import { calculatePredictedRetention, classifyRetentionBand } from "./retention";
import type { ReviewState } from "./types";

function state(overrides: Partial<ReviewState> = {}): ReviewState {
  return {
    itemKey: "vocab:retention",
    status: "review",
    learningStep: 0,
    intervalDays: 10,
    easeBias: 1,
    dueAt: "2026-07-27T00:00:00.000Z",
    lastReviewedAt: "2026-07-17T00:00:00.000Z",
    reviewCount: 1,
    lapseCount: 0,
    consecutiveSuccesses: 1,
    updatedAt: "2026-07-17T00:00:00.000Z",
    ...overrides,
  };
}

describe("予測保持率", () => {
  it("intervalと同じ日数経過時に0.9を返す", () => {
    expect(
      calculatePredictedRetention(state(), new Date("2026-07-27T00:00:00.000Z")),
    ).toBeCloseTo(0.9, 12);
  });

  it("最終復習が未来なら負の経過を0へ丸める", () => {
    expect(
      calculatePredictedRetention(
        state({ lastReviewedAt: "2026-08-01T00:00:00.000Z" }),
        new Date("2026-07-27T00:00:00.000Z"),
      ),
    ).toBe(1);
  });

  it("interval 0でも0.25日を分母として有限値を返す", () => {
    const retention = calculatePredictedRetention(
      state({
        intervalDays: 0,
        lastReviewedAt: "2026-07-26T00:00:00.000Z",
      }),
      new Date("2026-07-27T00:00:00.000Z"),
    );
    expect(retention).toBeCloseTo(Math.pow(0.9, 4), 12);
  });

  it("保持率と期限から4段階の表示区分を返す", () => {
    const now = new Date("2026-07-27T00:00:00.000Z");
    expect(
      classifyRetentionBand(
        state({
          dueAt: "2026-07-28T00:00:00.000Z",
          lastReviewedAt: "2026-07-27T00:00:00.000Z",
        }),
        now,
      ),
    ).toBe("stable");
    expect(classifyRetentionBand(state(), now)).toBe("dueToday");
    expect(
      classifyRetentionBand(
        state({
          dueAt: "2026-07-28T00:00:00.000Z",
          lastReviewedAt: "2026-07-12T00:00:00.000Z",
        }),
        now,
      ),
    ).toBe("reviewSoon");
    expect(
      classifyRetentionBand(state({ lastReviewedAt: "2026-04-01T00:00:00.000Z" }), now),
    ).toBe("highRisk");
  });
});
