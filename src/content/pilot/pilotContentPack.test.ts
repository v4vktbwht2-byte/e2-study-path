import { describe, expect, it } from "vitest";

import {
  createDiagnosticSession,
  finalizeDiagnosticSession,
  recordDiagnosticResponse,
  selectNextDiagnosticQuestion,
  summarizeDiagnosticPlacement,
  type DiagnosticArea,
  type DiagnosticQuestion,
  type DiagnosticQuestionLevel,
  type DiagnosticResponse,
  type DiagnosticSession,
  type DiagnosticStage,
} from "../../domain/diagnostic";
import { contentPackSchema } from "../../infrastructure/content/schemas";
import { validateContentPack } from "../../infrastructure/content/validatePack";
import {
  pilotContentPack,
  pilotDiagnosticExercises,
  pilotExercises,
  pilotLessons,
} from "./pilotContentPack";

const EXPECTED_LESSON_COUNTS = [8, 8, 3, 3, 3, 3, 3] as const;
const EXPECTED_EXERCISE_COUNTS = [40, 40, 15, 15, 15, 15, 15] as const;
const EXPECTED_DIAGNOSTIC_COUNTS = [3, 3, 3, 3, 2, 2, 2] as const;
const DIAGNOSTIC_AREA_PREFIX = "diagnostic:area:";
const DIAGNOSTIC_LEVEL_PREFIX = "diagnostic:level:";
const DIAGNOSTIC_STAGE_PREFIX = "diagnostic:stage:";
const MIN_DIAGNOSTIC_QUESTIONS = 18;
const MAX_DIAGNOSTIC_QUESTIONS = 24;

function diagnosticTagValue(
  tags: readonly string[],
  prefix: string,
): string | undefined {
  return tags.find((tag) => tag.startsWith(prefix))?.slice(prefix.length);
}

function createPilotDiagnosticQuestions(): DiagnosticQuestion[] {
  return [...pilotDiagnosticExercises]
    .sort((left, right) => left.stage - right.stage || left.id.localeCompare(right.id))
    .map((exercise, sequence) => {
      const area = diagnosticTagValue(exercise.tags, DIAGNOSTIC_AREA_PREFIX);
      const level = diagnosticTagValue(exercise.tags, DIAGNOSTIC_LEVEL_PREFIX);
      if (area === undefined || level === undefined) {
        throw new Error(`診断タグが不足しています: ${exercise.id}`);
      }

      return {
        id: exercise.id,
        stage: exercise.stage as DiagnosticStage,
        area: area as DiagnosticArea,
        level: level as DiagnosticQuestionLevel,
        sequence,
      };
    });
}

function runPilotDiagnostic(
  responseFor: (
    question: DiagnosticQuestion,
    session: DiagnosticSession,
  ) => DiagnosticResponse,
  maxQuestions = MAX_DIAGNOSTIC_QUESTIONS,
): DiagnosticSession {
  const questions = createPilotDiagnosticQuestions();
  let session = createDiagnosticSession({ maxQuestions });

  while (!session.isComplete) {
    const question = selectNextDiagnosticQuestion(session, questions);
    if (question === null) {
      session = finalizeDiagnosticSession(session, "noEligibleQuestions");
      break;
    }
    session = recordDiagnosticResponse(
      session,
      question,
      responseFor(question, session),
    );
  }

  return session;
}

