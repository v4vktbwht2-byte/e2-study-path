import { createMasteryProfile, updateMasteryProfile } from "../../domain/mastery";
import type { Attempt, CommitAnswerInput, MasteryProfile } from "../../domain/models";
import {
  classifyResponseSpeed,
  createNewReviewState,
  rankReviewQueue,
  reinsertAgainItem,
  scheduleReview,
  suggestReviewRating,
  type ResponseTiming,
  type ReviewConfidence,
  type ReviewRating,
  type ReviewState,
} from "../../domain/review";
import {
  createVocabularyMasteryAttempt,
  extractWeakWords,
  getVocabularyMasteryMapping,
  judgeVocabularyAnswer,
  selectConfusionComparisonCandidates,
  selectVocabularyLevel,
  type WeakWordCandidate,
} from "../../domain/vocabulary";
import type { VocabularyItem } from "../../infrastructure/content/schemas";
import type {
  VocabularyAnswerObservation,
  VocabularyCollections,
  VocabularyConfusionComparison,
  VocabularyQuestion,
  VocabularyQuestionLevel,
  VocabularyQueueEntry,
  VocabularySessionMode,
  VocabularySessionSummary,
  VocabularyStudyRecord,
  VocabularyStudySnapshot,
} from "./types";

export const VOCABULARY_LEVELS = [1, 2, 3, 4, 5, 6, 7] as const;
const WEAK_FAVORITE_BONUS = 5;

const PART_OF_SPEECH_JA: Readonly<Record<VocabularyItem["partOfSpeech"], string>> = {
  noun: "名詞",
  verb: "動詞",
  adjective: "形容詞",
  adverb: "副詞",
  pronoun: "代名詞",
  preposition: "前置詞",
  conjunction: "接続詞",
  determiner: "限定詞",
  phrase: "熟語",
  other: "その他",
};

export function vocabularyItemKey(itemOrId: VocabularyItem | string): string {
  return `vocab:${typeof itemOrId === "string" ? itemOrId : itemOrId.id}`;
}

export function formatPartOfSpeechJa(
  partOfSpeech: VocabularyItem["partOfSpeech"],
): string {
  return PART_OF_SPEECH_JA[partOfSpeech];
}

export function primaryMeaning(item: VocabularyItem): string {
  return item.meanings[0]?.ja ?? "意味を確認できません";
}

export function buildVocabularyRecords(
  items: readonly VocabularyItem[],
  snapshot: VocabularyStudySnapshot,
): VocabularyStudyRecord[] {
  const reviews = new Map(snapshot.reviewStates.map((state) => [state.itemKey, state]));
  const mastery = new Map(
    snapshot.masteryProfiles.map((profile) => [profile.itemKey, profile]),
  );
  const userStates = new Map(
    snapshot.userStates.map((state) => [state.itemKey, state]),
  );
  const attemptsByItem = new Map<string, Attempt[]>();
  for (const attempt of snapshot.attempts) {
    const attempts = attemptsByItem.get(attempt.itemKey) ?? [];
    attempts.push(attempt);
    attemptsByItem.set(attempt.itemKey, attempts);
  }

  return items.map((item) => {
    const itemKey = vocabularyItemKey(item);
    const attempts = [...(attemptsByItem.get(itemKey) ?? [])]
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, 20);
    return {
      item,
      itemKey,
      reviewState: reviews.get(itemKey),
      mastery: mastery.get(itemKey),
      userState: userStates.get(itemKey),
      recentAttempts: attempts,
    };
  });
}

function responseSpeedForAttempt(attempt: Attempt) {
  const kind =
    attempt.mode === "recognitionChoice"
      ? "recognitionChoice"
      : attempt.mode === "recallChoice" || attempt.mode === "selfRecall"
        ? "recallChoice"
        : attempt.mode === "cloze"
          ? "cloze"
          : attempt.mode === "dictation"
            ? "listening"
            : attempt.mode === "initialLetter" || attempt.mode === "spelling"
              ? "typing"
              : undefined;
  return kind === undefined
    ? undefined
    : classifyResponseSpeed({ kind, responseTimeMs: attempt.responseTimeMs });
}

