import { VocabularyDomainError } from "./errors";
import type {
  VocabularyAttemptSnapshot,
  WeakWord,
  WeakWordCandidate,
  WeakWordReason,
  WeakWordThresholds,
} from "./types";
import {
  assertMatchingLearningState,
  assertValidDate,
  parseDate,
  stableTextCompare,
} from "./validation";

export const DEFAULT_WEAK_WORD_THRESHOLDS: Readonly<WeakWordThresholds> = {
  lapseCount: 3,
  recentAttemptCount: 3,
  recentIncorrectCount: 2,
  recognitionRecallGap: 25,
};

const REASON_SCORE: Readonly<Record<WeakWordReason, number>> = {
  repeatedLapses: 30,
  recentErrors: 30,
  slowResponse: 10,
  lowConfidence: 10,
  recognitionRecallGap: 20,
  confusionError: 25,
};

function assertThresholds(thresholds: Readonly<WeakWordThresholds>): void {
  const values = [
    thresholds.lapseCount,
    thresholds.recentAttemptCount,
    thresholds.recentIncorrectCount,
    thresholds.recognitionRecallGap,
  ];
  if (
    values.some((value) => !Number.isInteger(value) || value < 0) ||
    thresholds.recentAttemptCount === 0 ||
    thresholds.recentIncorrectCount > thresholds.recentAttemptCount
  ) {
    throw new VocabularyDomainError("INVALID_INPUT", "弱点判定のしきい値が不正です。");
  }
}

function getRecentAttempts(
  attempts: readonly VocabularyAttemptSnapshot[],
  now: number,
  count: number,
): VocabularyAttemptSnapshot[] {
  return attempts
    .map((attempt, index) => {
      const rawTimestamp = parseDate(attempt.attemptedAt, "回答時刻");
      return {
        attempt,
        index,
        rawTimestamp,
        timestamp: Math.min(rawTimestamp, now),
      };
    })
    .sort(
      (left, right) =>
        right.timestamp - left.timestamp ||
        right.rawTimestamp - left.rawTimestamp ||
        left.index - right.index,
    )
    .slice(0, count)
    .map(({ attempt }) => attempt);
}

function getWeakReasons(
  candidate: Readonly<WeakWordCandidate>,
  recentAttempts: readonly VocabularyAttemptSnapshot[],
  thresholds: Readonly<WeakWordThresholds>,
): WeakWordReason[] {
  const reasons: WeakWordReason[] = [];
  if (candidate.reviewState.lapseCount >= thresholds.lapseCount) {
    reasons.push("repeatedLapses");
  }
  if (
    recentAttempts.filter(({ correct }) => !correct).length >=
    thresholds.recentIncorrectCount
  ) {
    reasons.push("recentErrors");
  }
  if (recentAttempts.some(({ responseSpeed }) => responseSpeed === "slow")) {
    reasons.push("slowResponse");
  }
  if (
    recentAttempts.some(
      ({ confidence }) => confidence === "low" || confidence === "none",
    )
  ) {
    reasons.push("lowConfidence");
  }
  if (
    candidate.mastery.recognition - candidate.mastery.recall >=
    thresholds.recognitionRecallGap
  ) {
    reasons.push("recognitionRecallGap");
  }
  if (
    recentAttempts.some(
      ({ confusedWithItemKey }) =>
        confusedWithItemKey !== undefined && confusedWithItemKey.length > 0,
    )
  ) {
    reasons.push("confusionError");
  }
  return reasons;
}

/**
 * 弱点条件を1つ以上満たす単語だけを返す。
 * 同点時はitemKeyで並べるため、入力順に依存しない。
 */
export function extractWeakWords(
  candidates: readonly Readonly<WeakWordCandidate>[],
  now: Date,
  thresholds: Readonly<WeakWordThresholds> = DEFAULT_WEAK_WORD_THRESHOLDS,
): WeakWord[] {
  const nowTimestamp = assertValidDate(now, "現在時刻");
  assertThresholds(thresholds);

  return candidates
    .map((candidate): WeakWord | undefined => {
      assertMatchingLearningState(
        candidate.itemKey,
        candidate.reviewState,
        candidate.mastery,
      );
      const recentAttempts = getRecentAttempts(
        candidate.recentAttempts,
        nowTimestamp,
        thresholds.recentAttemptCount,
      );
      const reasons = getWeakReasons(candidate, recentAttempts, thresholds);
      if (reasons.length === 0) {
        return undefined;
      }
      return {
        itemKey: candidate.itemKey,
        score: reasons.reduce((total, reason) => total + REASON_SCORE[reason], 0),
        reasons,
      };
    })
    .filter((candidate): candidate is WeakWord => candidate !== undefined)
    .sort(
      (left, right) =>
        right.score - left.score || stableTextCompare(left.itemKey, right.itemKey),
    );
}
