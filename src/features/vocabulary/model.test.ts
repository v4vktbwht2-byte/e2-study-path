import { createMasteryProfile } from "../../domain/mastery";
import type { Attempt } from "../../domain/models";
import { createNewReviewState } from "../../domain/review";
import type { VocabularyItem } from "../../infrastructure/content/schemas";
import {
  buildVocabularyCollections,
  buildVocabularyQuestion,
  buildVocabularyRecords,
  gradeVocabularyQuestion,
  prepareVocabularyCommit,
  reinsertAgainWithMinimumSpacing,
  reinsertNewConfirmationWithMinimumSpacing,
  selectVocabularyConfusionComparisons,
  selectVocabularyQuestionLevel,
  vocabularyItemKey,
  VOCABULARY_LEVELS,
} from "./model";
import type {
  VocabularyQueueEntry,
  VocabularyStudyRecord,
  VocabularyStudySnapshot,
} from "./types";

const NOW = new Date("2026-07-27T00:00:00.000Z");

function item(
  id: string,
  headword: string,
  meaning: string,
  example = `I use ${headword} every day.`,
): VocabularyItem {
  return {
    id,
    schemaVersion: "1.0.0",
    contentRevision: 1,
    stage: 1,
    headword,
    lemma: headword,
    partOfSpeech: "noun",
    meanings: [{ id: "main", ja: meaning }],
    exampleSentences: [
      { id: "example", en: example, ja: `${meaning}の例文です。`, stage: 1 },
    ],
    collocations: [],
    synonyms: [],
    antonyms: [],
    confusionGroupIds: [],
    tags: ["test"],
    source: { type: "original", author: "テスト" },
  };
}

const ITEMS = [
  item("word-hello", "hello", "こんにちは", "I say hello every morning."),
  item("word-book", "book", "本"),
  item("word-water", "water", "水"),
  item("word-school", "school", "学校"),
];

function snapshot(): VocabularyStudySnapshot {
  return {
    reviewStates: [],
    masteryProfiles: [],
    userStates: [],
    attempts: [],
  };
}

function records(): VocabularyStudyRecord[] {
  return buildVocabularyRecords(ITEMS, snapshot());
}

function queueEntry(
  record: VocabularyStudyRecord,
  repeated = false,
): VocabularyQueueEntry {
  return {
    itemKey: record.itemKey,
    record,
    level: 1,
    repeated,
  };
}

function attempt(
  id: string,
  itemKey: string,
  overrides: Partial<Attempt> = {},
): Attempt {
  return {
    id,
    itemKey,
    sessionId: "session-1",
    createdAt: NOW.toISOString(),
    studyDate: "2026-07-27",
    mode: "recognitionChoice",
    response: 0,
    correct: true,
    score: 1,
    responseTimeMs: 2_000,
    hintCount: 0,
    confidence: "medium",
    finalRating: "good",
    ...overrides,
  };
}