describe("Pilot教材パック", () => {
  it("ZodのContentPackスキーマを通過する", () => {
    const parsed = contentPackSchema.safeParse(pilotContentPack);

    expect(parsed.success).toBe(true);
  });

  it("統合検証でスキーマ・参照・正答・循環エラーがない", () => {
    const result = validateContentPack(pilotContentPack);

    expect(result.issues).toEqual([]);
    expect(result.validLessons).toHaveLength(31);
    expect(result.validExercises).toHaveLength(155);
  });

  it("Stage 0/1は各8本、Stage 2〜6は各3本のレッスンを持つ", () => {
    expect(pilotLessons).toHaveLength(31);

    EXPECTED_LESSON_COUNTS.forEach((expectedCount, stage) => {
      expect(
        pilotLessons.filter((lesson) => lesson.stage === stage),
        `Stage ${stage}のレッスン数`,
      ).toHaveLength(expectedCount);
    });
  });

  it("Stage 0/1の全8ユニットを一度ずつ収録する", () => {
    for (const stage of [0, 1] as const) {
      const unitIds = pilotLessons
        .filter((lesson) => lesson.stage === stage)
        .map((lesson) => lesson.unitId);

      expect(unitIds).toEqual(
        Array.from({ length: 8 }, (_, index) => `S${stage}-U${index + 1}`),
      );
    }
  });

  it("全レッスンに5問ずつ、合計155問を分散する", () => {
    expect(pilotExercises).toHaveLength(155);

    EXPECTED_EXERCISE_COUNTS.forEach((expectedCount, stage) => {
      expect(
        pilotExercises.filter((exercise) => exercise.stage === stage),
        `Stage ${stage}の問題数`,
      ).toHaveLength(expectedCount);
    });

    for (const lesson of pilotLessons) {
      expect(
        pilotExercises.filter((exercise) => exercise.lessonId === lesson.id),
        `${lesson.id}の問題数`,
      ).toHaveLength(5);
    }
  });

  it("レッスンが目標・説明・例・練習・想起・まとめを持つ", () => {
    for (const lesson of pilotLessons) {
      expect(lesson.objectivesJa.length).toBeGreaterThan(0);
      expect(lesson.sections.map((section) => section.type)).toEqual([
        "explanation",
        "examples",
        "exercise",
        "recall",
        "summary",
      ]);

      const referencedExerciseIds = lesson.sections.flatMap(
        (section) => section.exerciseIds ?? [],
      );
      const ownedExerciseIds = pilotExercises
        .filter((exercise) => exercise.lessonId === lesson.id)
        .map((exercise) => exercise.id);

      expect(new Set(referencedExerciseIds)).toEqual(new Set(ownedExerciseIds));
    }
  });

  it("前提レッスンは収録順より前だけを参照する", () => {
    const lessonOrder = new Map(
      pilotLessons.map((lesson, index) => [lesson.id, index]),
    );

    for (const lesson of pilotLessons) {
      const currentIndex = lessonOrder.get(lesson.id);
      expect(currentIndex).toBeDefined();

      for (const prerequisite of lesson.prerequisites) {
        expect(lessonOrder.get(prerequisite)).toBeLessThan(currentIndex as number);
      }
    }
  });

  it("全問題の選択肢と正答indexが有効で、解説とヒントがある", () => {
    for (const exercise of pilotExercises) {
      const choices = exercise.payload.choices;

      expect(Array.isArray(choices)).toBe(true);
      expect(choices).toHaveLength(4);
      expect(new Set(choices as string[]).size).toBe(4);
      expect(Number.isInteger(exercise.answer)).toBe(true);
      expect(exercise.answer as number).toBeGreaterThanOrEqual(0);
      expect(exercise.answer as number).toBeLessThan((choices as string[]).length);
      expect(exercise.explanation.trim().length).toBeGreaterThan(0);
      expect(exercise.hints.length).toBeGreaterThan(0);
    }
  });

  it("診断問題を18〜24問用意し、各Stageに判定可能な2問以上とタグを持つ", () => {
    expect(pilotDiagnosticExercises.length).toBeGreaterThanOrEqual(
      MIN_DIAGNOSTIC_QUESTIONS,
    );
    expect(pilotDiagnosticExercises.length).toBeLessThanOrEqual(
      MAX_DIAGNOSTIC_QUESTIONS,
    );
    expect(new Set(pilotDiagnosticExercises.map((exercise) => exercise.stage))).toEqual(
      new Set([0, 1, 2, 3, 4, 5, 6]),
    );
    for (const stage of [0, 1, 2, 3, 4, 5, 6] as const) {
      expect(
        pilotDiagnosticExercises.filter((exercise) => exercise.stage === stage),
        `Stage ${stage}の診断問題数`,
      ).toHaveLength(EXPECTED_DIAGNOSTIC_COUNTS[stage]);
    }

    for (const exercise of pilotDiagnosticExercises) {
      const areaTags = exercise.tags.filter((tag) =>
        tag.startsWith(DIAGNOSTIC_AREA_PREFIX),
      );
      const levelTags = exercise.tags.filter((tag) =>
        tag.startsWith(DIAGNOSTIC_LEVEL_PREFIX),
      );
      const stageTags = exercise.tags.filter((tag) =>
        tag.startsWith(DIAGNOSTIC_STAGE_PREFIX),
      );

      expect(areaTags).toHaveLength(1);
      expect(levelTags).toHaveLength(1);
      expect(stageTags).toEqual([`${DIAGNOSTIC_STAGE_PREFIX}${exercise.stage}`]);
    }
  });

  it("実domainの全問正解経路が24問以内にStage 6へ到達する", () => {
    const session = runPilotDiagnostic(() => "correct");
    const placement = summarizeDiagnosticPlacement(session);

    expect(session.isComplete).toBe(true);
    expect(session.answers.length).toBeLessThanOrEqual(MAX_DIAGNOSTIC_QUESTIONS);
    expect(placement.recommendedStage).toBe(6);
    expect(
      placement.stageSummaries.every((summary) => summary.answeredCount >= 2),
    ).toBe(true);
  });

  it("実domainで基礎問題を3問連続失敗するとStage 0判定で早期終了する", () => {
    const session = runPilotDiagnostic(() => "incorrect");
    const placement = summarizeDiagnosticPlacement(session);

    expect(session).toMatchObject({
      isComplete: true,
      finishReason: "foundationDifficulty",
      consecutiveFoundationFailures: 3,
    });
    expect(session.answers).toHaveLength(3);
    expect(
      session.answers.every(
        (answer) => answer.stage === 0 && answer.level === "foundation",
      ),
    ).toBe(true);
    expect(placement.recommendedStage).toBe(0);
  });

  it("実domainの診断問題数と回答数を18〜24問の上限内へ収める", () => {
    const questions = createPilotDiagnosticQuestions();
    const session = runPilotDiagnostic(() => "correct", MIN_DIAGNOSTIC_QUESTIONS);

    expect(questions.length).toBeGreaterThanOrEqual(MIN_DIAGNOSTIC_QUESTIONS);
    expect(questions.length).toBeLessThanOrEqual(MAX_DIAGNOSTIC_QUESTIONS);
    expect(session.maxQuestions).toBe(MIN_DIAGNOSTIC_QUESTIONS);
    expect(session.answers).toHaveLength(MIN_DIAGNOSTIC_QUESTIONS);
    expect(session.answers.length).toBeLessThanOrEqual(session.maxQuestions);
    expect(session.finishReason).toBe("maxQuestions");
  });

  it("すべての教材がオリジナルsource metadataを持つ", () => {
    expect(pilotContentPack.source.type).toBe("original");

    for (const item of [...pilotLessons, ...pilotExercises]) {
      expect(item.source).toMatchObject({
        type: "original",
        author: "E2 Study Path project",
      });
    }
  });

  it("IDが教材種別ごとに一意である", () => {
    const lessonIds = pilotLessons.map((lesson) => lesson.id);
    const exerciseIds = pilotExercises.map((exercise) => exercise.id);

    expect(new Set(lessonIds).size).toBe(lessonIds.length);
    expect(new Set(exerciseIds).size).toBe(exerciseIds.length);
  });
});
