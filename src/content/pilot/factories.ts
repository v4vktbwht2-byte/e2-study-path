import type {
  ContentSource,
  Exercise,
  Lesson,
} from "../../infrastructure/content/schemas";

export type CurriculumStage = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type DiagnosticAreaTag =
  | "alphabet"
  | "basicVocabulary"
  | "beVerb"
  | "generalVerb"
  | "questions"
  | "shortReading"
  | "basicListening"
  | "pastFutureComparison"
  | "presentPerfect"
  | "passive"
  | "relativeClauses"
  | "upperGrammar"
  | "upperVocabulary"
  | "upperReading"
  | "upperListening";

export interface DiagnosticTagSeed {
  area: DiagnosticAreaTag;
  level: "foundation" | "standard" | "upper";
}

export interface ChoiceExerciseSeed {
  prompt: string;
  choices: readonly [string, string, ...string[]];
  answer: number;
  explanation: string;
  hint: string;
  type?: "multipleChoice" | "listenAndChoose" | "readingQuestion";
  stimulus?: string;
  targetSkills?: Exercise["targetSkills"];
  targetMasteryDimensions?: Exercise["targetMasteryDimensions"];
  tags?: readonly string[];
  diagnostic?: DiagnosticTagSeed;
}

export interface UnitContentSeed {
  stage: CurriculumStage;
  unitId: `S${CurriculumStage}-U${number}`;
  order: number;
  titleJa: string;
  descriptionJa: string;
  objectivesJa: readonly [string, ...string[]];
  explanationJa: string;
  examples: readonly [
    { en: string; ja: string },
    { en: string; ja: string },
    ...{ en: string; ja: string }[],
  ];
  recallJa: string;
  summaryJa: string;
  topicTags: readonly [string, ...string[]];
  prerequisiteUnitId?: `S${CurriculumStage}-U${number}`;
  exercises: readonly [
    ChoiceExerciseSeed,
    ChoiceExerciseSeed,
    ChoiceExerciseSeed,
    ChoiceExerciseSeed,
    ChoiceExerciseSeed,
  ];
}

export interface GeneratedUnitContent {
  lesson: Lesson;
  exercises: Exercise[];
}

export const ORIGINAL_CONTENT_SOURCE = {
  type: "original",
  author: "E2 Study Path project",
  note: "本プロジェクト向けに新規作成したオリジナル教材",
} satisfies ContentSource;

function lessonIdFor(unitId: string): string {
  return `lesson-${unitId.toLowerCase()}`;
}

function exercisePayload(seed: ChoiceExerciseSeed): Record<string, unknown> {
  const choices = [...seed.choices];

  if (seed.type === "listenAndChoose") {
    return {
      choices,
      speechText: seed.stimulus ?? seed.prompt,
      speechLocale: "en-US",
    };
  }

  if (seed.type === "readingQuestion") {
    return {
      choices,
      passage: seed.stimulus ?? "",
    };
  }

  return {
    choices,
    ...(seed.stimulus === undefined ? {} : { context: seed.stimulus }),
  };
}

function createExercise(
  unit: UnitContentSeed,
  lessonId: string,
  seed: ChoiceExerciseSeed,
  index: number,
): Exercise {
  const exerciseNumber = String(index + 1).padStart(2, "0");
  const diagnosticTags =
    seed.diagnostic === undefined
      ? []
      : [
          "diagnostic",
          `diagnostic:stage:${unit.stage}`,
          `diagnostic:area:${seed.diagnostic.area}`,
          `diagnostic:level:${seed.diagnostic.level}`,
        ];

  return {
    id: `exercise-${unit.unitId.toLowerCase()}-${exerciseNumber}`,
    schemaVersion: "1.0.0",
    contentRevision: 1,
    type: seed.type ?? "multipleChoice",
    stage: unit.stage,
    lessonId,
    prompt: seed.prompt,
    instructionsJa:
      seed.type === "listenAndChoose"
        ? "英語を聞いて、最も合う答えを1つ選んでください。"
        : "最も合う答えを1つ選んでください。",
    payload: exercisePayload(seed),
    answer: seed.answer,
    explanation: seed.explanation,
    hints: [seed.hint],
    targetSkills: seed.targetSkills ?? ["vocabulary"],
    targetMasteryDimensions: seed.targetMasteryDimensions ?? ["recognition"],
    reviewItemKeys: [],
    estimatedSeconds: seed.type === "readingQuestion" ? 30 : 15,
    tags: [
      "original",
      `stage:${unit.stage}`,
      `unit:${unit.unitId.toLowerCase()}`,
      ...unit.topicTags,
      ...(seed.tags ?? []),
      ...diagnosticTags,
    ],
    source: ORIGINAL_CONTENT_SOURCE,
  };
}

export function createUnitContent(seed: UnitContentSeed): GeneratedUnitContent {
  const lessonId = lessonIdFor(seed.unitId);
  const exercises = seed.exercises.map((exercise, index) =>
    createExercise(seed, lessonId, exercise, index),
  );
  const exerciseIds = exercises.map((exercise) => exercise.id);

  const lesson: Lesson = {
    id: lessonId,
    schemaVersion: "1.0.0",
    contentRevision: 1,
    stage: seed.stage,
    unitId: seed.unitId,
    order: seed.order,
    titleJa: seed.titleJa,
    descriptionJa: seed.descriptionJa,
    objectivesJa: [...seed.objectivesJa],
    prerequisites:
      seed.prerequisiteUnitId === undefined
        ? []
        : [lessonIdFor(seed.prerequisiteUnitId)],
    sections: [
      {
        id: `${seed.unitId.toLowerCase()}-explanation`,
        type: "explanation",
        titleJa: "今日できるようになること",
        bodyJa: seed.explanationJa,
        estimatedMinutes: 1,
      },
      {
        id: `${seed.unitId.toLowerCase()}-examples`,
        type: "examples",
        titleJa: "短い例で確認",
        examples: seed.examples.map((example) => ({ ...example })),
        estimatedMinutes: 2,
      },
      {
        id: `${seed.unitId.toLowerCase()}-practice`,
        type: "exercise",
        titleJa: "ガイド付き練習",
        exerciseIds: exerciseIds.slice(0, 3),
        estimatedMinutes: 3,
      },
      {
        id: `${seed.unitId.toLowerCase()}-recall`,
        type: "recall",
        titleJa: "答えを見ずに思い出す",
        bodyJa: seed.recallJa,
        exerciseIds: exerciseIds.slice(3),
        estimatedMinutes: 2,
      },
      {
        id: `${seed.unitId.toLowerCase()}-summary`,
        type: "summary",
        titleJa: "ミニまとめ",
        bodyJa: seed.summaryJa,
        estimatedMinutes: 1,
      },
    ],
    estimatedMinutes: 9,
    reviewItemKeys: [],
    source: ORIGINAL_CONTENT_SOURCE,
  };

  return { lesson, exercises };
}
