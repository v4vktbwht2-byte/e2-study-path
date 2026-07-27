import { describe, expect, it } from "vitest";
import { judgeVocabularyAnswer, normalizeVocabularyInput } from "./answerJudgment";

describe("語彙入力の正規化と判定", () => {
  it("全角英字・大小文字・前後空白・句読点・引用符を正規化する", () => {
    expect(normalizeVocabularyInput("  ＤＯＮ’Ｔ！ ")).toBe("don't");
    expect(normalizeVocabularyInput("  Take   care. ")).toBe("take care");
  });

  it("strictモードは正規化後の完全一致だけを正解にする", () => {
    expect(
      judgeVocabularyAnswer({
        answer: " Quiet! ",
        acceptedAnswers: ["quiet"],
        mode: "strict",
      }),
    ).toMatchObject({ correct: true, exact: true, outcome: "exact" });
    expect(
      judgeVocabularyAnswer({
        answer: "quie",
        acceptedAnswers: ["quiet"],
        mode: "strict",
      }),
    ).toMatchObject({ correct: false, exact: false, outcome: "incorrect" });
  });

  it("practiceモードだけが明示した軽微なスペル誤りを許容する", () => {
    expect(
      judgeVocabularyAnswer({
        answer: "quie",
        acceptedAnswers: ["quiet"],
        mode: "practice",
      }),
    ).toMatchObject({
      correct: true,
      exact: false,
      outcome: "tolerated",
      editDistance: 1,
    });
    expect(
      judgeVocabularyAnswer({
        answer: "quie",
        acceptedAnswers: ["quiet"],
        mode: "practice",
        practiceMaxEditDistance: 0,
      }),
    ).toMatchObject({ correct: false, outcome: "incorrect" });
  });

  it("混同しやすい別単語は練習モードでも正解にしない", () => {
    expect(
      judgeVocabularyAnswer({
        answer: "quite",
        acceptedAnswers: ["quiet"],
        mode: "practice",
      }),
    ).toMatchObject({ correct: false, outcome: "incorrect" });
  });
});
