import { RESPONSE_TIMING_THRESHOLDS } from "./constants";
import { ReviewDomainError } from "./errors";
import type {
  ResponseSpeed,
  ResponseTiming,
  SuggestedRatingInput,
  ReviewRating,
} from "./types";

function assertNonNegativeFinite(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new ReviewDomainError(
      "INVALID_NUMBER",
      `${label}には0以上の有限値を指定してください。`,
    );
  }
}

export function classifyResponseSpeed(timing: ResponseTiming): ResponseSpeed {
  assertNonNegativeFinite(timing.responseTimeMs, "回答時間");
  const threshold = RESPONSE_TIMING_THRESHOLDS[timing.kind];
  const audioDurationMs = timing.audioDurationMs ?? 0;
  assertNonNegativeFinite(audioDurationMs, "音声時間");

  const baseMs = threshold.relativeToAudio ? audioDurationMs : 0;
  if (timing.responseTimeMs < baseMs + threshold.fastMs) {
    return "fast";
  }
  if (timing.responseTimeMs <= baseMs + threshold.normalUpperMs) {
    return "normal";
  }
  return "slow";
}

export function resolveResponseSpeed(input: {
  responseSpeed?: ResponseSpeed;
  responseTiming?: ResponseTiming;
}): ResponseSpeed {
  if (input.responseSpeed !== undefined) {
    return input.responseSpeed;
  }
  if (input.responseTiming !== undefined) {
    return classifyResponseSpeed(input.responseTiming);
  }
  return "normal";
}

/**
 * 正誤・ヒント・自信度・速度から初期表示する評価を求める。
 * 利用者はこの提案を最終評価で上書きできる。
 */
export function suggestReviewRating(input: SuggestedRatingInput): ReviewRating {
  if (!input.correct) {
    return "again";
  }

  const hintCount = input.hintCount ?? 0;
  assertNonNegativeFinite(hintCount, "ヒント回数");
  const confidence = input.confidence ?? "medium";
  const speedAdjustmentEnabled = input.speedAdjustmentEnabled ?? true;
  const speed = speedAdjustmentEnabled ? resolveResponseSpeed(input) : "normal";

  if (
    hintCount >= 2 ||
    confidence === "none" ||
    (speedAdjustmentEnabled && speed === "slow")
  ) {
    return "hard";
  }

  if (
    hintCount === 0 &&
    confidence === "high" &&
    speedAdjustmentEnabled &&
    speed === "fast"
  ) {
    return "easy";
  }

  return "good";
}
