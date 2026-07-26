import { describe, expect, it } from "vitest";
import { createMasteryProfile, updateMasteryProfile } from "./updateMastery";
import type { MasteryProfile } from "./types";

const NOW = new Date("2026-07-27T00:00:00.000Z");

function profile(overrides: Partial<MasteryProfile> = {}): MasteryProfile {
  return {
    itemKey: "vocab:test",
    recognition: 50,
    recall: 50,
    listening: 50,
    spelling: 50,
    context: 50,
    lastUpdatedAt: "2026-07-26T00:00:00.000Z",
    ...overrides,
  };
}

describe("Mastery 5軸更新", () => {
  it("5軸を0で初期化する", () => {
    expect(createMasteryProfile("vocab:hello", NOW)).toEqual({
      itemKey: "vocab:hello",
      recognition: 0,
      recall: 0,
      listening: 0,
      spelling: 0,
      context: 0,
      lastUpdatedAt: NOW.toISOString(),
    });
  });

  it.each([
    [0, 8],
    [1, 4],
    [2, 2],
  ] as const)(
    "正解時のヒント%d回で基礎delta %dを加える",
    (hintCount, expectedDelta) => {
      const result = updateMasteryProfile({
        profile: profile(),
        attempt: {
          correct: true,
          hintCount,
          exerciseMode: "textInput",
          targetDimensions: ["recall"],
        },
        now: NOW,
      });
      expect(result.appliedDelta.recall).toBe(expectedDelta);
    },
  );

  it("不正解で対象軸を6下げる", () => {
    const result = updateMasteryProfile({
      profile: profile(),
      attempt: {
        correct: false,
        hintCount: 0,
        exerciseMode: "textInput",
        targetDimensions: ["recall"],
      },
      now: NOW,
    });
    expect(result.profile.recall).toBe(44);
  });

  it("Again後の再正解は基礎deltaを2にする", () => {
    const result = updateMasteryProfile({
      profile: profile(),
      attempt: {
        correct: true,
        correctAfterAgain: true,
        hintCount: 0,
        responseSpeed: "normal",
        exerciseMode: "textInput",
        targetDimensions: ["recall"],
      },
      now: NOW,
    });
    expect(result.appliedDelta.recall).toBe(2);
  });

  it("速い正解には2を加え、遅い正解は減点しない", () => {
    const fast = updateMasteryProfile({
      profile: profile(),
      attempt: {
        correct: true,
        hintCount: 0,
        responseSpeed: "fast",
        exerciseMode: "textInput",
        targetDimensions: ["recall"],
      },
      now: NOW,
    });
    const slow = updateMasteryProfile({
      profile: profile(),
      attempt: {
        correct: true,
        hintCount: 0,
        responseSpeed: "slow",
        exerciseMode: "textInput",
        targetDimensions: ["recall"],
      },
      now: NOW,
    });
    expect(fast.appliedDelta.recall).toBe(10);
    expect(slow.appliedDelta.recall).toBe(8);
  });

  it("速度補正を無効にするとfast加点を行わない", () => {
    const result = updateMasteryProfile({
      profile: profile(),
      attempt: {
        correct: true,
        hintCount: 0,
        responseSpeed: "fast",
        speedAdjustmentEnabled: false,
        exerciseMode: "textInput",
        targetDimensions: ["recall"],
      },
      now: NOW,
    });
    expect(result.appliedDelta.recall).toBe(8);
  });

  it("高自信の不正解は追加で2下げる", () => {
    const result = updateMasteryProfile({
      profile: profile(),
      attempt: {
        correct: false,
        hintCount: 0,
        confidence: "high",
        exerciseMode: "textInput",
        targetDimensions: ["recall"],
      },
      now: NOW,
    });
    expect(result.appliedDelta.recall).toBe(-8);
  });

  it("対象に指定した5軸だけを更新する", () => {
    const result = updateMasteryProfile({
      profile: profile(),
      attempt: {
        correct: true,
        hintCount: 0,
        exerciseMode: "other",
        targetDimensions: ["recognition", "recall", "listening", "spelling", "context"],
      },
      now: NOW,
    });
    expect(result.profile).toMatchObject({
      recognition: 58,
      recall: 58,
      listening: 58,
      spelling: 58,
      context: 58,
      lastUpdatedAt: NOW.toISOString(),
    });
  });

  it("英語から日本語のrecognition四択ではrecallとspellingを更新しない", () => {
    const result = updateMasteryProfile({
      profile: profile(),
      attempt: {
        correct: true,
        hintCount: 0,
        exerciseMode: "recognitionChoice",
        targetDimensions: ["recognition", "recall", "spelling"],
      },
      now: NOW,
    });
    expect(result.profile.recognition).toBe(58);
    expect(result.profile.recall).toBe(50);
    expect(result.profile.spelling).toBe(50);
    expect(result.appliedDelta.recall).toBe(0);
    expect(result.appliedDelta.spelling).toBe(0);
  });

  it("スペル入力では指定されたspellingとrecallを更新する", () => {
    const result = updateMasteryProfile({
      profile: profile(),
      attempt: {
        correct: true,
        hintCount: 1,
        exerciseMode: "textInput",
        targetDimensions: ["spelling", "recall"],
      },
      now: NOW,
    });
    expect(result.profile.spelling).toBe(54);
    expect(result.profile.recall).toBe(54);
  });

  it("軸ごとの反映比率を適用する", () => {
    const result = updateMasteryProfile({
      profile: profile(),
      attempt: {
        correct: true,
        hintCount: 0,
        exerciseMode: "cloze",
        targetDimensions: ["recall", "context"],
        targetWeights: { recall: 1, context: 0.5 },
      },
      now: NOW,
    });
    expect(result.appliedDelta.recall).toBe(8);
    expect(result.appliedDelta.context).toBe(4);
  });

  it("各軸を0〜100へclampする", () => {
    const upper = updateMasteryProfile({
      profile: profile({ recognition: 98 }),
      attempt: {
        correct: true,
        hintCount: 0,
        exerciseMode: "other",
        targetDimensions: ["recognition"],
      },
      now: NOW,
    });
    const lower = updateMasteryProfile({
      profile: profile({ recognition: 3 }),
      attempt: {
        correct: false,
        hintCount: 0,
        exerciseMode: "other",
        targetDimensions: ["recognition"],
      },
      now: NOW,
    });
    expect(upper.profile.recognition).toBe(100);
    expect(lower.profile.recognition).toBe(0);
  });

  it("重複した対象軸を1回だけ更新する", () => {
    const result = updateMasteryProfile({
      profile: profile(),
      attempt: {
        correct: true,
        hintCount: 0,
        exerciseMode: "other",
        targetDimensions: ["context", "context"],
      },
      now: NOW,
    });
    expect(result.profile.context).toBe(58);
  });

  it("同一入力では入力を変更せず同一出力を返す", () => {
    const current = profile();
    const snapshot = structuredClone(current);
    const input = {
      profile: current,
      attempt: {
        correct: true,
        hintCount: 0,
        responseSpeed: "normal" as const,
        exerciseMode: "textInput" as const,
        targetDimensions: ["recall", "spelling"] as const,
      },
      now: NOW,
    };
    expect(updateMasteryProfile(input)).toEqual(updateMasteryProfile(input));
    expect(current).toEqual(snapshot);
  });
});
