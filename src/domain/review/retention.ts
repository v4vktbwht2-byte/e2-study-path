import { RETENTION_BASE, RETENTION_BAND_THRESHOLDS, REVIEW_LIMITS } from "./constants";
import { clampUnit } from "./math";
import { assertNow, elapsedDaysSince, parseIsoDate } from "./time";
import type { RetentionBand, ReviewState } from "./types";

/**
 * intervalを90%保持の安定期間とみなす、表示・優先順位用の推定値。
 * 未来のlastReviewedAtは端末時計の巻き戻りとして経過0日に丸める。
 */
export function calculatePredictedRetention(
  state: Readonly<ReviewState>,
  now: Date,
): number {
  assertNow(now);
  if (state.lastReviewedAt === undefined) {
    return 1;
  }

  const elapsedDays = elapsedDaysSince(
    parseIsoDate(state.lastReviewedAt, "最終復習時刻"),
    now,
  );
  const stableInterval = Math.max(
    state.intervalDays,
    REVIEW_LIMITS.minimumRetentionIntervalDays,
  );

  return clampUnit(Math.pow(RETENTION_BASE, elapsedDays / stableInterval));
}

export function classifyRetentionBand(
  state: Readonly<ReviewState>,
  now: Date,
): RetentionBand {
  const retention = calculatePredictedRetention(state, now);
  if (retention < RETENTION_BAND_THRESHOLDS.highRisk) {
    return "highRisk";
  }

  if (parseIsoDate(state.dueAt, "復習予定時刻").getTime() <= now.getTime()) {
    return "dueToday";
  }

  if (retention < RETENTION_BAND_THRESHOLDS.stable) {
    return "reviewSoon";
  }

  return "stable";
}
