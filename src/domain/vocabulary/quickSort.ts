import { VocabularyDomainError } from "./errors";
import type {
  QuickSortAnswer,
  QuickSortNextAction,
  QuickSortResult,
  RankedQuickSortItem,
  VocabularyLevel,
} from "./types";
import { stableTextCompare } from "./validation";

interface QuickSortPolicy {
  priority: number;
  nextAction: QuickSortNextAction;
  recommendedLevel: VocabularyLevel;
}

const QUICK_SORT_POLICY = {
  unknown: {
    priority: 300,
    nextAction: "introduce",
    recommendedLevel: 1,
  },
  unsure: {
    priority: 200,
    nextAction: "confirmSoon",
    recommendedLevel: 2,
  },
  known: {
    priority: 100,
    nextAction: "verifyRecognition",
    recommendedLevel: 1,
  },
} as const satisfies Record<QuickSortResult, QuickSortPolicy>;

/**
 * Quick Sort結果を新規導入キューへ変換する。
 * 既知を選んでもmarksMasteredは必ずfalseで、後続の確認問題を省略しない。
 */
export function rankQuickSortNewQueue(
  answers: readonly Readonly<QuickSortAnswer>[],
): RankedQuickSortItem[] {
  const seenItemKeys = new Set<string>();
  return answers
    .map((answer): RankedQuickSortItem => {
      if (answer.itemKey.length === 0 || seenItemKeys.has(answer.itemKey)) {
        throw new VocabularyDomainError(
          "INVALID_INPUT",
          "Quick SortのitemKeyは空でなく、重複しない値にしてください。",
        );
      }
      seenItemKeys.add(answer.itemKey);
      const policy = (
        QUICK_SORT_POLICY as Readonly<Partial<Record<string, QuickSortPolicy>>>
      )[answer.result];
      if (policy === undefined) {
        throw new VocabularyDomainError(
          "INVALID_INPUT",
          "Quick Sort結果にはunknown、unsure、knownのいずれかを指定してください。",
        );
      }
      return {
        ...answer,
        ...policy,
        marksMastered: false,
      };
    })
    .sort(
      (left, right) =>
        right.priority - left.priority ||
        stableTextCompare(left.itemKey, right.itemKey),
    );
}
