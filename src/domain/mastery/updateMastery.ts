import { ReviewDomainError } from "../review/errors";
import { clamp } from "../review/math";
import { resolveResponseSpeed } from "../review/response";
import { assertNow, parseIsoDate } from "../review/time";
import {
  FORBIDDEN_DIMENSIONS_BY_EXERCISE_MODE,
  MASTERY_ADJUSTMENT,
  MASTERY_BASE_DELTA,
  MASTERY_DIMENSIONS,
  MASTERY_LIMITS,
} from "./constants";
import type {
  MasteryAttemptResult,
  MasteryDimension,
  MasteryProfile,
  MasteryUpdateResult,
  UpdateMasteryInput,
} from "./types";

function emptyDelta(): Record<MasteryDimension, number> {
  return {
    recognition: 0,
    recall: 0,
    listening: 0,
    spelling: 0,
    context: 0,
  };
}

function assertMasteryProfile(profile: Readonly<MasteryProfile>): void {
  if (profile.itemKey.trim().length < 3) {
    throw new ReviewDomainError(
      "INVALID_STATE",
      "itemKeyには3文字以上の安定した識別子が必要です。",
    );
  }
  parseIsoDate(profile.lastUpdatedAt, "習熟度更新時刻");
  for (const dimension of MASTERY_DIMENSIONS) {
    const value = profile[dimension];
    if (!Number.isFinite(value)) {
      throw new ReviewDomainError(
        "INVALID_STATE",
        `${dimension}には有限値が必要です。`,
      );
    }
  }
}

function assertAttempt(attempt: Readonly<MasteryAttemptResult>): void {
  if (!Number.isInteger(attempt.hintCount) || attempt.hintCount < 0) {
    throw new ReviewDomainError(
      "INVALID_NUMBER",
      "ヒント回数には0以上の整数を指定してください。",
    );
  }

  if (attempt.targetWeights !== undefined) {
    for (const dimension of MASTERY_DIMENSIONS) {
      const weight = attempt.targetWeights[dimension];
      if (
        weight !== undefined &&
        (!Number.isFinite(weight) || weight < 0 || weight > 1)
      ) {
        throw new ReviewDomainError(
          "INVALID_NUMBER",
          `${dimension}の反映比率は0〜1で指定してください。`,
        );
      }
    }
  }
}

function baseDelta(attempt: Readonly<MasteryAttemptResult>): number {
  if (!attempt.correct) {
    return MASTERY_BASE_DELTA.incorrect;
  }
  if (attempt.correctAfterAgain === true) {
    return MASTERY_BASE_DELTA.correctAfterAgain;
  }
  if (attempt.hintCount === 0) {
    return MASTERY_BASE_DELTA.correctWithoutHint;
  }
  return attempt.hintCount === 1
    ? MASTERY_BASE_DELTA.correctWithOneHint
    : MASTERY_BASE_DELTA.correctWithManyHints;
}

function adjustedDelta(attempt: Readonly<MasteryAttemptResult>): number {
  let delta = baseDelta(attempt);
  const speedAdjustmentEnabled = attempt.speedAdjustmentEnabled ?? true;

  if (
    attempt.correct &&
    speedAdjustmentEnabled &&
    resolveResponseSpeed(attempt) === "fast"
  ) {
    delta += MASTERY_ADJUSTMENT.fast;
  }
  // slowは初学者を罰しないため、明示的に0補正。
  if (!attempt.correct && attempt.confidence === "high") {
    delta += MASTERY_ADJUSTMENT.incorrectWithHighConfidence;
  }

  return clamp(
    delta,
    -MASTERY_LIMITS.maximumSingleAnswerChange,
    MASTERY_LIMITS.maximumSingleAnswerChange,
  );
}

function allowedTargetDimensions(
  attempt: Readonly<MasteryAttemptResult>,
): MasteryDimension[] {
  const forbidden = new Set<MasteryDimension>(
    attempt.exerciseMode === "recognitionChoice"
      ? FORBIDDEN_DIMENSIONS_BY_EXERCISE_MODE.recognitionChoice
      : [],
  );
  return [...new Set(attempt.targetDimensions)].filter(
    (dimension) => !forbidden.has(dimension),
  );
}

function roundMastery(value: number): number {
  return Math.round(value * 100) / 100;
}

export function updateMasteryProfile(input: UpdateMasteryInput): MasteryUpdateResult {
  assertNow(input.now);
  assertMasteryProfile(input.profile);
  assertAttempt(input.attempt);

  const delta = adjustedDelta(input.attempt);
  const appliedDelta = emptyDelta();
  const nextProfile: MasteryProfile = {
    ...input.profile,
    lastUpdatedAt: input.now.toISOString(),
  };

  for (const dimension of allowedTargetDimensions(input.attempt)) {
    const weightedDelta = delta * (input.attempt.targetWeights?.[dimension] ?? 1);
    const current = clamp(
      input.profile[dimension],
      MASTERY_LIMITS.minimum,
      MASTERY_LIMITS.maximum,
    );
    const updated = roundMastery(
      clamp(current + weightedDelta, MASTERY_LIMITS.minimum, MASTERY_LIMITS.maximum),
    );
    nextProfile[dimension] = updated;
    appliedDelta[dimension] = roundMastery(updated - current);
  }

  return {
    profile: nextProfile,
    appliedDelta,
  };
}

export function createMasteryProfile(itemKey: string, now: Date): MasteryProfile {
  assertNow(now);
  if (itemKey.trim().length < 3) {
    throw new ReviewDomainError(
      "INVALID_STATE",
      "itemKeyには3文字以上の安定した識別子が必要です。",
    );
  }
  return {
    itemKey,
    recognition: 0,
    recall: 0,
    listening: 0,
    spelling: 0,
    context: 0,
    lastUpdatedAt: now.toISOString(),
  };
}
