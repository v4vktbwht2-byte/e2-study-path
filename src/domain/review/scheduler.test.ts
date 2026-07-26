import { describe, expect, it } from "vitest";
import {
  createNewReviewState,
  resetSuspendedReviewState,
  resumeReviewState,
  scheduleReview,
  suspendReviewState,
} from "./scheduler";
import type { ReviewState } from "./types";

const NOW = new Date("2026-07-27T00:00:00.000Z");
const UTC_START = { timeZone: "UTC", hour: 0 } as const;

function reviewState(overrides: Partial<ReviewState> = {}): ReviewState {
  return {
    itemKey: "vocab:test",
    status: "review",
    learningStep: 0,
    intervalDays: 10,
    easeBias: 1,
    dueAt: "2026-07-27T00:00:00.000Z",
    lastReviewedAt: "2026-07-17T00:00:00.000Z",
    firstLearnedAt: "2026-07-01T00:00:00.000Z",
    reviewCount: 4,
    lapseCount: 1,
    consecutiveSuccesses: 2,
    updatedAt: "2026-07-17T00:00:00.000Z",
    ...overrides,
  };
}

describe("復習スケジューラー", () => {
  it("新規状態を現在時刻の注入だけで作成する", () => {
    expect(createNewReviewState("vocab:hello", NOW)).toEqual({
      itemKey: "vocab:hello",
      status: "new",
      learningStep: 0,
      intervalDays: 0,
      easeBias: 1,
      dueAt: NOW.toISOString(),
      reviewCount: 0,
      lapseCount: 0,
      consecutiveSuccesses: 0,
      updatedAt: NOW.toISOString(),
    });
  });

  it("newのGoodでlearning step 0へ入り10分後にする", () => {
    const result = scheduleReview({
      state: createNewReviewState("vocab:hello", NOW),
      rating: "good",
      now: NOW,
      responseTimeMs: 3_200,
    });

    expect(result).toMatchObject({
      status: "learning",
      learningStep: 0,
      intervalDays: 0,
      dueAt: "2026-07-27T00:10:00.000Z",
      firstLearnedAt: NOW.toISOString(),
      lastReviewedAt: NOW.toISOString(),
      reviewCount: 1,
      consecutiveSuccesses: 1,
      lastRating: "good",
      lastResponseTimeMs: 3_200,
      predictedRetention: 1,
    });
  });

  it("newのEasyでlearningを卒業し14日間隔にする", () => {
    const result = scheduleReview({
      state: createNewReviewState("vocab:hello", NOW),
      rating: "easy",
      now: NOW,
      studyDayBoundary: UTC_START,
    });

    expect(result.status).toBe("review");
    expect(result.intervalDays).toBe(14);
    expect(result.dueAt).toBe("2026-08-10T00:00:00.000Z");
  });

  it("learningのAgainでstep 0へ戻し10分後にする", () => {
    const result = scheduleReview({
      state: reviewState({
        status: "learning",
        learningStep: 2,
        intervalDays: 0,
      }),
      rating: "again",
      now: NOW,
    });

    expect(result).toMatchObject({
      status: "learning",
      learningStep: 0,
      dueAt: "2026-07-27T00:10:00.000Z",
      consecutiveSuccesses: 0,
    });
  });

  it("learningのHardでstepを維持し最低30分待つ", () => {
    const result = scheduleReview({
      state: reviewState({
        status: "learning",
        learningStep: 0,
        intervalDays: 0,
      }),
      rating: "hard",
      now: NOW,
    });

    expect(result.status).toBe("learning");
    expect(result.learningStep).toBe(0);
    expect(result.dueAt).toBe("2026-07-27T00:30:00.000Z");
  });

  it("learningのGoodで次の固定stepへ進む", () => {
    const result = scheduleReview({
      state: reviewState({
        status: "learning",
        learningStep: 0,
        intervalDays: 0,
      }),
      rating: "good",
      now: NOW,
      studyDayBoundary: UTC_START,
    });

    expect(result).toMatchObject({
      status: "learning",
      learningStep: 1,
      dueAt: "2026-07-28T00:00:00.000Z",
    });
  });

  it("learning最終stepのGoodで7日間隔のreviewへ進む", () => {
    const result = scheduleReview({
      state: reviewState({
        status: "learning",
        learningStep: 2,
        intervalDays: 0,
      }),
      rating: "good",
      now: NOW,
      studyDayBoundary: UTC_START,
    });

    expect(result).toMatchObject({
      status: "review",
      learningStep: 0,
      intervalDays: 7,
      dueAt: "2026-08-03T00:00:00.000Z",
    });
  });

  it("learningのEasyで即時卒業し14日間隔にする", () => {
    const result = scheduleReview({
      state: reviewState({
        status: "learning",
        learningStep: 1,
        intervalDays: 0,
      }),
      rating: "easy",
      now: NOW,
      studyDayBoundary: UTC_START,
    });

    expect(result.status).toBe("review");
    expect(result.intervalDays).toBe(14);
  });

  it("reviewのAgainでrelearningへ入り元のintervalを保持する", () => {
    const result = scheduleReview({
      state: reviewState(),
      rating: "again",
      now: NOW,
    });

    expect(result).toMatchObject({
      status: "relearning",
      learningStep: 0,
      intervalDays: 10,
      dueAt: "2026-07-27T00:10:00.000Z",
      easeBias: 0.92,
      lapseCount: 2,
      consecutiveSuccesses: 0,
    });
  });

  it.each([
    ["hard", 12, "2026-08-08T00:00:00.000Z", 0.97],
    ["good", 20, "2026-08-16T00:00:00.000Z", 1],
    ["easy", 30, "2026-08-26T00:00:00.000Z", 1.04],
  ] as const)(
    "reviewの%sで倍率に応じたintervalを得る",
    (rating, intervalDays, dueAt, easeBias) => {
      const result = scheduleReview({
        state: reviewState(),
        rating,
        now: NOW,
        studyDayBoundary: UTC_START,
      });

      expect(result).toMatchObject({
        status: "review",
        intervalDays,
        dueAt,
        easeBias,
      });
    },
  );

  it("relearningのAgainでstep 0へ戻る", () => {
    const result = scheduleReview({
      state: reviewState({ status: "relearning", learningStep: 1 }),
      rating: "again",
      now: NOW,
    });

    expect(result).toMatchObject({
      status: "relearning",
      learningStep: 0,
      intervalDays: 10,
      dueAt: "2026-07-27T00:10:00.000Z",
    });
  });

  it("relearningのHardで現在stepを維持する", () => {
    const result = scheduleReview({
      state: reviewState({ status: "relearning", learningStep: 0 }),
      rating: "hard",
      now: NOW,
    });

    expect(result).toMatchObject({
      status: "relearning",
      learningStep: 0,
      dueAt: "2026-07-27T00:30:00.000Z",
    });
  });

  it("relearningのGoodで次stepへ進み最後に元intervalの35%で卒業する", () => {
    const nextStep = scheduleReview({
      state: reviewState({ status: "relearning", learningStep: 0 }),
      rating: "good",
      now: NOW,
      studyDayBoundary: UTC_START,
    });
    expect(nextStep).toMatchObject({
      status: "relearning",
      learningStep: 1,
      dueAt: "2026-07-28T00:00:00.000Z",
    });

    const graduated = scheduleReview({
      state: nextStep,
      rating: "good",
      now: new Date("2026-07-28T00:00:00.000Z"),
      studyDayBoundary: UTC_START,
    });
    expect(graduated).toMatchObject({
      status: "review",
      intervalDays: 4,
      dueAt: "2026-08-01T00:00:00.000Z",
    });
  });

  it("relearningのEasyで再学習を即時卒業する", () => {
    const result = scheduleReview({
      state: reviewState({ status: "relearning", learningStep: 0 }),
      rating: "easy",
      now: NOW,
      studyDayBoundary: UTC_START,
    });

    expect(result.status).toBe("review");
    expect(result.intervalDays).toBe(4);
  });

  it("easeBiasを下限0.75と上限1.3へclampする", () => {
    const minimum = scheduleReview({
      state: reviewState({ easeBias: 0.76 }),
      rating: "again",
      now: NOW,
    });
    const maximum = scheduleReview({
      state: reviewState({ easeBias: 1.29 }),
      rating: "easy",
      now: NOW,
    });

    expect(minimum.easeBias).toBe(0.75);
    expect(maximum.easeBias).toBe(1.3);
  });

  it("review intervalを180日でclampする", () => {
    const result = scheduleReview({
      state: reviewState({ intervalDays: 180, easeBias: 1.3 }),
      rating: "easy",
      responseSpeed: "fast",
      confidence: "high",
      now: NOW,
      studyDayBoundary: UTC_START,
    });

    expect(result.intervalDays).toBe(180);
    expect(result.dueAt).toBe("2027-01-23T00:00:00.000Z");
  });

  it("速度補正を無効にするとfastでもnormalと同じintervalになる", () => {
    const fastDisabled = scheduleReview({
      state: reviewState(),
      rating: "good",
      responseSpeed: "fast",
      speedAdjustmentEnabled: false,
      now: NOW,
    });
    const normal = scheduleReview({
      state: reviewState(),
      rating: "good",
      responseSpeed: "normal",
      now: NOW,
    });
    const fastEnabled = scheduleReview({
      state: reviewState(),
      rating: "good",
      responseSpeed: "fast",
      now: NOW,
    });

    expect(fastDisabled.intervalDays).toBe(normal.intervalDays);
    expect(fastEnabled.intervalDays).toBe(23);
  });

  it("同一入力では入力を変更せず同一出力を返す", () => {
    const state = reviewState();
    const snapshot = structuredClone(state);
    const input = {
      state,
      rating: "good" as const,
      responseSpeed: "fast" as const,
      confidence: "high" as const,
      hintCount: 1,
      now: NOW,
      studyDayBoundary: UTC_START,
    };

    expect(scheduleReview(input)).toEqual(scheduleReview(input));
    expect(state).toEqual(snapshot);
  });

  it("一時停止・再開・完全リセットの状態遷移を扱う", () => {
    const suspended = suspendReviewState(reviewState(), "あとで再開", NOW);
    expect(suspended).toMatchObject({
      status: "suspended",
      suspendedReason: "あとで再開",
    });

    const resumed = resumeReviewState(suspended, new Date("2026-07-28T00:00:00.000Z"));
    expect(resumed).toMatchObject({
      status: "review",
      dueAt: "2026-07-28T00:00:00.000Z",
    });
    expect(resumed.suspendedReason).toBeUndefined();

    const reset = resetSuspendedReviewState(suspended, NOW);
    expect(reset).toEqual(createNewReviewState("vocab:test", NOW));
  });

  it("一時停止中の項目は直接評価できない", () => {
    expect(() =>
      scheduleReview({
        state: suspendReviewState(reviewState(), "一時停止", NOW),
        rating: "good",
        now: NOW,
      }),
    ).toThrow("一時停止中");
  });
});