function toWeakWordCandidate(
  record: VocabularyStudyRecord,
): WeakWordCandidate | undefined {
  if (record.reviewState === undefined || record.mastery === undefined) {
    return undefined;
  }
  return {
    itemKey: record.itemKey,
    reviewState: record.reviewState,
    mastery: record.mastery,
    recentAttempts: record.recentAttempts.map((attempt) => ({
      attemptedAt: attempt.createdAt,
      correct: attempt.correct === true,
      responseSpeed: responseSpeedForAttempt(attempt),
      confidence: attempt.confidence,
      confusedWithItemKey: attempt.confusedWithItemKey,
    })),
  };
}

export function isWeakVocabulary(record: VocabularyStudyRecord, now: Date): boolean {
  const candidate = toWeakWordCandidate(record);
  return candidate !== undefined && extractWeakWords([candidate], now).length > 0;
}

function isSuspended(record: VocabularyStudyRecord): boolean {
  return (
    record.userState?.suspended === true || record.reviewState?.status === "suspended"
  );
}

function rankDueVocabularyRecords(
  records: readonly VocabularyStudyRecord[],
  now: Date,
): VocabularyStudyRecord[] {
  return rankReviewQueue<VocabularyStudyRecord>(
    records.flatMap((record) => {
      if (record.reviewState === undefined || record.reviewState.status === "new") {
        return [];
      }
      const mastery = record.mastery ?? createMasteryProfile(record.itemKey, now);
      const level = selectVocabularyLevel({
        reviewState: record.reviewState,
        mastery,
        now,
      }).level;
      return [
        {
          state: record.reviewState,
          userPinned: record.userState?.favorite === true,
          questionFormat: getVocabularyMasteryMapping(level).exerciseMode,
          data: record,
        },
      ];
    }),
    now,
  ).flatMap(({ data }) => (data === undefined ? [] : [data]));
}

function rankWeakVocabularyRecords(
  records: readonly VocabularyStudyRecord[],
  now: Date,
): VocabularyStudyRecord[] {
  const recordsByItemKey = new Map(
    records.map((record) => [record.itemKey, record] as const),
  );
  const candidates = records.flatMap((record) => {
    const candidate = toWeakWordCandidate(record);
    return candidate === undefined ? [] : [candidate];
  });

  return extractWeakWords(candidates, now)
    .flatMap((weakWord, canonicalIndex) => {
      const record = recordsByItemKey.get(weakWord.itemKey);
      return record === undefined
        ? []
        : [
            {
              record,
              score:
                weakWord.score +
                (record.userState?.favorite === true ? WEAK_FAVORITE_BONUS : 0),
              canonicalIndex,
            },
          ];
    })
    .sort(
      (left, right) =>
        right.score - left.score || left.canonicalIndex - right.canonicalIndex,
    )
    .map(({ record }) => record);
}

export function buildVocabularyCollections(
  items: readonly VocabularyItem[],
  snapshot: VocabularyStudySnapshot,
  now: Date,
): VocabularyCollections {
  const all = buildVocabularyRecords(items, snapshot);
  const active = all.filter((record) => !isSuspended(record));
  return {
    all,
    newItems: active.filter(
      (record) =>
        record.reviewState === undefined || record.reviewState.status === "new",
    ),
    due: rankDueVocabularyRecords(active, now),
    weak: rankWeakVocabularyRecords(active, now),
  };
}

function masteryValue(
  record: VocabularyStudyRecord,
  dimension: keyof Omit<MasteryProfile, "itemKey" | "lastUpdatedAt">,
): number {
  return record.mastery?.[dimension] ?? 0;
}

