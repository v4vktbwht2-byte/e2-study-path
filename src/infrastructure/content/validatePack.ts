import type { z } from "zod";
import {
  listeningPayloadSchema,
  mockPayloadSchema,
  opinionPromptPayloadSchema,
  readingPracticeSetSchema,
  speakingPayloadSchema,
  summaryPromptPayloadSchema,
} from "./practiceSchemas";
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

const REQUIRED_PILOT_PRACTICE_COUNTS = {
  reading: 6,
  listening: 6,
  summary: 4,
  opinion: 4,
  speaking: 4,
  mock: 1,
} as const satisfies Readonly<Record<PracticeSet["type"], number>>;

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

function findRawHtmlInPayload(value: unknown, path: string): string | undefined {
  if (typeof value === "string") {
    return rawHtmlPattern.test(value) ? path : undefined;
  }
  if (Array.isArray(value)) {
    for (const [index, item] of value.entries()) {
      const found = findRawHtmlInPayload(item, `${path}.${index}`);
      if (found !== undefined) {
        return found;
      }
    }
    return undefined;
  }
  if (value !== null && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      const found = findRawHtmlInPayload(item, `${path}.${key}`);
      if (found !== undefined) {
        return found;
      }
    }
  }
  return undefined;
}

function validatePracticePayloads(
  practiceSets: readonly PracticeSet[],
  vocabulary: readonly VocabularyItem[],
  issues: ContentValidationIssue[],
) {
  const vocabularyIds = new Set(vocabulary.map((item) => item.id));
  for (const set of practiceSets) {
    if (set.type === "reading") {
      const readingResult = readingPracticeSetSchema.safeParse(set);
      if (!readingResult.success) {
        issues.push({
          scope: "practiceSet",
          itemId: set.id,
          message: `技能別payloadが不正です: ${issueMessage(readingResult.error)}`,
        });
        continue;
      }
      for (const item of readingResult.data.payload.keyVocabulary) {
        if (!vocabularyIds.has(item.vocabularyItemId)) {
          issues.push({
            scope: "reference",
            itemId: set.id,
            message: `重要語句の単語 ${item.vocabularyItemId} が存在しません。`,
          });
        }
      }
    }

    const result =
      set.type === "reading"
        ? undefined
        : set.type === "listening"
          ? listeningPayloadSchema.safeParse(set.payload)
          : set.type === "summary"
            ? summaryPromptPayloadSchema.safeParse(set.payload)
            : set.type === "opinion"
              ? opinionPromptPayloadSchema.safeParse(set.payload)
              : set.type === "speaking"
                ? speakingPayloadSchema.safeParse(set.payload)
                : mockPayloadSchema.safeParse(set.payload);
    if (result !== undefined && !result.success) {
      issues.push({
        scope: "practiceSet",
        itemId: set.id,
        message: `技能別payloadが不正です: ${issueMessage(result.error)}`,
      });
      continue;
    }

    const rawHtmlPath = findRawHtmlInPayload(set, "practiceSet");
    if (rawHtmlPath !== undefined) {
      issues.push({
        scope: "practiceSet",
        itemId: set.id,
        message: `${rawHtmlPath}: raw HTMLは使用できません。`,
      });
    }
  }
}

export function validatePilotPracticeCoverage(
  practiceSets: readonly PracticeSet[],
): readonly ContentValidationIssue[] {
  const issues: ContentValidationIssue[] = [];
  for (const [type, minimum] of Object.entries(REQUIRED_PILOT_PRACTICE_COUNTS) as [
    PracticeSet["type"],
    number,
  ][]) {
    const count = practiceSets.filter((set) => set.type === type).length;
    if (count < minimum) {
      issues.push({
        scope: "practiceSet",
        itemId: `coverage:${type}`,
        message: `${type}教材は${minimum}セット以上必要です（現在${count}セット）。`,
      });
    }
  }
  return issues;
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
  validatePracticePayloads(validPracticeSets, validVocabulary, issues);
  if (envelope.data.id === "pilot-core-ja-original") {
    issues.push(...validatePilotPracticeCoverage(validPracticeSets));
  }

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
