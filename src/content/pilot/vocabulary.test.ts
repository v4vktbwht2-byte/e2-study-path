import { describe, expect, it } from "vitest";

import { vocabularyItemSchema } from "../../infrastructure/content/schemas";
import { pilotContentPack } from "./pilotContentPack";
import { pilotVocabulary } from "./vocabulary";

const MINIMUM_ITEMS_PER_STAGE = 20;
const MINIMUM_TOTAL_ITEMS = 140;
const MAX_EXAMPLE_WORDS_BY_STAGE = [6, 8, 9, 10, 11, 12, 14] as const;
const EXPECTED_CONFUSION_GROUPS = {
  "confusion-borrow-lend": ["borrow", "lend"],
  "confusion-quiet-quite": ["quiet", "quite"],
  "confusion-accept-except": ["accept", "except"],
  "confusion-rise-raise": ["raise", "rise"],
  "confusion-affect-effect": ["affect", "effect"],
} as const;

function countEnglishWords(sentence: string): number {
  return sentence.match(/[A-Za-z]+(?:'[A-Za-z]+)?|\d+/g)?.length ?? 0;
}

describe("Pilot語彙教材", () => {
  it("140件以上をContent Packへ統合し、全件がZodスキーマを通過する", () => {
    expect(pilotVocabulary.length).toBeGreaterThanOrEqual(MINIMUM_TOTAL_ITEMS);
    expect(pilotContentPack.vocabulary).toHaveLength(pilotVocabulary.length);
    expect(pilotContentPack.vocabulary.map(({ id }) => id)).toEqual(
      pilotVocabulary.map(({ id }) => id),
    );

    for (const item of pilotVocabulary) {
      expect(vocabularyItemSchema.safeParse(item).success, `${item.id}のschema`).toBe(
        true,
      );
    }
  });

  it("Stage 0〜6へ各20件以上を均等に収録する", () => {
    for (const stage of [0, 1, 2, 3, 4, 5, 6] as const) {
      expect(
        pilotVocabulary.filter((item) => item.stage === stage),
        `Stage ${stage}の語彙数`,
      ).toHaveLength(MINIMUM_ITEMS_PER_STAGE);
    }
  });

  it("全項目が見出し語・lemma・品詞・主意味・英日例文を持つ", () => {
    for (const item of pilotVocabulary) {
      expect(item.headword.trim().length).toBeGreaterThan(0);
      expect(item.lemma.trim().length).toBeGreaterThan(0);
      expect(item.partOfSpeech.trim().length).toBeGreaterThan(0);
      expect(item.meanings.length).toBeGreaterThan(0);
      expect(item.meanings[0]?.ja.trim().length).toBeGreaterThan(0);
      expect(item.exampleSentences.length).toBeGreaterThan(0);

      for (const example of item.exampleSentences) {
        expect(example.stage).toBe(item.stage);
        expect(example.en.trim().length).toBeGreaterThan(0);
        expect(example.ja.trim().length).toBeGreaterThan(0);
        expect(example.en.toLowerCase()).toContain(item.headword.toLowerCase());
      }
    }
  });

  it("Stage別の例文語数を初学者向け上限内へ収める", () => {
    for (const item of pilotVocabulary) {
      const maximum = MAX_EXAMPLE_WORDS_BY_STAGE[item.stage];
      if (maximum === undefined) {
        throw new Error(`Stage ${item.stage}の例文語数上限がありません。`);
      }
      for (const example of item.exampleSentences) {
        expect(
          countEnglishWords(example.en),
          `${item.id}: ${example.en}`,
        ).toBeLessThanOrEqual(maximum);
      }
    }
  });

  it("全項目がコロケーションと検索・絞り込みに使えるタグを持つ", () => {
    for (const item of pilotVocabulary) {
      expect(item.collocations.length).toBeGreaterThan(0);
      expect(
        item.collocations.some((collocation) =>
          collocation.toLowerCase().includes(item.headword.toLowerCase()),
        ),
      ).toBe(true);
      expect(item.tags).toEqual(
        expect.arrayContaining([
          "original",
          "vocabulary",
          `stage:${item.stage}`,
          `part-of-speech:${item.partOfSpeech}`,
        ]),
      );
      expect(item.tags.some((tag) => tag.startsWith("topic:"))).toBe(true);
      expect(item.tags.some((tag) => tag.startsWith("search:"))).toBe(true);
    }
  });

  it("混同語を共通groupで比較できる", () => {
    for (const [groupId, expectedHeadwords] of Object.entries(
      EXPECTED_CONFUSION_GROUPS,
    )) {
      const actualHeadwords = pilotVocabulary
        .filter((item) => item.confusionGroupIds.includes(groupId))
        .map(({ headword }) => headword)
        .sort();

      expect(actualHeadwords, groupId).toEqual([...expectedHeadwords].sort());
    }

    for (const item of pilotVocabulary.filter(
      ({ confusionGroupIds }) => confusionGroupIds.length > 0,
    )) {
      for (const groupId of item.confusionGroupIds) {
        expect(
          pilotVocabulary.filter((candidate) =>
            candidate.confusionGroupIds.includes(groupId),
          ).length,
          groupId,
        ).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it("すべてoriginal sourceで、未確認の発音記号を生成しない", () => {
    for (const item of pilotVocabulary) {
      expect(item.source).toMatchObject({
        type: "original",
        author: "E2 Study Path project",
      });
      expect(item.pronunciation?.ipa).toBeUndefined();
    }
  });

  it("IDと見出し語を重複させない", () => {
    const ids = pilotVocabulary.map(({ id }) => id);
    const headwords = pilotVocabulary.map(({ headword }) =>
      headword.trim().toLowerCase(),
    );

    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(headwords).size).toBe(headwords.length);
  });
});