export function selectRecordsForMode(
  collections: VocabularyCollections,
  mode: VocabularySessionMode,
  limit: number,
): VocabularyStudyRecord[] {
  const safeLimit = Math.max(1, Math.floor(limit));
  let records: readonly VocabularyStudyRecord[];
  switch (mode) {
    case "new":
      records = collections.newItems;
      break;
    case "due":
      records = collections.due;
      break;
    case "weak":
      records = collections.weak;
      break;
    case "listening":
      records = [...collections.all]
        .filter((record) => !isSuspended(record))
        .sort(
          (left, right) =>
            masteryValue(left, "listening") - masteryValue(right, "listening"),
        );
      break;
    case "spelling":
      records = [...collections.all]
        .filter((record) => !isSuspended(record))
        .sort(
          (left, right) =>
            masteryValue(left, "spelling") - masteryValue(right, "spelling"),
        );
      break;
    case "context":
      records = [...collections.all]
        .filter((record) => !isSuspended(record))
        .sort(
          (left, right) =>
            masteryValue(left, "context") - masteryValue(right, "context"),
        );
      break;
    case "quickSort":
      records = collections.all.filter((record) => !isSuspended(record));
      break;
  }
  return [...records].slice(0, safeLimit);
}

export function selectVocabularyQuestionLevel(
  record: VocabularyStudyRecord,
  mode: VocabularySessionMode,
  now: Date,
  manualLevel?: VocabularyQuestionLevel,
): VocabularyQuestionLevel {
  const reviewState = record.reviewState ?? createNewReviewState(record.itemKey, now);
  const mastery = record.mastery ?? createMasteryProfile(record.itemKey, now);
  const modeLevel =
    mode === "quickSort"
      ? 1
      : mode === "listening"
        ? 7
        : mode === "spelling"
          ? mastery.spelling < 40
            ? 4
            : 5
          : mode === "context"
            ? 6
            : undefined;
  return selectVocabularyLevel({
    reviewState,
    mastery,
    now,
    manualLevel: manualLevel ?? modeLevel,
  }).level;
}

function hash(value: string): number {
  let result = 0;
  for (const character of value) {
    result = (result * 31 + character.charCodeAt(0)) >>> 0;
  }
  return result;
}

interface VocabularyChoice {
  value: string;
  itemKey: string;
}

function prioritizeRecordedConfusion(
  record: VocabularyStudyRecord,
  distractors: readonly VocabularyChoice[],
): VocabularyChoice[] {
  const confusedWithItemKey = record.recentAttempts.find(
    (attempt) => attempt.confusedWithItemKey !== undefined,
  )?.confusedWithItemKey;
  if (confusedWithItemKey === undefined) {
    return [...distractors];
  }
  return [
    ...distractors.filter((choice) => choice.itemKey === confusedWithItemKey),
    ...distractors.filter((choice) => choice.itemKey !== confusedWithItemKey),
  ];
}

function choiceSet(
  correct: VocabularyChoice,
  distractors: readonly VocabularyChoice[],
  seed: string,
): { choices: string[]; choiceItemKeys: string[]; answer: number } {
  const uniqueByValue = new Map<string, VocabularyChoice>();
  for (const choice of [correct, ...distractors]) {
    if (!uniqueByValue.has(choice.value)) {
      uniqueByValue.set(choice.value, choice);
    }
  }
  const values = [...uniqueByValue.values()].slice(0, 4);
  const offset = values.length === 0 ? 0 : hash(seed) % values.length;
  const ordered = [...values.slice(offset), ...values.slice(0, offset)];
  return {
    choices: ordered.map((choice) => choice.value),
    choiceItemKeys: ordered.map((choice) => choice.itemKey),
    answer: ordered.findIndex((choice) => choice.itemKey === correct.itemKey),
  };
}

function clozeSentence(item: VocabularyItem): string {
  const example = item.exampleSentences[0]?.en ?? `${item.headword} is useful.`;
  const escaped = item.headword.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const replaced = example.replace(new RegExp(`\\b${escaped}\\b`, "iu"), "_____");
  return replaced === example ? `_____ : ${example}` : replaced;
}

