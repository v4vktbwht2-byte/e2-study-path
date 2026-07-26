import type { z } from "zod";
import {
  contentPackEnvelopeSchema,
  exerciseSchema,
  lessonSchema,
  practiceSetSchema,
  vocabularyItemSchema,
  type ContentPack,
  type Exercise,
  type Lesson,
  type PracticeSet,
  type VocabularyItem,
} from "./schemas";

export interface ContentValidationIssue {
  readonly scope:
    "pack" | "vocabulary" | "lesson" | "exercise" | "practiceSet" | "reference";
  readonly itemId?: string;
  readonly message: string;
}

export interface ContentValidationResult {
  readonly pack?: ContentPack;
  readonly validVocabulary: readonly VocabularyItem[];
  readonly validLessons: readonly Lesson[];
  readonly validExercises: readonly Exercise[];
  readonly validPracticeSets: readonly PracticeSet[];
  readonly issues: readonly ContentValidationIssue[];
}

const rawHtmlPattern = /<\/?[a-z][^>]*>|on[a-z]+\s*=/i;

function issueMessage(error: z.ZodError) {
  return error.issues
    .map((issue) => {
      const location = issue.path.length > 0 ? issue.path.join(".") : "root";
      return `${location}: ${issue.message}`;
    })
    .join("; ");
}

function parseItems<T>(
  values: readonly unknown[],
  schema: z.ZodType<T>,
  scope: ContentValidationIssue["scope"],
  issues: ContentValidationIssue[],
) {
  const valid: T[] = [];

  values.forEach((value, index) => {
    const parsed = schema.safeParse(value);
    if (parsed.success) {
      valid.push(parsed.data);
      return;
    }

    const itemId =
      value !== null &&
      typeof value === "object" &&
      "id" in value &&
      typeof value.id === "string"
        ? value.id
        : `index:${index}`;

    issues.push({
      scope,
      itemId,
      message: issueMessage(parsed.error),
    });
  });

  return valid;
}

function findDuplicates(
  scope: ContentValidationIssue["scope"],
  ids: readonly string[],
  issues: ContentValidationIssue[],
) {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) {
      issues.push({ scope, itemId: id, message: "IDが重複しています。" });
    }
    seen.add(id);
  }
}

function findPrerequisiteCycle(lessons: readonly Lesson[]) {
  const knownIds = new Set(lessons.map((lesson) => lesson.id));
  const edges = new Map(
    lessons.map((lesson) => [
      lesson.id,
      lesson.prerequisites.filter((id) => knownIds.has(id)),
    ]),
  );
  const visiting = new Set<string>();
  const visited = new Set<string>();

  const visit = (id: string): string | undefined => {
    if (visiting.has(id)) {
      return id;
    }
    if (visited.has(id)) {
      return undefined;
    }

    visiting.add(id);
    for (const prerequisite of edges.get(id) ?? []) {
      const cycle = visit(prerequisite);
      if (cycle) {
        return cycle;
      }
    }
    visiting.delete(id);
    visited.add(id);
    return undefined;
  };

  for (const lesson of lessons) {
    const cycle = visit(lesson.id);
    if (cycle) {
      return cycle;
    }
  }

  return undefined;
}

