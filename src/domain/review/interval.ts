import {
  CONFIDENCE_FACTOR,
  EASE_BIAS_DELTA,
  HINT_FACTOR,
  RATING_MULTIPLIER,
  REVIEW_LIMITS,
  SPEED_FACTOR,
} from "./constants";
import { ReviewDomainError } from "./errors";
import { clamp } from "./math";
import { resolveResponseSpeed } from "./response";
import type { ScheduleReviewInput } from "./types";

export function clampEaseBias(value: number): number {
  if (!Number.isFinite(value)) {
    throw new ReviewDomainError(
      "INVALID_NUMBER",
      "easeBiasには有限値を指定してください。",
    );
  }
  return clamp(value, REVIEW_LIMITS.minimumEaseBias, REVIEW_LIMITS.maximumEaseBias);
}

export function updateEaseBias(
  currentEaseBias: number,
  rating: ScheduleReviewInput["rating"],
): number {
  return clampEaseBias(currentEaseBias + EASE_BIAS_DELTA[rating]);
}

/**
 * 30日未満は整数日、30〜89日は2日単位、90日以上は5日単位へ丸める。
 */
export function roundReviewIntervalDays(rawIntervalDays: number): number {
  if (!Number.isFinite(rawIntervalDays)) {
    throw new ReviewDomainError(
      "INVALID_NUMBER",
      "復習間隔には有限値を指定してください。",
    );
  }

  const clamped = clamp(
    rawIntervalDays,
    REVIEW_LIMITS.minimumReviewIntervalDays,
    REVIEW_LIMITS.maximumReviewIntervalDays,
  );
  let rounded: number;
  if (clamped < 30) {
    rounded = Math.round(clamped);
  } else if (clamped < 90) {
    rounded = Math.round(clamped / 2) * 2;
  } else {
    rounded = Math.round(clamped / 5) * 5;
  }

  return clamp(
    rounded,
    REVIEW_LIMITS.minimumReviewIntervalDays,
    REVIEW_LIMITS.maximumReviewIntervalDays,
  );
}

function hintFactor(hintCount: number): number {
  if (!Number.isFinite(hintCount) || hintCount < 0) {
    throw new ReviewDomainError(
      "INVALID_NUMBER",
      "ヒント回数には0以上の有限値を指定してください。",
    );
  }
  if (hintCount === 0) {
    return HINT_FACTOR.none;
  }
  return hintCount === 1 ? HINT_FACTOR.one : HINT_FACTOR.many;
}

export function calculateReviewIntervalDays(input: ScheduleReviewInput): number {
  const previousInterval = Math.max(
    input.state.intervalDays,
    REVIEW_LIMITS.minimumReviewIntervalDays,
  );
  const confidence = input.confidence ?? "medium";
  const speedFactor =
    (input.speedAdjustmentEnabled ?? true)
      ? SPEED_FACTOR[resolveResponseSpeed(input)]
      : 1;

  const rawInterval =
    previousInterval *
    RATING_MULTIPLIER[input.rating] *
    speedFactor *
    CONFIDENCE_FACTOR[confidence] *
    hintFactor(input.hintCount ?? 0) *
    clampEaseBias(input.state.easeBias);

  return roundReviewIntervalDays(rawInterval);
}