export function buildVocabularyQuestion(
  record: VocabularyStudyRecord,
  pool: readonly VocabularyStudyRecord[],
  level: VocabularyQuestionLevel,
): VocabularyQuestion {
  const item = record.item;
  const masteryMapping = getVocabularyMasteryMapping(level);
  const meaning = primaryMeaning(item);
  const meaningDistractors = prioritizeRecordedConfusion(
    record,
    pool
      .filter((candidate) => candidate.itemKey !== record.itemKey)
      .map((candidate) => ({
        value: primaryMeaning(candidate.item),
        itemKey: candidate.itemKey,
      })),
  );
  const headwordDistractors = prioritizeRecordedConfusion(
    record,
    pool
      .filter((candidate) => candidate.itemKey !== record.itemKey)
      .map((candidate) => ({
        value: candidate.item.headword,
        itemKey: candidate.itemKey,
      })),
  );
  const base = {
    id: `vocabulary-question:${item.id}:level-${level}`,
    itemKey: record.itemKey,
    level,
    choices: [] as readonly string[],
  };

  switch (level) {
    case 1: {
      const choice = choiceSet(
        { value: meaning, itemKey: record.itemKey },
        meaningDistractors,
        `${item.id}:1`,
      );
      return {
        ...base,
        kind: "recognitionChoice",
        prompt: item.headword,
        instructionsJa: "英単語に合う意味を選んでください。",
        answer: choice.answer,
        choices: choice.choices,
        choiceItemKeys: choice.choiceItemKeys,
        hintJa: item.exampleSentences[0]?.en,
        targetDimensions: masteryMapping.targetDimensions,
      };
    }
    case 2:
      return {
        ...base,
        kind: "selfRecall",
        prompt: item.headword,
        instructionsJa: "意味を頭の中で思い出してから、答えを表示してください。",
        answer: true,
        hintJa: item.headword.slice(0, 1),
        targetDimensions: masteryMapping.targetDimensions,
      };
    case 3: {
      const choice = choiceSet(
        { value: item.headword, itemKey: record.itemKey },
        headwordDistractors,
        `${item.id}:3`,
      );
      return {
        ...base,
        kind: "recallChoice",
        prompt: meaning,
        instructionsJa: "意味に合う英単語を選んでください。",
        answer: choice.answer,
        choices: choice.choices,
        choiceItemKeys: choice.choiceItemKeys,
        hintJa: item.headword.slice(0, 1),
        targetDimensions: masteryMapping.targetDimensions,
      };
    }
    case 4:
      return {
        ...base,
        kind: "initialLetter",
        prompt: meaning,
        instructionsJa: `頭文字「${item.headword.slice(0, 1)}」から入力してください。`,
        answer: item.headword,
        hintJa: `${item.headword.length}文字`,
        targetDimensions: masteryMapping.targetDimensions,
      };
    case 5:
      return {
        ...base,
        kind: "spelling",
        prompt: meaning,
        instructionsJa: "英単語を入力してください。",
        answer: item.headword,
        hintJa: `${item.headword.length}文字`,
        targetDimensions: masteryMapping.targetDimensions,
      };
    case 6:
      return {
        ...base,
        kind: "cloze",
        prompt: clozeSentence(item),
        instructionsJa: "空欄に入る英単語を入力してください。",
        answer: item.headword,
        passage: item.exampleSentences[0]?.ja,
        hintJa: meaning,
        targetDimensions: masteryMapping.targetDimensions,
      };
    case 7:
      return {
        ...base,
        kind: "dictation",
        prompt: "聞こえた英単語を入力してください。",
        instructionsJa: "音声を聞き、スペルを入力してください。",
        answer: item.headword,
        speechText: item.headword,
        hintJa: meaning,
        targetDimensions: masteryMapping.targetDimensions,
      };
  }
}

