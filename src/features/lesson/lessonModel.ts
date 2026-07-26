import type { Exercise, Lesson } from "./types";
import type { LessonSectionKind, NormalizedLessonSection } from "./types";

const SECTION_KIND = {
  explanation: "explanation",
  examples: "example",
  exercise: "exercise",
  recall: "recall",
  speaking: "practice",
  summary: "summary",
} as const satisfies Record<
  Lesson["sections"][number]["type"],
  Exclude<LessonSectionKind, "goal">
>;

export function collectLessonExerciseIds(lesson: Lesson): readonly string[] {
  return [...new Set(lesson.sections.flatMap((section) => section.exerciseIds ?? []))];
}

/**
 * 永続contentを表示用に変形する。目標はobjectivesから先頭へ補い、
 * `examples`/`speaking`は画面上の`example`/`practice`へ正規化する。
 */
export function normalizeLessonSections(
  lesson: Lesson,
  exercises: readonly Exercise[],
): readonly NormalizedLessonSection[] {
  const exerciseById = new Map(exercises.map((exercise) => [exercise.id, exercise]));
  const goal: NormalizedLessonSection = {
    id: `${lesson.id}:goal`,
    kind: "goal",
    titleJa: "今日できるようになること",
    estimatedMinutes: 0,
    objectivesJa: lesson.objectivesJa,
    exercises: [],
    missingExerciseIds: [],
  };

  const contentSections = lesson.sections.map((section): NormalizedLessonSection => {
    const exerciseIds = section.exerciseIds ?? [];
    return {
      id: section.id,
      kind: SECTION_KIND[section.type],
      titleJa: section.titleJa,
      estimatedMinutes: section.estimatedMinutes,
      bodyJa: section.bodyJa,
      examples: section.examples,
      exercises: exerciseIds.flatMap((id) => {
        const exercise = exerciseById.get(id);
        return exercise === undefined ? [] : [exercise];
      }),
      missingExerciseIds: exerciseIds.filter((id) => !exerciseById.has(id)),
    };
  });

  return [goal, ...contentSections];
}

export function clampSectionIndex(index: number, sectionCount: number): number {
  if (sectionCount <= 0 || !Number.isFinite(index)) {
    return 0;
  }
  return Math.min(sectionCount - 1, Math.max(0, Math.floor(index)));
}

export function normalizeTextAnswer(value: string): string {
  return value
    .normalize("NFKC")
    .trim()
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, " ")
    .replace(/[.!?。！？]+$/u, "")
    .toLocaleLowerCase("en-US");
}

function normalizeComparable(value: unknown): unknown {
  if (typeof value === "string") {
    return normalizeTextAnswer(value);
  }
  if (Array.isArray(value)) {
    return value.map(normalizeComparable);
  }
  return value;
}

export function gradeExerciseResponse(
  exercise: Exercise,
  response: unknown,
): boolean | null {
  if (
    exercise.type === "selfRecall" ||
    exercise.type === "writingPrompt" ||
    exercise.type === "speakingPrompt"
  ) {
    return null;
  }

  if (
    (exercise.type === "textInput" ||
      exercise.type === "cloze" ||
      exercise.type === "dictation" ||
      exercise.type === "sentenceOrder") &&
    Array.isArray(exercise.answer) &&
    typeof response === "string"
  ) {
    return exercise.answer.some(
      (answer) =>
        typeof answer === "string" &&
        normalizeTextAnswer(answer) === normalizeTextAnswer(response),
    );
  }

  if (exercise.type === "multiSelect") {
    if (!Array.isArray(exercise.answer) || !Array.isArray(response)) {
      return false;
    }
    const expected = exercise.answer
      .map(normalizeComparable)
      .sort((left, right) => String(left).localeCompare(String(right)));
    const actual = response
      .map(normalizeComparable)
      .sort((left, right) => String(left).localeCompare(String(right)));
    return JSON.stringify(expected) === JSON.stringify(actual);
  }

  return (
    JSON.stringify(normalizeComparable(response)) ===
    JSON.stringify(normalizeComparable(exercise.answer))
  );
}
