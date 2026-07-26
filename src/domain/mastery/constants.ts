import type { MasteryDimension } from "./types";

export const MASTERY_DIMENSIONS: readonly MasteryDimension[] = [
  "recognition",
  "recall",
  "listening",
  "spelling",
  "context",
];

export const MASTERY_LIMITS = {
  minimum: 0,
  maximum: 100,
  maximumSingleAnswerChange: 20,
} as const;

export const MASTERY_BASE_DELTA = {
  correctWithoutHint: 8,
  correctWithOneHint: 4,
  correctWithManyHints: 2,
  incorrect: -6,
  correctAfterAgain: 2,
} as const;

export const MASTERY_ADJUSTMENT = {
  fast: 2,
  slow: 0,
  incorrectWithHighConfidence: -2,
} as const;

/**
 * recognition四択では、教材側に誤ったtarget指定があっても
 * 想起と綴りを更新しない。
 */
export const FORBIDDEN_DIMENSIONS_BY_EXERCISE_MODE = {
  recognitionChoice: ["recall", "spelling"],
} as const satisfies Partial<Record<string, readonly MasteryDimension[]>>;
