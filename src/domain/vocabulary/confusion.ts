import { VocabularyDomainError } from "./errors";
import type {
  ConfusionComparisonCandidate,
  SelectConfusionCandidatesInput,
} from "./types";
import { stableTextCompare } from "./validation";

export function selectConfusionComparisonCandidates(
  input: SelectConfusionCandidatesInput,
): ConfusionComparisonCandidate[] {
  const limit = input.limit ?? 3;
  if (!Number.isInteger(limit) || limit < 0) {
    throw new VocabularyDomainError(
      "INVALID_INPUT",
      "混同語候補の上限には0以上の整数を指定してください。",
    );
  }

  const targetGroups = new Set(input.target.confusionGroupIds);
  const seenItemKeys = new Set<string>();
  return input.candidates
    .filter(({ itemKey }) => itemKey !== input.target.itemKey)
    .map((candidate): ConfusionComparisonCandidate | undefined => {
      if (candidate.itemKey.length === 0 || seenItemKeys.has(candidate.itemKey)) {
        throw new VocabularyDomainError(
          "INVALID_INPUT",
          "混同語候補のitemKeyは空でなく、重複しない値にしてください。",
        );
      }
      seenItemKeys.add(candidate.itemKey);
      const sharedGroupIds = [...new Set(candidate.confusionGroupIds)]
        .filter((groupId) => targetGroups.has(groupId))
        .sort(stableTextCompare);
      if (sharedGroupIds.length === 0) {
        return undefined;
      }
      return {
        itemKey: candidate.itemKey,
        headword: candidate.headword,
        sharedGroupIds,
        isRecordedConfusion: candidate.itemKey === input.confusedWithItemKey,
      };
    })
    .filter(
      (candidate): candidate is ConfusionComparisonCandidate => candidate !== undefined,
    )
    .sort(
      (left, right) =>
        Number(right.isRecordedConfusion) - Number(left.isRecordedConfusion) ||
        right.sharedGroupIds.length - left.sharedGroupIds.length ||
        stableTextCompare(left.itemKey, right.itemKey),
    )
    .slice(0, limit);
}