export function selectVocabularyConfusionComparisons(
  target: VocabularyStudyRecord,
  pool: readonly VocabularyStudyRecord[],
  confusedWithItemKey?: string,
): VocabularyConfusionComparison[] {
  const recordsByItemKey = new Map(
    pool.map((record) => [record.itemKey, record] as const),
  );
  return selectConfusionComparisonCandidates({
    target: {
      itemKey: target.itemKey,
      headword: target.item.headword,
      confusionGroupIds: target.item.confusionGroupIds,
    },
    candidates: pool.map((record) => ({
      itemKey: record.itemKey,
      headword: record.item.headword,
      confusionGroupIds: record.item.confusionGroupIds,
    })),
    confusedWithItemKey,
  }).flatMap((candidate) => {
    const record = recordsByItemKey.get(candidate.itemKey);
    if (record === undefined) {
      return [];
    }
    const example = record.item.exampleSentences[0];
    return [
      {
        ...candidate,
        meaningJa: primaryMeaning(record.item),
        ...(example === undefined
          ? {}
          : {
              exampleEn: example.en,
              exampleJa: example.ja,
            }),
      },
    ];
  });
}

export function gradeVocabularyQuestion(
  question: VocabularyQuestion,
  response: unknown,
): boolean {
  if (question.kind === "recognitionChoice" || question.kind === "recallChoice") {
    return typeof response === "number" && response === question.answer;
  }
  if (question.kind === "selfRecall") {
    return response === true;
  }
  return typeof response === "string" && typeof question.answer === "string"
    ? judgeVocabularyAnswer({
        answer: response,
        acceptedAnswers: [question.answer],
        mode: "strict",
      }).correct
    : false;
}

export function responseTimingForQuestion(
  question: VocabularyQuestion,
  responseTimeMs: number,
): ResponseTiming {
  const kind = getVocabularyMasteryMapping(question.level).responseTimingKind;
  return { kind, responseTimeMs };
}

export function suggestVocabularyRating(input: {
  question: VocabularyQuestion;
  correct: boolean;
  confidence: ReviewConfidence;
  hintCount: number;
  responseTimeMs: number;
}): ReviewRating {
  return suggestReviewRating({
    correct: input.correct,
    confidence: input.confidence,
    hintCount: input.hintCount,
    responseTiming: responseTimingForQuestion(input.question, input.responseTimeMs),
    speedAdjustmentEnabled: true,
  });
}

export interface PrepareVocabularyCommitInput {
  record: VocabularyStudyRecord;
  question: VocabularyQuestion;
  response: unknown;
  correct: boolean;
  confidence: ReviewConfidence;
  hintCount: number;
  responseTimeMs: number;
  suggestedRating: ReviewRating;
  finalRating: ReviewRating;
  sessionId: string;
  attemptId: string;
  studyDate: string;
  now: Date;
  correctAfterAgain?: boolean;
  confusedWithItemKey?: string;
}

export function prepareVocabularyCommit(
  input: PrepareVocabularyCommitInput,
): CommitAnswerInput {
  const reviewState =
    input.record.reviewState ?? createNewReviewState(input.record.itemKey, input.now);
  const nextReviewState = scheduleReview({
    state: reviewState,
    rating: input.finalRating,
    now: input.now,
    responseTimeMs: input.responseTimeMs,
    responseTiming: responseTimingForQuestion(input.question, input.responseTimeMs),
    confidence: input.confidence,
    hintCount: input.hintCount,
    speedAdjustmentEnabled: true,
  });
  const mastery =
    input.record.mastery ?? createMasteryProfile(input.record.itemKey, input.now);
  const nextMastery = updateMasteryProfile({
    profile: mastery,
    attempt: createVocabularyMasteryAttempt(input.question.level, {
      correct: input.correct,
      hintCount: input.hintCount,
      confidence: input.confidence,
      responseTiming: responseTimingForQuestion(input.question, input.responseTimeMs),
      speedAdjustmentEnabled: true,
      correctAfterAgain: input.correctAfterAgain,
    }),
    now: input.now,
  }).profile;
  const confusedWithItemKey =
    !input.correct &&
    input.confusedWithItemKey !== undefined &&
    input.confusedWithItemKey.length > 0 &&
    input.confusedWithItemKey !== input.record.itemKey
      ? input.confusedWithItemKey
      : undefined;

  return {
    attempt: {
      id: input.attemptId,
      itemKey: input.record.itemKey,
      exerciseId: input.question.id,
      sessionId: input.sessionId,
      createdAt: input.now.toISOString(),
      studyDate: input.studyDate,
      mode: input.question.kind,
      response: input.response,
      correct: input.correct,
      score: input.correct ? 1 : 0,
      responseTimeMs: input.responseTimeMs,
      hintCount: input.hintCount,
      confidence: input.confidence,
      suggestedRating: input.suggestedRating,
      finalRating: input.finalRating,
      ...(confusedWithItemKey === undefined ? {} : { confusedWithItemKey }),
    },
    reviewState: nextReviewState,
    mastery: nextMastery,
    sessionId: input.sessionId,
  };
}

