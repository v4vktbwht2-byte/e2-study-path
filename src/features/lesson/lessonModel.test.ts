import { describe, expect, it } from "vitest";
import type { Exercise, Lesson } from "./types";
import {
  gradeExerciseResponse,
  normalizeLessonSections,
  normalizeTextAnswer,
} from "./lessonModel";

function exercise(overrides: Partial<Exercise> = {}): Exercise {
  return {
    id: "exercise-a",
    schemaVersion: "1.0.0",
    contentRevision: 1,
    type: "multipleChoice",
    stage: 1,
    lessonId: "lesson-a",
    prompt: "答えを選んでください。",
    payload: { choices: ["こんにちは", "さようなら"] },
    answer: 0,
    explanation: "こんにちはが正解です。",
    hints: ["会ったときの言葉です。"],
    targetSkills: ["vocabulary"],
    targetMasteryDimensions: ["recognition"],
    reviewItemKeys: [],
    estimatedSeconds: 10,
    tags: [],
    source: { type: "original", author: "テスト" },
    ...overrides,
  };
}

function lesson(): Lesson {
  return {
    id: "lesson-a",
    schemaVersion: "1.0.0",
    contentRevision: 1,
    stage: 1,
    unitId: "S1-U1",
    order: 1,
    titleJa: "最初の文",
    objectivesJa: ["I am ... を使える"],
    prerequisites: [],
    sections: [
      {
        id: "explanation",
        type: "explanation",
        titleJa: "短い説明",
        bodyJa: "I の後ろでは am を使います。",
        estimatedMinutes: 1,
      },
      {
        id: "examples",
        type: "examples",
        titleJa: "例文",
        examples: [{ en: "I am Mai.", ja: "私はマイです。" }],
        estimatedMinutes: 1,
      },
      {
        id: "exercise",
        type: "exercise",
        titleJa: "確認",
        exerciseIds: ["exercise-a", "missing"],
        estimatedMinutes: 1,
      },
      {
        id: "recall",
        type: "recall",
        titleJa: "思い出す",
        bodyJa: "答えを隠して言ってみましょう。",
        estimatedMinutes: 1,
      },
      {
        id: "practice",
        type: "speaking",
        titleJa: "使ってみる",
        bodyJa: "自分の名前で言いましょう。",
        estimatedMinutes: 1,
      },
      {
        id: "summary",
        type: "summary",
        titleJa: "まとめ",
        bodyJa: "I am ... を確認しました。",
        estimatedMinutes: 1,
      },
    ],
    estimatedMinutes: 7,
    reviewItemKeys: [],
    source: { type: "original", author: "テスト" },
  };
}

describe("レッスン表示モデル", () => {
  it("目標を補い7種類のセクションへ正規化する", () => {
    const sections = normalizeLessonSections(lesson(), [exercise()]);
    expect(sections.map(({ kind }) => kind)).toEqual([
      "goal",
      "explanation",
      "example",
      "exercise",
      "recall",
      "practice",
      "summary",
    ]);
    expect(sections[0]?.objectivesJa).toEqual(["I am ... を使える"]);
    expect(sections[3]?.exercises[0]?.id).toBe("exercise-a");
    expect(sections[3]?.missingExerciseIds).toEqual(["missing"]);
  });

  it("入力をNFKC・空白・大文字小文字・末尾句読点で正規化する", () => {
    expect(normalizeTextAnswer("  Ｉ   AM Mai！ ")).toBe("i am mai");
  });

  it("四択と複数正答の入力問題を採点する", () => {
    expect(gradeExerciseResponse(exercise(), 0)).toBe(true);
    expect(gradeExerciseResponse(exercise(), 1)).toBe(false);
    expect(
      gradeExerciseResponse(
        exercise({
          type: "textInput",
          answer: ["I am Mai.", "I'm Mai."],
        }),
        "  i am mai  ",
      ),
    ).toBe(true);
  });

  it("自己評価問題は正誤を断定しない", () => {
    expect(
      gradeExerciseResponse(
        exercise({ type: "selfRecall", answer: "I am Mai." }),
        "I am Mai.",
      ),
    ).toBeNull();
  });
});
