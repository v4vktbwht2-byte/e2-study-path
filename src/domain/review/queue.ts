import {
  BACKLOG_LIMITS,
  DEFAULT_INTERLEAVE_WINDOW,
  MILLISECONDS_PER_DAY,
  QUEUE_LAPSE_NORMALIZATION_COUNT,
  QUEUE_PRIORITY_WEIGHT,
  REVIEW_LIMITS,
} from "./constants";
import { ReviewDomainError } from "./errors";
import { clampUnit } from "./math";
import { calculatePredictedRetention } from "./retention";
import { assertNow, parseIsoDate } from "./time";
import type {
  RankReviewQueueOptions,
  RankedReviewQueueItem,
  ReviewPriorityBreakdown,
  ReviewPriorityInput,
  ReviewQueueCandidate,
} from "./types";

function assertCount(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new ReviewDomainError(
      "INVALID_NUMBER",
      `${label}には0以上の有限値を指定してください。`,
    );
  }
}

export function calculateReviewPriority(
  input: ReviewPriorityInput,
): ReviewPriorityBreakdown {
  assertNow(input.now);
  const predictedRetention = calculatePredictedRetention(input.state, input.now);
  const riskScore = clampUnit(1 - predictedRetention);
  const dueAt = parseIsoDate(input.state.dueAt, "復習予定時刻");
  const overdueDays = Math.max(
    0,
    (input.now.getTime() - dueAt.getTime()) / MILLISECONDS_PER_DAY,
  );
  const overdueScore = clampUnit(
    overdueDays /
      Math.max(input.state.intervalDays, REVIEW_LIMITS.minimumRetentionIntervalDays),
  );
  const lapseScore = clampUnit(
    input.state.lapseCount / QUEUE_LAPSE_NORMALIZATION_COUNT,
  );
  const examImportanceScore = clampUnit(input.examImportanceScore ?? 0);
  const userPinnedScore = input.userPinned === true ? 1 : 0;
  const priority =
    riskScore * QUEUE_PRIORITY_WEIGHT.risk +
    overdueScore * QUEUE_PRIORITY_WEIGHT.overdue +
    lapseScore * QUEUE_PRIORITY_WEIGHT.lapse +
    examImportanceScore * QUEUE_PRIORITY_WEIGHT.examImportance +
    userPinnedScore * QUEUE_PRIORITY_WEIGHT.userPinned;

  return {
    priority,
    riskScore,
    overdueScore,
    lapseScore,
    examImportanceScore,
    userPinnedScore,
    predictedRetention,
  };
}

function compareRankedItems<T>(
  left: RankedReviewQueueItem<T>,
  right: RankedReviewQueueItem<T>,
): number {
  const priorityDifference = right.priority.priority - left.priority.priority;
  if (priorityDifference !== 0) {
    return priorityDifference;
  }

  const dueDifference =
    parseIsoDate(left.state.dueAt, "復習予定時刻").getTime() -
    parseIsoDate(right.state.dueAt, "復習予定時刻").getTime();
  if (dueDifference !== 0) {
    return dueDifference;
  }

  return left.state.itemKey.localeCompare(right.state.itemKey);
}

function lightlyInterleave<T>(
  sortedItems: readonly RankedReviewQueueItem<T>[],
  windowSize: number,
): RankedReviewQueueItem<T>[] {
  const remaining = [...sortedItems];
  const result: RankedReviewQueueItem<T>[] = [];
  let previousFormat: string | undefined;

  while (remaining.length > 0) {
    let selectedIndex = 0;
    const first = remaining[0];
    if (previousFormat !== undefined && first?.questionFormat === previousFormat) {
      const searchLimit = Math.min(windowSize, remaining.length - 1);
      for (let index = 1; index <= searchLimit; index += 1) {
        const candidate = remaining[index];
        if (
          candidate?.questionFormat !== undefined &&
          candidate.questionFormat !== previousFormat
        ) {
          selectedIndex = index;
          break;
        }
      }
    }

    const [selected] = remaining.splice(selectedIndex, 1);
    if (selected === undefined) {
      break;
    }
    result.push(selected);
    previousFormat = selected.questionFormat;
  }

  return result;
}

/**
 * suspendedを除外し、既定では期限到来済みの項目だけを優先度順に返す。
 * 優先度同点はdueAt、itemKeyの順で決定し、同一入力では常に同じ順になる。
 */
export function rankReviewQueue<T>(
  candidates: readonly ReviewQueueCandidate<T>[],
  now: Date,
  options: RankReviewQueueOptions = {},
): RankedReviewQueueItem<T>[] {
  assertNow(now);
  const dueOnly = options.dueOnly ?? true;
  const interleaveWindow = options.interleaveWindow ?? DEFAULT_INTERLEAVE_WINDOW;
  if (!Number.isInteger(interleaveWindow) || interleaveWindow < 0) {
    throw new ReviewDomainError(
      "INVALID_NUMBER",
      "interleaveWindowには0以上の整数を指定してください。",
    );
  }

  const ranked = candidates
    .filter(({ state }) => state.status !== "suspended")
    .filter(
      ({ state }) =>
        !dueOnly ||
        parseIsoDate(state.dueAt, "復習予定時刻").getTime() <= now.getTime(),
    )
    .map((candidate): RankedReviewQueueItem<T> => ({
      ...candidate,
      priority: calculateReviewPriority({
        state: candidate.state,
        now,
        examImportanceScore: candidate.examImportanceScore,
        userPinned: candidate.userPinned,
      }),
    }))
    .sort(compareRankedItems);

  return interleaveWindow === 0 ? ranked : lightlyInterleave(ranked, interleaveWindow);
}

/**
 * 復習バックログに応じた新規導入上限。
 */
export function calculateNewItemLimit(
  overdueReviews: number,
  dueReviews: number,
  dailyCapacity: number,
  configuredLimit: number,
): number {
  assertCount(overdueReviews, "期限超過件数");
  assertCount(dueReviews, "期限件数");
  assertCount(dailyCapacity, "1日の学習容量");
  assertCount(configuredLimit, "設定済み新規件数");

  if (overdueReviews > BACKLOG_LIMITS.overdueStopsNewItemsAbove) {
    return 0;
  }
  if (dueReviews > dailyCapacity * BACKLOG_LIMITS.dueCapacityRatio) {
    return Math.min(Math.floor(configuredLimit), BACKLOG_LIMITS.reducedNewItemLimit);
  }
  return Math.floor(configuredLimit);
}
