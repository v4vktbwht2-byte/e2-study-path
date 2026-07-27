import type { MasteryAttemptResult } from "../mastery";
import type { VocabularyLevel, VocabularyMasteryMapping } from "./types";
import { VOCABULARY_FORMAT_BY_LEVEL } from "./levelSelection";
import { assertVocabularyLevel } from "./validation";

const MAPPINGS = {
  1: {
    exerciseMode: "recognitionChoice",
    responseTimingKind: "recognitionChoice",
    targetDimensions: ["recognition"],
  },
  2: {
    exerciseMode: "selfRecall",
    responseTimingKind: "recallChoice",
    targetDimensions: ["recall"],
  },
  3: {
    exerciseMode: "recallChoice",
    responseTimingKind: "recallChoice",
    targetDimensions: ["recall"],
  },
  4: {
    exerciseMode: "textInput",
    responseTimingKind: "typing",
    targetDimensions: ["recall", "spelling"],
    targetWeights: { recall: 1, spelling: 0.5 },
  },
  5: {
    exerciseMode: "textInput",
    responseTimingKind: "typing",
    targetDimensions: ["recall", "spelling"],
    targetWeights: { recall: 0.75, spelling: 1 },
  },
  6: {
    exerciseMode: "cloze",
    responseTimingKind: "cloze",
    targetDimensions: ["recall", "context"],
    targetWeights: { recall: 0.5, context: 1 },
  },
  7: {
    exerciseMode: "dictation",
    responseTimingKind: "listening",
    targetDimensions: ["listening", "spelling"],
  },
} as const satisfies Record<
  VocabularyLevel,
  Omit<VocabularyMasteryMapping, "level" | "format">
>;

export function getVocabularyMasteryMapping(
  level: VocabularyLevel,
): VocabularyMasteryMapping {
  assertVocabularyLevel(level);
  const mapping = MAPPINGS[level];
  return {
    level,
    format: VOCABULARY_FORMAT_BY_LEVEL[level],
    exerciseMode: mapping.exerciseMode,
    responseTimingKind: mapping.responseTimingKind,
    targetDimensions: [...mapping.targetDimensions],
    ...("targetWeights" in mapping
      ? { targetWeights: { ...mapping.targetWeights } }
      : {}),
  };
}

export type VocabularyAttemptFeedback = Omit<
  MasteryAttemptResult,
  "exerciseMode" | "targetDimensions" | "targetWeights"
>;

/**
 * 出題レベルに対応する軸だけを更新するMasteryAttemptResultを組み立てる。
 */
export function createVocabularyMasteryAttempt(
  level: VocabularyLevel,
  feedback: Readonly<VocabularyAttemptFeedback>,
): MasteryAttemptResult {
  const mapping = getVocabularyMasteryMapping(level);
  return {
    ...feedback,
    exerciseMode: mapping.exerciseMode,
    targetDimensions: mapping.targetDimensions,
    ...(mapping.targetWeights === undefined
      ? {}
      : { targetWeights: mapping.targetWeights }),
  };
}