function validateReferences(
  vocabulary: readonly VocabularyItem[],
  lessons: readonly Lesson[],
  exercises: readonly Exercise[],
  issues: ContentValidationIssue[],
) {
  const vocabularyIds = new Set(vocabulary.map((item) => item.id));
  const lessonIds = new Set(lessons.map((lesson) => lesson.id));
  const exerciseIds = new Set(exercises.map((exercise) => exercise.id));

  for (const lesson of lessons) {
    for (const prerequisite of lesson.prerequisites) {
      if (!lessonIds.has(prerequisite)) {
        issues.push({
          scope: "reference",
          itemId: lesson.id,
          message: `前提レッスン ${prerequisite} が存在しません。`,
        });
      }
    }

    for (const section of lesson.sections) {
      for (const exerciseId of section.exerciseIds ?? []) {
        if (!exerciseIds.has(exerciseId)) {
          issues.push({
            scope: "reference",
            itemId: lesson.id,
            message: `演習 ${exerciseId} が存在しません。`,
          });
        }
      }
    }

    for (const itemKey of lesson.reviewItemKeys) {
      if (
        itemKey.startsWith("vocab:") &&
        !vocabularyIds.has(itemKey.slice("vocab:".length))
      ) {
        issues.push({
          scope: "reference",
          itemId: lesson.id,
          message: `復習対象 ${itemKey} が存在しません。`,
        });
      }
    }
  }

  for (const exercise of exercises) {
    if (exercise.lessonId && !lessonIds.has(exercise.lessonId)) {
      issues.push({
        scope: "reference",
        itemId: exercise.id,
        message: `レッスン ${exercise.lessonId} が存在しません。`,
      });
    }

    const choices = exercise.payload.choices;
    if (
      ["multipleChoice", "listenAndChoose", "readingQuestion"].includes(
        exercise.type,
      ) &&
      (!Array.isArray(choices) ||
        choices.length < 2 ||
        !Number.isInteger(exercise.answer) ||
        (exercise.answer as number) < 0 ||
        (exercise.answer as number) >= choices.length)
    ) {
      issues.push({
        scope: "exercise",
        itemId: exercise.id,
        message: "選択肢または正答indexが不正です。",
      });
    }

    if (
      rawHtmlPattern.test(exercise.prompt) ||
      rawHtmlPattern.test(exercise.explanation)
    ) {
      issues.push({
        scope: "exercise",
        itemId: exercise.id,
        message: "raw HTMLは使用できません。",
      });
    }
  }

  const cycle = findPrerequisiteCycle(lessons);
  if (cycle) {
    issues.push({
      scope: "reference",
      itemId: cycle,
      message: "レッスンの前提関係が循環しています。",
    });
  }
}

export function validateContentPack(input: unknown): ContentValidationResult {
  const envelope = contentPackEnvelopeSchema.safeParse(input);
  if (!envelope.success) {
    return {
      validVocabulary: [],
      validLessons: [],
      validExercises: [],
      validPracticeSets: [],
      issues: [
        {
          scope: "pack",
          message: issueMessage(envelope.error),
        },
      ],
    };
  }

  const issues: ContentValidationIssue[] = [];
  const validVocabulary = parseItems(
    envelope.data.vocabulary,
    vocabularyItemSchema,
    "vocabulary",
    issues,
  );
  const validLessons = parseItems(
    envelope.data.lessons,
    lessonSchema,
    "lesson",
    issues,
  );
  const validExercises = parseItems(
    envelope.data.exercises,
    exerciseSchema,
    "exercise",
    issues,
  );
  const validPracticeSets = parseItems(
    envelope.data.practiceSets,
    practiceSetSchema,
    "practiceSet",
    issues,
  );

  findDuplicates(
    "vocabulary",
    validVocabulary.map((item) => item.id),
    issues,
  );
  findDuplicates(
    "lesson",
    validLessons.map((item) => item.id),
    issues,
  );
  findDuplicates(
    "exercise",
    validExercises.map((item) => item.id),
    issues,
  );
  findDuplicates(
    "practiceSet",
    validPracticeSets.map((item) => item.id),
    issues,
  );
  validateReferences(validVocabulary, validLessons, validExercises, issues);

  const pack: ContentPack = {
    id: envelope.data.id,
    schemaVersion: envelope.data.schemaVersion,
    contentVersion: envelope.data.contentVersion,
    locale: envelope.data.locale,
    title: envelope.data.title,
    description: envelope.data.description,
    generatedAt: envelope.data.generatedAt,
    source: envelope.data.source,
    vocabulary: validVocabulary,
    lessons: validLessons,
    exercises: validExercises,
    practiceSets: validPracticeSets,
  };

  return {
    pack,
    validVocabulary,
    validLessons,
    validExercises,
    validPracticeSets,
    issues,
  };
}

export function parseContentPackOrThrow(input: unknown) {
  const result = validateContentPack(input);
  if (!result.pack || result.issues.length > 0) {
    throw new Error(
      result.issues
        .map(
          (issue) =>
            `${issue.scope}${issue.itemId ? `:${issue.itemId}` : ""}: ${issue.message}`,
        )
        .join("\n"),
    );
  }
  return result.pack;
}
