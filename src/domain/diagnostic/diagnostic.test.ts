import { describe, expect, it } from "vitest";

import { selectNextDiagnosticQuestion } from "./adaptive";
import { summarizeDiagnosticPlacement } from "./placement";
import {
  createDiagnosticSession,
  finalizeDiagnosticSession,
  recordDiagnosticResponse,
  shouldSuppressUpperQuestions,
} from "./session";
import type {
  DiagnosticArea,
  DiagnosticQuestion,
  DiagnosticResponse,
  DiagnosticSession,
  DiagnosticStage,
} from "./types";

function question(
  id: string,
  stage: DiagnosticStage,
  area: DiagnosticArea,
  level: DiagnosticQuestion["level"] = "standard",
  sequence?: number,
): DiagnosticQuestion {
  return {
    id,
    stage,
    area,
    level,
    ...(sequence === undefined ? {} : { sequence }),
  };
}

function addAnswers(
  entries: readonly (readonly [
    stage: DiagnosticStage,
    area: DiagnosticArea,
    response: DiagnosticResponse,
  ])[],
): DiagnosticSession {
  return entries.reduce(
    (session, [stage, area, response], index) =>
      recordDiagnosticResponse(session, question(`q-${index}`, stage, area), response),
    createDiagnosticSession(),
  );
}

describe("適応型診断", () => {
  it("初問は上位問題より基礎問題を優先する", () => {
    const session = createDiagnosticSession();
    const questions: DiagnosticQuestion[] = [
      question("upper", 4, "upperGrammar", "upper", 1),
      question("standard", 0, "basicVocabulary", "standard", 2),
      question("foundation", 0, "alphabet", "foundation", 99),
    ];

    expect(selectNextDiagnosticQuestion(session, questions)?.id).toBe("foundation");
  });

  it("基礎問題を2回連続で失敗すると上位問題を抑制する", () => {
    const first = question("f-1", 0, "alphabet", "foundation", 1);
    const second = question("f-2", 0, "basicVocabulary", "foundation", 2);
    const recovery = question("f-3", 0, "alphabet", "foundation", 3);
    const upper = question("upper", 5, "upperReading", "upper", 4);
    let session = createDiagnosticSession();

    session = recordDiagnosticResponse(session, first, "incorrect");
    session = recordDiagnosticResponse(session, second, "unknown");

    expect(shouldSuppressUpperQuestions(session)).toBe(true);
    expect(
      selectNextDiagnosticQuestion(session, [first, second, upper, recovery])?.id,
    ).toBe("f-3");
  });

  it("基礎問題を3回連続で失敗すると下位判定を優先して終了する", () => {
    let session = createDiagnosticSession();

    for (let index = 0; index < 3; index += 1) {
      session = recordDiagnosticResponse(
        session,
        question(`f-${index}`, 0, "alphabet", "foundation"),
        "incorrect",
      );
    }

    expect(session).toMatchObject({
      isComplete: true,
      finishReason: "foundationDifficulty",
      consecutiveFoundationFailures: 3,
    });
    expect(
      selectNextDiagnosticQuestion(session, [
        question("upper", 6, "upperReading", "upper"),
      ]),
    ).toBeNull();
  });

  it("基礎問題の正解で連続失敗数をリセットする", () => {
    let session = createDiagnosticSession();
    session = recordDiagnosticResponse(
      session,
      question("f-1", 0, "alphabet", "foundation"),
      "incorrect",
    );
    session = recordDiagnosticResponse(
      session,
      question("f-2", 0, "basicVocabulary", "foundation"),
      "correct",
    );

    expect(session.consecutiveFoundationFailures).toBe(0);
    expect(shouldSuppressUpperQuestions(session)).toBe(false);
  });

  it("基礎ステージを十分に確認するまで次ステージを出さない", () => {
    const stageZeroA = question("s0-a", 0, "alphabet", "foundation");
    const stageZeroB = question("s0-b", 0, "basicVocabulary", "foundation");
    const stageOne = question("s1", 1, "beVerb", "foundation");
    let session = createDiagnosticSession();

    session = recordDiagnosticResponse(session, stageZeroA, "correct");
    expect(selectNextDiagnosticQuestion(session, [stageZeroA, stageOne])?.id).not.toBe(
      "s1",
    );

    session = recordDiagnosticResponse(session, stageZeroB, "correct");
    expect(
      selectNextDiagnosticQuestion(session, [stageZeroA, stageZeroB, stageOne])?.id,
    ).toBe("s1");
  });

  it("問題数を18〜24問へ収め、上限で終了する", () => {
    expect(createDiagnosticSession({ maxQuestions: 1 }).maxQuestions).toBe(18);
    expect(createDiagnosticSession({ maxQuestions: 99 }).maxQuestions).toBe(24);

    let session = createDiagnosticSession({ maxQuestions: 18 });
    for (let index = 0; index < 18; index += 1) {
      session = recordDiagnosticResponse(
        session,
        question(`q-${index}`, 0, "alphabet"),
        "correct",
      );
    }

    expect(session).toMatchObject({
      isComplete: true,
      finishReason: "maxQuestions",
    });
  });

  it("候補がなくなった診断を明示的な理由で完了できる", () => {
    const session = finalizeDiagnosticSession(
      createDiagnosticSession(),
      "noEligibleQuestions",
    );

    expect(session).toMatchObject({
      isComplete: true,
      finishReason: "noEligibleQuestions",
    });
  });
});

