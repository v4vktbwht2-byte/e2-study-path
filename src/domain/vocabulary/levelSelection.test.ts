import { describe, expect, it } from "vitest";
import { updateMasteryProfile } from "../mastery";
import type { MasteryProfile } from "../mastery";
import type { ReviewState } from "../review";
import {
  createVocabularyMasteryAttempt,
  getVocabularyMasteryMapping,
  selectVocabularyLevel,
} from "./index";
import type { VocabularyLevel } from "./types";

const NOW = new Date("2026-07-27T00:00:00.000Z");

function reviewState(overrides: Partial<ReviewState> = {}): ReviewState {
  return {
    itemKey: "vocab:test",
    status: "review",
    learningStep: 0,
    intervalDays: 7,
    easeBias: 0,
    dueAt: "2026-07-27T00:00:00.000Z",
    lastReviewedAt: "2026-07-20T00:00:00.000Z",
    firstLearnedAt: "2026-07-01T00:00:00.000Z",
    reviewCount: 5,
    lapseCount: 0,
    consecutiveSuccesses: 2,
    updatedAt: "2026-07-20T00:00:00.000Z",
    ...overrides,
  };
}

function mastery(overrides: Partial<MasteryProfile> = {}): MasteryProfile {
  return {
    itemKey: "vocab:test",
    recognition: 70,
    recall: 70,
    listening: 70,
    spelling: 70,
    context: 70,
    lastUpdatedAt: "2026-07-20T00:00:00.000Z",
    ...overrides,
  };
}

describe("語彙の出題レベル選択", () => {
  it.each([
    [1, { recognition: 39 }],
    [2, { recognition: 50 }],
    [3, { recall: 39 }],
    [4, { recall: 50 }],
    [5, { spelling: 49 }],
    [6, { context: 49 }],
    [7, { listening: 49 }],
  ] satisfies readonly [VocabularyLevel, Partial<MasteryProfile>][])(
    "習熟度からLevel %iを選ぶ",
    (expectedLevel, masteryOverrides) => {
      expect(
        selectVocabularyLevel({
          reviewState: reviewState(),
          mastery: mastery(masteryOverrides),
          now: NOW,
        }).level,
      ).toBe(expectedLevel);
    },
  );

  it("新規単語はLevel 1から始める", () => {
    const selection = selectVocabularyLevel({
      reviewState: reviewState({ status: "new", reviewCount: 0 }),
      mastery: mastery(),
      now: NOW,
    });
    expect(selection).toMatchObject({
      level: 1,
      format: "englishToJapaneseChoice",
      reason: "newItem",
      selectedAutomatically: true,
    });
  });

  it.each([1, 2, 3, 4, 5, 6, 7] as const)(
    "手動指定では学習状態にかかわらずLevel %iを選ぶ",
    (manualLevel) => {
      const selection = selectVocabularyLevel({
        reviewState: reviewState({ status: "new" }),
        mastery: mastery({ recognition: 0 }),
        now: NOW,
        manualLevel,
      });
      expect(selection.level).toBe(manualLevel);
      expect(selection.reason).toBe("manual");
      expect(selection.selectedAutomatically).toBe(false);
    },
  );

  it("未来の復習日時を負の経過時間にせず、入力も変更しない", () => {
    const state = reviewState({
      dueAt: "2026-08-01T00:00:00.000Z",
      lastReviewedAt: "2026-07-30T00:00:00.000Z",
    });
    const profile = mastery({ recognition: 50 });
    const stateSnapshot = structuredClone(state);
    const profileSnapshot = structuredClone(profile);
    const input = { reviewState: state, mastery: profile, now: NOW };

    expect(selectVocabularyLevel(input)).toEqual(selectVocabularyLevel(input));
    expect(selectVocabularyLevel(input)).toMatchObject({
      level: 2,
      isDue: false,
      elapsedDaysSinceLastReview: 0,
    });
    expect(state).toEqual(stateSnapshot);
    expect(profile).toEqual(profileSnapshot);
  });
});

describe("出題形式とMastery 5軸の対応", () => {
  it.each([
    [1, "recognitionChoice", ["recognition"]],
    [2, "selfRecall", ["recall"]],
    [3, "recallChoice", ["recall"]],
    [4, "textInput", ["recall", "spelling"]],
    [5, "textInput", ["recall", "spelling"]],
    [6, "cloze", ["recall", "context"]],
    [7, "dictation", ["listening", "spelling"]],
  ] as const)("Level %iは%sで対象軸だけを返す", (level, exerciseMode, dimensions) => {
    const mapping = getVocabularyMasteryMapping(level);
    expect(mapping.exerciseMode).toBe(exerciseMode);
    expect(mapping.targetDimensions).toEqual(dimensions);
  });

  it.each([1, 3] as const)("Level %iの選択式正解ではspellingを更新しない", (level) => {
    const original = mastery({ spelling: 42 });
    const result = updateMasteryProfile({
      profile: original,
      attempt: createVocabularyMasteryAttempt(level, {
        correct: true,
        hintCount: 0,
      }),
      now: NOW,
    });
    expect(result.profile.spelling).toBe(42);
    expect(result.appliedDelta.spelling).toBe(0);
  });
});
