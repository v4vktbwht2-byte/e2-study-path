import { describe, expect, it } from "vitest";
import { pilotReadingPracticeSets } from "../../content/pilot/practiceReading";
import { pilotVocabulary } from "../../content/pilot/vocabulary";
import {
  parseReadingPracticeSet,
  parseReadingPracticeSets,
  type ReadingPracticeSet,
} from "./schema";

function validSet(): ReadingPracticeSet {
  return parseReadingPracticeSet(pilotReadingPracticeSets[0]);
}

describe("読解教材schema", () => {
  it("6セット以上のオリジナル教材と本文参照を厳密検証する", () => {
    const parsed = parseReadingPracticeSets(pilotReadingPracticeSets);

    expect(parsed).toHaveLength(6);
    expect(new Set(parsed.map((set) => set.id)).size).toBe(parsed.length);
    expect(parsed.every((set) => set.source.type === "original")).toBe(true);
    expect(
      parsed.every(
        (set) =>
          set.payload.paragraphs.length >= 2 &&
          set.payload.questions.length >= 1 &&
          set.payload.keyVocabulary.length >= 1,
      ),
    ).toBe(true);
    const vocabularyIds = new Set(pilotVocabulary.map((item) => item.id));
    expect(
      parsed.flatMap((set) =>
        set.payload.keyVocabulary.filter(
          (item) => !vocabularyIds.has(item.vocabularyItemId),
        ),
      ),
    ).toEqual([]);
  });

  it("本文に存在しない根拠文IDを拒否する", () => {
    const source = validSet();
    const firstQuestion = source.payload.questions[0]!;
    expect(() =>
      parseReadingPracticeSet({
        ...source,
        payload: {
          ...source.payload,
          questions: [
            {
              ...firstQuestion,
              evidenceSentenceIds: ["missing-sentence"],
            },
            ...source.payload.questions.slice(1),
          ],
        },
      }),
    ).toThrow(/根拠文/);
  });

  it("正答以外の誤答理由が不足した教材を拒否する", () => {
    const source = validSet();
    const firstQuestion = source.payload.questions[0]!;
    expect(() =>
      parseReadingPracticeSet({
        ...source,
        payload: {
          ...source.payload,
          questions: [
            {
              ...firstQuestion,
              choiceFeedbackJa: firstQuestion.choiceFeedbackJa.slice(1),
            },
            ...source.payload.questions.slice(1),
          ],
        },
      }),
    ).toThrow(/すべての選択肢/);
  });

  it("追加fieldとraw HTMLを拒否する", () => {
    const source = validSet();
    expect(() =>
      parseReadingPracticeSet({
        ...source,
        unexpected: true,
      }),
    ).toThrow();
    expect(() =>
      parseReadingPracticeSet({
        ...source,
        payload: {
          ...source.payload,
          introductionJa: "<strong>読んでください</strong>",
        },
      }),
    ).toThrow(/raw HTML/);
  });
});
