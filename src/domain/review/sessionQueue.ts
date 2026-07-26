import { AGAIN_SESSION_MINIMUM_QUESTIONS } from "./constants";
import { ReviewDomainError } from "./errors";
import type { AgainReinsertionResult, SessionQueueItem } from "./types";

/**
 * Againとなった項目を残りキューの末尾へ1件だけ再挿入する。
 *
 * 残りが3問未満なら架空の問題を生成せず、必要な追加問題数を返す。
 * セッション組み立て側は別項目を補充してから再出題できる。
 */
export function reinsertAgainItem<T extends SessionQueueItem>(
  remainingQueue: readonly T[],
  againItem: T,
  minimumQuestionsBetween = AGAIN_SESSION_MINIMUM_QUESTIONS,
): AgainReinsertionResult<T> {
  if (!Number.isInteger(minimumQuestionsBetween) || minimumQuestionsBetween < 0) {
    throw new ReviewDomainError(
      "INVALID_NUMBER",
      "再出題間隔には0以上の整数を指定してください。",
    );
  }

  const withoutDuplicate = remainingQueue.filter(
    ({ itemKey }) => itemKey !== againItem.itemKey,
  );
  const insertionIndex = withoutDuplicate.length;
  const questionsBetween = insertionIndex;
  const additionalQuestionsNeeded = Math.max(
    0,
    minimumQuestionsBetween - questionsBetween,
  );

  return {
    queue: [...withoutDuplicate, againItem],
    insertionIndex,
    questionsBetween,
    minimumSpacingMet: additionalQuestionsNeeded === 0,
    additionalQuestionsNeeded,
  };
}
