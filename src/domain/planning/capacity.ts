import type { DailyPlanCapacity, DailyPlanMode } from "./types";

export const DAILY_MINUTE_PRESETS = [5, 15, 30, 45] as const;

export const MIN_DAILY_MINUTES = 1;
export const MAX_DAILY_MINUTES = 180;
export const DEFAULT_REVIEW_ITEM_SECONDS = 15;

export const BACKLOG_REVIEW_LIMITS: Readonly<Record<DailyPlanMode, number | null>> = {
  light: 15,
  standard: 30,
  thorough: 50,
  all: null,
};

function requireFiniteNumber(value: number, name: string): number {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${name}には有限の数値を指定してください。`);
  }

  return value;
}

export function normalizeDailyMinutes(minutes: number): number {
  const rounded = Math.round(requireFiniteNumber(minutes, "学習時間"));
  return Math.min(MAX_DAILY_MINUTES, Math.max(MIN_DAILY_MINUTES, rounded));
}

export function calculateDailyPlanCapacity(
  requestedMinutes: number,
  mode: DailyPlanMode,
  averageReviewSeconds = DEFAULT_REVIEW_ITEM_SECONDS,
): DailyPlanCapacity {
  const normalizedMinutes = normalizeDailyMinutes(requestedMinutes);
  const normalizedReviewSeconds = Math.max(
    1,
    Math.round(requireFiniteNumber(averageReviewSeconds, "平均復習秒数")),
  );

  if (mode === "all") {
    return {
      requestedMinutes: normalizedMinutes,
      effectiveMinutes: null,
      budgetSeconds: null,
      estimatedReviewItemCapacity: Number.POSITIVE_INFINITY,
    };
  }

  const effectiveMinutes =
    mode === "light"
      ? Math.min(5, normalizedMinutes)
      : mode === "thorough"
        ? Math.min(MAX_DAILY_MINUTES, Math.ceil(normalizedMinutes * 1.5))
        : normalizedMinutes;
  const budgetSeconds = effectiveMinutes * 60;

  return {
    requestedMinutes: normalizedMinutes,
    effectiveMinutes,
    budgetSeconds,
    estimatedReviewItemCapacity: Math.floor(budgetSeconds / normalizedReviewSeconds),
  };
}

export function calculateNewItemLimit(
  overdueReviews: number,
  dueReviews: number,
  dailyCapacity: number,
  configuredLimit: number,
): number {
  const overdueCount = Math.max(
    0,
    Math.floor(requireFiniteNumber(overdueReviews, "期限超過数")),
  );
  const dueCount = Math.max(
    0,
    Math.floor(requireFiniteNumber(dueReviews, "復習期限数")),
  );
  if (Number.isNaN(dailyCapacity) || dailyCapacity < 0) {
    throw new RangeError("1日の容量には0以上の数値を指定してください。");
  }
  const capacity = dailyCapacity;
  const normalizedConfiguredLimit = Math.max(
    0,
    Math.floor(requireFiniteNumber(configuredLimit, "新規上限")),
  );

  if (overdueCount > 40) {
    return 0;
  }

  if (dueCount > capacity * 0.7) {
    return Math.min(normalizedConfiguredLimit, 3);
  }

  return normalizedConfiguredLimit;
}
