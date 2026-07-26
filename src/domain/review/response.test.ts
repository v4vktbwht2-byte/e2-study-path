import { describe, expect, it } from "vitest";
import { classifyResponseSpeed, suggestReviewRating } from "./response";

describe("回答速度と推奨評価", () => {
  it("問題形式ごとの閾値で回答速度を分類する", () => {
    expect(
      classifyResponseSpeed({
        kind: "recognitionChoice",
        responseTimeMs: 2_499,
      }),
    ).toBe("fast");
    expect(
      classifyResponseSpeed({
        kind: "recallChoice",
        responseTimeMs: 10_000,
      }),
    ).toBe("normal");
    expect(classifyResponseSpeed({ kind: "typing", responseTimeMs: 20_001 })).toBe(
      "slow",
    );
  });

  it("聞き取りは音声終了からの経過で速度を分類する", () => {
    expect(
      classifyResponseSpeed({
        kind: "listening",
        responseTimeMs: 7_900,
        audioDurationMs: 6_000,
      }),
    ).toBe("fast");
    expect(
      classifyResponseSpeed({
        kind: "listening",
        responseTimeMs: 16_001,
        audioDurationMs: 6_000,
      }),
    ).toBe("slow");
  });

  it("不正解にはAgainを提案する", () => {
    expect(suggestReviewRating({ correct: false })).toBe("again");
  });

  it("複数ヒント・自信なし・遅い正解にはHardを提案する", () => {
    expect(suggestReviewRating({ correct: true, hintCount: 2 })).toBe("hard");
    expect(suggestReviewRating({ correct: true, confidence: "none" })).toBe("hard");
    expect(suggestReviewRating({ correct: true, responseSpeed: "slow" })).toBe("hard");
  });

  it("通常の正解にはGoodを提案する", () => {
    expect(
      suggestReviewRating({
        correct: true,
        hintCount: 0,
        confidence: "medium",
        responseSpeed: "normal",
      }),
    ).toBe("good");
  });

  it("ヒントなし・高自信・速い正解にはEasyを提案する", () => {
    expect(
      suggestReviewRating({
        correct: true,
        hintCount: 0,
        confidence: "high",
        responseSpeed: "fast",
      }),
    ).toBe("easy");
  });

  it("速度補正無効時は遅さでHardにせず速さでEasyにしない", () => {
    expect(
      suggestReviewRating({
        correct: true,
        confidence: "medium",
        responseSpeed: "slow",
        speedAdjustmentEnabled: false,
      }),
    ).toBe("good");
    expect(
      suggestReviewRating({
        correct: true,
        confidence: "high",
        responseSpeed: "fast",
        speedAdjustmentEnabled: false,
      }),
    ).toBe("good");
  });
});
