import type { MasteryProfile } from "../mastery";
import type { ReviewState } from "../review";
import { VocabularyDomainError } from "./errors";
import type { VocabularyLevel } from "./types";

const MILLISECONDS_PER_DAY = 86_400_000;

export function assertValidDate(date: Date, label: string): number {
  const timestamp = date.getTime();
  if (!Number.isFinite(timestamp)) {
    throw new VocabularyDomainError(
      "INVALID_DATE",
      `${label}には有効な日時を指定してください。`,
    );
  }
  return timestamp;
}

export function parseDate(value: string, label: string): number {
  return assertValidDate(new Date(value), label);
}

export function assertVocabularyLevel(value: number): asserts value is VocabularyLevel {
  if (!Number.isInteger(value) || value < 1 || value > 7) {
    throw new VocabularyDomainError(
      "INVALID_LEVEL",
      "出題レベルには1から7までの整数を指定してください。",
    );
  }
}

export function assertMatchingLearningState(
  itemKey: string,
  reviewState: Readonly<ReviewState>,
  mastery: Readonly<MasteryProfile>,
): void {
  if (
    itemKey.length === 0 ||
    reviewState.itemKey !== itemKey ||
    mastery.itemKey !== itemKey
  ) {
    throw new VocabularyDomainError(
      "INVALID_STATE",
      "ReviewStateとMasteryProfileのitemKeyが一致していません。",
    );
  }

  const dimensions = [
    mastery.recognition,
    mastery.recall,
    mastery.listening,
    mastery.spelling,
    mastery.context,
  ];
  if (dimensions.some((value) => !Number.isFinite(value) || value < 0 || value > 100)) {
    throw new VocabularyDomainError(
      "INVALID_STATE",
      "MasteryProfileの各習熟度には0から100までの数値が必要です。",
    );
  }
}

export function elapsedDaysClamped(then: number | undefined, now: number): number {
  if (then === undefined) {
    return 0;
  }
  return Math.max(0, (now - then) / MILLISECONDS_PER_DAY);
}

export function stableTextCompare(left: string, right: string): number {
  if (left === right) {
    return 0;
  }
  return left < right ? -1 : 1;
}
