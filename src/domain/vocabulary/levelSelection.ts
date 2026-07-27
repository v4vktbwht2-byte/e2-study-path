import type { MasteryProfile } from "../mastery";
import { VocabularyDomainError } from "./errors";
import type {
  SelectVocabularyLevelInput,
  VocabularyLevel,
  VocabularyLevelSelection,
  VocabularyLevelSelectionReason,
  VocabularyQuestionFormat,
} from "./types";
import {
  assertMatchingLearningState,
  assertValidDate,
  assertVocabularyLevel,
  elapsedDaysClamped,
  parseDate,
} from "./validation";

export const VOCABULARY_FORMAT_BY_LEVEL = {
  1: "englishToJapaneseChoice",
  2: "englishRecallReveal",
  3: "japaneseToEnglishChoice",
  4: "initialLetterInput",
  5: "fullSpellingInput",
  6: "contextCloze",
  7: "audioSpellingInput",
} as const satisfies Record<VocabularyLevel, VocabularyQuestionFormat>;

interface AutomaticSelection {
  level: VocabularyLevel;
  reason: Exclude<VocabularyLevelSelectionReason, "manual">;
}

function selectMaintenanceLevel(mastery: Readonly<MasteryProfile>): AutomaticSelection {
  const advancedDimensions = [
    { score: mastery.spelling, level: 5 as const, reason: "lowSpelling" as const },
    { score: mastery.context, level: 6 as const, reason: "lowContext" as const },
    { score: mastery.listening, level: 7 as const, reason: "lowListening" as const },
  ];
  advancedDimensions.sort(
    (left, right) => left.score - right.score || left.level - right.level,
  );
  const weakest = advancedDimensions[0];
  if (weakest === undefined) {
    return { level: 5, reason: "maintenance" };
  }
  return { level: weakest.level, reason: "maintenance" };
}

function selectAutomatically(input: SelectVocabularyLevelInput): AutomaticSelection {
  const { mastery, reviewState } = input;
  if (reviewState.status === "new") {
    return { level: 1, reason: "newItem" };
  }
  if (mastery.recognition < 40) {
    return { level: 1, reason: "lowRecognition" };
  }
  if (mastery.recognition < 60) {
    return { level: 2, reason: "recognitionPractice" };
  }
  if (mastery.recall < 40) {
    return { level: 3, reason: "lowRecall" };
  }
  if (mastery.recall < 60) {
    return { level: 4, reason: "recallPractice" };
  }
  if (mastery.spelling < 50) {
    return { level: 5, reason: "lowSpelling" };
  }
  if (mastery.context < 50) {
    return { level: 6, reason: "lowContext" };
  }
  if (mastery.listening < 50) {
    return { level: 7, reason: "lowListening" };
  }
  return selectMaintenanceLevel(mastery);
}

/**
 * ReviewStateと5軸習熟度から出題形式を決める。
 * 現在時刻は外から受け取り、未来の学習日時は経過0日として扱う。
 */
export function selectVocabularyLevel(
  input: SelectVocabularyLevelInput,
): VocabularyLevelSelection {
  const now = assertValidDate(input.now, "現在時刻");
  assertMatchingLearningState(
    input.reviewState.itemKey,
    input.reviewState,
    input.mastery,
  );
  if (input.reviewState.status === "suspended") {
    throw new VocabularyDomainError(
      "INVALID_STATE",
      "一時停止中の単語は出題レベルを選択できません。",
    );
  }

  const dueAt = parseDate(input.reviewState.dueAt, "復習予定時刻");
  const lastReviewedAt =
    input.reviewState.lastReviewedAt === undefined
      ? undefined
      : parseDate(input.reviewState.lastReviewedAt, "最終復習時刻");

  let selection: AutomaticSelection | { level: VocabularyLevel; reason: "manual" };
  if (input.manualLevel !== undefined) {
    assertVocabularyLevel(input.manualLevel);
    selection = { level: input.manualLevel, reason: "manual" };
  } else {
    selection = selectAutomatically(input);
  }

  return {
    level: selection.level,
    format: VOCABULARY_FORMAT_BY_LEVEL[selection.level],
    reason: selection.reason,
    isDue: dueAt <= now,
    elapsedDaysSinceLastReview: elapsedDaysClamped(lastReviewedAt, now),
    selectedAutomatically: selection.reason !== "manual",
  };
}