describe("単語featureモデル", () => {
  it("Level 1〜7をそれぞれ実際に回答できる形式へ組み立てる", () => {
    const pool = records();
    const target = pool[0];
    expect(target).toBeDefined();

    const questions = VOCABULARY_LEVELS.map((level) =>
      buildVocabularyQuestion(target!, pool, level),
    );

    expect(questions.map((question) => question.kind)).toEqual([
      "recognitionChoice",
      "selfRecall",
      "recallChoice",
      "initialLetter",
      "spelling",
      "cloze",
      "dictation",
    ]);
    for (const question of questions) {
      const response =
        typeof question.answer === "number"
          ? question.answer
          : question.kind === "selfRecall"
            ? true
            : " HELLO! ";
      expect(gradeVocabularyQuestion(question, response)).toBe(true);
    }
    expect(questions[5]?.prompt).toContain("_____");
    expect(questions[6]?.speechText).toBe("hello");
  });

  it("全語poolから四択を作りcanonical混同語候補へ意味と例文を結合する", () => {
    const targetItem = {
      ...ITEMS[0]!,
      confusionGroupIds: ["greeting-pair"],
    };
    const confusedItem = {
      ...ITEMS[1]!,
      confusionGroupIds: ["greeting-pair"],
    };
    const pool = buildVocabularyRecords(
      [targetItem, confusedItem, ITEMS[2]!, ITEMS[3]!],
      snapshot(),
    );
    const target = pool[0]!;
    const confused = pool[1]!;
    const question = buildVocabularyQuestion(target, pool, 1);

    expect(question.choices).toHaveLength(4);
    expect(question.choiceItemKeys).toHaveLength(4);
    const comparisons = selectVocabularyConfusionComparisons(
      target,
      pool,
      confused.itemKey,
    );
    expect(comparisons).toEqual([
      {
        itemKey: confused.itemKey,
        headword: "book",
        meaningJa: "本",
        exampleEn: "I use book every day.",
        exampleJa: "本の例文です。",
        sharedGroupIds: ["greeting-pair"],
        isRecordedConfusion: true,
      },
    ]);
  });

  it("canonical domainへ委譲し自動Levelと手動Levelを選ぶ", () => {
    const target = records()[0];
    expect(target).toBeDefined();
    expect(selectVocabularyQuestionLevel(target!, "due", NOW)).toBe(1);
    expect(selectVocabularyQuestionLevel(target!, "due", NOW, 7)).toBe(7);
  });

  it("canonical弱点抽出でlapseが多い単語をWeakへ入れる", () => {
    const target = ITEMS[0];
    expect(target).toBeDefined();
    const itemKey = vocabularyItemKey(target!);
    const review = {
      ...createNewReviewState(itemKey, NOW),
      status: "review" as const,
      lapseCount: 3,
      intervalDays: 2,
    };
    const collections = buildVocabularyCollections(
      ITEMS,
      {
        ...snapshot(),
        reviewStates: [review],
        masteryProfiles: [createMasteryProfile(itemKey, NOW)],
      },
      NOW,
    );

    expect(collections.weak.map((record) => record.itemKey)).toContain(itemKey);
  });

  it("Dueをcanonical優先度で並べ、同条件ではお気に入りを先にする", () => {
    const [first, favorite] = ITEMS;
    expect(first && favorite).toBeDefined();
    const firstKey = vocabularyItemKey(first!);
    const favoriteKey = vocabularyItemKey(favorite!);
    const reviewState = (itemKey: string) => ({
      ...createNewReviewState(itemKey, NOW),
      status: "review" as const,
      intervalDays: 10,
      dueAt: "2026-07-26T00:00:00.000Z",
      lastReviewedAt: "2026-07-17T00:00:00.000Z",
      reviewCount: 1,
    });

    const collections = buildVocabularyCollections(
      [first!, favorite!],
      {
        ...snapshot(),
        reviewStates: [reviewState(firstKey), reviewState(favoriteKey)],
        masteryProfiles: [
          createMasteryProfile(firstKey, NOW),
          createMasteryProfile(favoriteKey, NOW),
        ],
        userStates: [
          {
            itemKey: favoriteKey,
            favorite: true,
            note: "",
            suspended: false,
            updatedAt: NOW.toISOString(),
          },
        ],
      },
      NOW,
    );

    expect(collections.due.map((record) => record.itemKey)).toEqual([
      favoriteKey,
      firstKey,
    ]);
  });

  it("Weakをcanonical score順にし、同程度ならお気に入りを軽く優先する", () => {
    const [highScore, favorite, regular] = ITEMS;
    expect(highScore && favorite && regular).toBeDefined();
    const highScoreKey = vocabularyItemKey(highScore!);
    const favoriteKey = vocabularyItemKey(favorite!);
    const regularKey = vocabularyItemKey(regular!);
    const reviewState = (itemKey: string, lapseCount = 0) => ({
      ...createNewReviewState(itemKey, NOW),
      status: "review" as const,
      intervalDays: 2,
      lapseCount,
    });

    const collections = buildVocabularyCollections(
      [highScore!, favorite!, regular!],
      {
        ...snapshot(),
        reviewStates: [
          reviewState(highScoreKey, 3),
          reviewState(favoriteKey),
          reviewState(regularKey),
        ],
        masteryProfiles: [
          createMasteryProfile(highScoreKey, NOW),
          createMasteryProfile(favoriteKey, NOW),
          createMasteryProfile(regularKey, NOW),
        ],
        userStates: [
          {
            itemKey: favoriteKey,
            favorite: true,
            note: "",
            suspended: false,
            updatedAt: NOW.toISOString(),
          },
        ],
        attempts: [
          attempt("attempt-favorite", favoriteKey, { responseTimeMs: 9_000 }),
          attempt("attempt-regular", regularKey, { responseTimeMs: 9_000 }),
        ],
      },
      NOW,
    );

    expect(collections.weak.map((record) => record.itemKey)).toEqual([
      highScoreKey,
      favoriteKey,
      regularKey,
    ]);
  });

  it("混同語の誤選択をAttemptとWeakへ接続する", () => {
    const targetItem = {
      ...ITEMS[0]!,
      confusionGroupIds: ["greeting-pair"],
    };
    const confusedItem = {
      ...ITEMS[1]!,
      confusionGroupIds: ["greeting-pair"],
    };
    const pool = buildVocabularyRecords(
      [targetItem, confusedItem, ITEMS[2]!, ITEMS[3]!],
      snapshot(),
    );
    const target = pool[0]!;
    const confused = pool[1]!;
    const question = buildVocabularyQuestion(target, pool, 1);
    const commit = prepareVocabularyCommit({
      record: target,
      question,
      response: question.choiceItemKeys?.indexOf(confused.itemKey),
      correct: false,
      confidence: "medium",
      hintCount: 0,
      responseTimeMs: 3_000,
      suggestedRating: "again",
      finalRating: "again",
      sessionId: "session-1",
      attemptId: "attempt-confusion",
      studyDate: "2026-07-27",
      now: NOW,
      confusedWithItemKey: confused.itemKey,
    });

    expect(commit.attempt.confusedWithItemKey).toBe(confused.itemKey);
    const collections = buildVocabularyCollections(
      [targetItem, confusedItem],
      {
        ...snapshot(),
        reviewStates: [commit.reviewState],
        masteryProfiles: [commit.mastery],
        attempts: [commit.attempt],
      },
      NOW,
    );
    expect(collections.weak.map((record) => record.itemKey)).toContain(target.itemKey);
  });

  it("次回四択へ直近の混同語を優先して含める", () => {
    const targetItem = {
      ...ITEMS[0]!,
      confusionGroupIds: ["greeting-pair"],
    };
    const confusedItem = {
      ...ITEMS[1]!,
      confusionGroupIds: ["greeting-pair"],
    };
    const extraItems = [
      item("word-music", "music", "音楽"),
      item("word-station", "station", "駅"),
      item("word-window", "window", "窓"),
      item("word-garden", "garden", "庭"),
    ];
    const targetKey = vocabularyItemKey(targetItem);
    const confusedKey = vocabularyItemKey(confusedItem);
    const pool = buildVocabularyRecords([targetItem, ...extraItems, confusedItem], {
      ...snapshot(),
      attempts: [
        attempt("attempt-confusion", targetKey, {
          correct: false,
          score: 0,
          finalRating: "again",
          confusedWithItemKey: confusedKey,
        }),
      ],
    });
    const target = pool[0]!;

    expect(buildVocabularyQuestion(target, pool, 1).choiceItemKeys).toContain(
      confusedKey,
    );
    expect(buildVocabularyQuestion(target, pool, 3).choiceItemKeys).toContain(
      confusedKey,
    );
  });

  it("Level 1四択ではspellingを上げずrecognitionだけを更新する", () => {
    const target = records()[0];
    expect(target).toBeDefined();
    const itemKey = target!.itemKey;
    const record: VocabularyStudyRecord = {
      ...target!,
      reviewState: createNewReviewState(itemKey, NOW),
      mastery: {
        ...createMasteryProfile(itemKey, NOW),
        spelling: 33,
      },
    };
    const question = buildVocabularyQuestion(record, records(), 1);
    const input = prepareVocabularyCommit({
      record,
      question,
      response: question.answer,
      correct: true,
      confidence: "medium",
      hintCount: 0,
      responseTimeMs: 3000,
      suggestedRating: "good",
      finalRating: "good",
      sessionId: "session-1",
      attemptId: "attempt-1",
      studyDate: "2026-07-27",
      now: NOW,
    });

    expect(input.mastery.recognition).toBeGreaterThan(0);
    expect(input.mastery.spelling).toBe(33);
    expect(input.reviewState.status).toBe("learning");
  });

  it("Againを最低3問後へ再挿入し、足りない分は別項目で補う", () => {
    const pool = records();
    const [again, second, third, fourth] = pool;
    expect(again && second && third && fourth).toBeDefined();

    const queue = reinsertAgainWithMinimumSpacing(
      [queueEntry(second!), queueEntry(third!)],
      queueEntry(again!),
      [queueEntry(fourth!)],
    );

    expect(queue.map((entry) => entry.itemKey)).toEqual([
      second!.itemKey,
      third!.itemKey,
      fourth!.itemKey,
      again!.itemKey,
    ]);
    expect(queue.at(-1)?.repeated).toBe(true);
  });

  it("新規語のLevel 2確認を最低3問後へ再挿入する", () => {
    const pool = records();
    const [target, second, third, fourth] = pool;
    expect(target && second && third && fourth).toBeDefined();

    const queue = reinsertNewConfirmationWithMinimumSpacing(
      [queueEntry(second!), queueEntry(third!), queueEntry(fourth!)],
      queueEntry(target!),
      [],
    );

    expect(queue.map((entry) => entry.itemKey)).toEqual([
      second!.itemKey,
      third!.itemKey,
      fourth!.itemKey,
      target!.itemKey,
    ]);
    expect(queue.at(-1)).toMatchObject({ level: 2, repeated: true });
  });
});