export function reinsertAgainWithMinimumSpacing(
  remaining: readonly VocabularyQueueEntry[],
  againItem: VocabularyQueueEntry,
  completed: readonly VocabularyQueueEntry[],
): VocabularyQueueEntry[] {
  const result = reinsertAgainItem(remaining, {
    ...againItem,
    repeated: true,
  });
  if (result.additionalQuestionsNeeded === 0) {
    return result.queue;
  }

  const queueWithoutAgain = result.queue.slice(0, -1);
  const candidates = completed.filter(
    (candidate) => candidate.itemKey !== againItem.itemKey,
  );
  const fillers: VocabularyQueueEntry[] = [];
  for (
    let index = 0;
    index < result.additionalQuestionsNeeded && candidates.length > 0;
    index += 1
  ) {
    const candidate = candidates[index % candidates.length];
    if (candidate !== undefined) {
      fillers.push({ ...candidate, repeated: true });
    }
  }
  return [...queueWithoutAgain, ...fillers, { ...againItem, repeated: true }];
}

export function reinsertNewConfirmationWithMinimumSpacing(
  remaining: readonly VocabularyQueueEntry[],
  item: VocabularyQueueEntry,
  completed: readonly VocabularyQueueEntry[],
): VocabularyQueueEntry[] {
  return reinsertAgainWithMinimumSpacing(
    remaining,
    {
      ...item,
      level: 2,
      repeated: true,
    },
    completed,
  );
}

export function summarizeVocabularySession(
  observations: readonly VocabularyAnswerObservation[],
  finalReviewStates: readonly ReviewState[],
  now: Date,
): VocabularySessionSummary {
  const observationsByItem = new Map<string, VocabularyAnswerObservation[]>();
  for (const observation of observations) {
    const values = observationsByItem.get(observation.question.itemKey) ?? [];
    values.push(observation);
    observationsByItem.set(observation.question.itemKey, values);
  }
  let firstTrySuccessCount = 0;
  let relearnedCount = 0;
  let uncertainCount = 0;
  for (const values of observationsByItem.values()) {
    if (values[0]?.correct === true) {
      firstTrySuccessCount += 1;
    }
    if (values.some((value) => !value.correct) && values.at(-1)?.correct === true) {
      relearnedCount += 1;
    }
    const lastRating = values.at(-1)?.finalRating;
    if (lastRating === "again" || lastRating === "hard") {
      uncertainCount += 1;
    }
  }
  const today = now.toISOString().slice(0, 10);
  const nextDueTodayCount = finalReviewStates.filter(
    (state) => state.dueAt.slice(0, 10) === today,
  ).length;

  return {
    studiedCount: observationsByItem.size,
    answerCount: observations.length,
    firstTrySuccessCount,
    relearnedCount,
    uncertainCount,
    nextDueTodayCount,
    nextDueLaterCount: Math.max(0, finalReviewStates.length - nextDueTodayCount),
  };
}