describe("開始ステージ判定", () => {
  it("アルファベット・基本語彙に不安があればステージ0を提案する", () => {
    const session = addAnswers([
      [0, "alphabet", "incorrect"],
      [0, "basicVocabulary", "correct"],
    ]);

    expect(summarizeDiagnosticPlacement(session).recommendedStage).toBe(0);
  });

  it("基礎はでき、be動詞・一般動詞に不安があればステージ1を提案する", () => {
    const session = addAnswers([
      [0, "alphabet", "correct"],
      [0, "basicVocabulary", "correct"],
      [1, "beVerb", "incorrect"],
      [1, "generalVerb", "incorrect"],
    ]);
    const result = summarizeDiagnosticPlacement(session);

    expect(result.recommendedStage).toBe(1);
    expect(result.strengths.map((insight) => insight.area)).toEqual([
      "alphabet",
      "basicVocabulary",
    ]);
    expect(result.gaps.map((insight) => insight.area)).toEqual([
      "beVerb",
      "generalVerb",
    ]);
  });

  it.each([
    [2, [0, 1]],
    [3, [0, 1, 2]],
    [4, [0, 1, 2, 3]],
    [5, [0, 1, 2, 3, 4]],
    [6, [0, 1, 2, 3, 4, 5]],
  ] as const)(
    "連続して基準を満たした場合はステージ%iを段階的に提案する",
    (expectedStage, passedStages) => {
      const entries = passedStages.flatMap((stage) => [
        [stage, "shortReading", "correct"] as const,
        [stage, "basicListening", "correct"] as const,
      ]);

      expect(summarizeDiagnosticPlacement(addAnswers(entries)).recommendedStage).toBe(
        expectedStage,
      );
    },
  );

  it("「分からない」とスキップを課題として集計する", () => {
    const session = addAnswers([
      [0, "alphabet", "correct"],
      [0, "basicVocabulary", "correct"],
      [1, "beVerb", "unknown"],
      [1, "generalVerb", "skipped"],
    ]);
    const result = summarizeDiagnosticPlacement(session);

    expect(result.skippedCount).toBe(2);
    expect(result.gaps.map((insight) => insight.label)).toEqual(["be動詞", "一般動詞"]);
  });

  it("回答が0件でも安全にステージ0と空の所見を返す", () => {
    const result = summarizeDiagnosticPlacement(createDiagnosticSession());

    expect(result).toMatchObject({
      recommendedStage: 0,
      answeredCount: 0,
      correctCount: 0,
      skippedCount: 0,
      strengths: [],
      gaps: [],
    });
  });
});
