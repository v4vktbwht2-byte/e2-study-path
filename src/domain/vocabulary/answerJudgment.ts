import { VocabularyDomainError } from "./errors";
import type { JudgeVocabularyAnswerInput, VocabularyAnswerJudgment } from "./types";
import { stableTextCompare } from "./validation";

const EDGE_PUNCTUATION =
  /^[\s.,!?;:()[\]{}"“”„«»。、，！？；：（）［］｛｝「」『』【】]+|[\s.,!?;:()[\]{}"“”„«»。、，！？；：（）［］｛｝「」『』【】]+$/gu;

/**
 * 大文字小文字、全角英数、前後空白、表記揺れする引用符・ダッシュ、
 * 答えの外側に付いた句読点を正規化する。
 */
export function normalizeVocabularyInput(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[‘’]/gu, "'")
    .replace(/[‐‑‒–—―]/gu, "-")
    .replace(EDGE_PUNCTUATION, "")
    .trim()
    .replace(/\s+/gu, " ")
    .toLocaleLowerCase("en-US");
}

function editDistance(left: string, right: string): number {
  const leftCharacters = Array.from(left);
  const rightCharacters = Array.from(right);
  let previous = rightCharacters.map((_, index) => index + 1);
  previous.unshift(0);

  for (let leftIndex = 1; leftIndex <= leftCharacters.length; leftIndex += 1) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= rightCharacters.length; rightIndex += 1) {
      const substitutionCost =
        leftCharacters[leftIndex - 1] === rightCharacters[rightIndex - 1] ? 0 : 1;
      current[rightIndex] = Math.min(
        (previous[rightIndex] ?? Number.POSITIVE_INFINITY) + 1,
        (current[rightIndex - 1] ?? Number.POSITIVE_INFINITY) + 1,
        (previous[rightIndex - 1] ?? Number.POSITIVE_INFINITY) + substitutionCost,
      );
    }
    previous = current;
  }

  return previous[rightCharacters.length] ?? leftCharacters.length;
}

export function judgeVocabularyAnswer(
  input: JudgeVocabularyAnswerInput,
): VocabularyAnswerJudgment {
  if (input.mode !== "strict" && input.mode !== "practice") {
    throw new VocabularyDomainError(
      "INVALID_INPUT",
      "判定モードにはstrictまたはpracticeを指定してください。",
    );
  }
  if (input.acceptedAnswers.length === 0) {
    throw new VocabularyDomainError(
      "INVALID_INPUT",
      "正答候補を1件以上指定してください。",
    );
  }
  if (
    input.practiceMaxEditDistance !== undefined &&
    (!Number.isInteger(input.practiceMaxEditDistance) ||
      input.practiceMaxEditDistance < 0 ||
      input.practiceMaxEditDistance > 2)
  ) {
    throw new VocabularyDomainError(
      "INVALID_INPUT",
      "練習モードの許容編集距離には0から2までの整数を指定してください。",
    );
  }

  const normalizedAnswer = normalizeVocabularyInput(input.answer);
  const candidates = input.acceptedAnswers.map((answer) => ({
    original: answer,
    normalized: normalizeVocabularyInput(answer),
  }));
  if (candidates.some(({ normalized }) => normalized.length === 0)) {
    throw new VocabularyDomainError("INVALID_INPUT", "空の正答候補は指定できません。");
  }

  const exactMatch = candidates.find(
    ({ normalized }) => normalized === normalizedAnswer,
  );
  if (exactMatch !== undefined) {
    return {
      correct: true,
      exact: true,
      outcome: "exact",
      normalizedAnswer,
      matchedAnswer: exactMatch.original,
      editDistance: 0,
    };
  }

  if (input.mode === "strict" || normalizedAnswer.length === 0) {
    return {
      correct: false,
      exact: false,
      outcome: "incorrect",
      normalizedAnswer,
    };
  }

  const nearest = candidates
    .map((candidate) => ({
      ...candidate,
      distance: editDistance(normalizedAnswer, candidate.normalized),
    }))
    .sort(
      (left, right) =>
        left.distance - right.distance ||
        left.normalized.length - right.normalized.length ||
        stableTextCompare(left.normalized, right.normalized),
    )[0];
  const defaultTolerance =
    nearest !== undefined && Array.from(nearest.normalized).length >= 4 ? 1 : 0;
  const tolerance = input.practiceMaxEditDistance ?? defaultTolerance;

  if (nearest !== undefined && nearest.distance <= tolerance) {
    return {
      correct: true,
      exact: false,
      outcome: "tolerated",
      normalizedAnswer,
      matchedAnswer: nearest.original,
      editDistance: nearest.distance,
    };
  }

  return {
    correct: false,
    exact: false,
    outcome: "incorrect",
    normalizedAnswer,
    ...(nearest === undefined ? {} : { editDistance: nearest.distance }),
  };
}
