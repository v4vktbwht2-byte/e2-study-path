import { z } from "zod";

const semverPattern = /^\d+\.\d+\.\d+$/;
const itemIdSchema = z.string().min(3);

export const contentSourceSchema = z
  .object({
    type: z.literal("original"),
    author: z.string().trim().min(1),
    note: z.string().trim().min(1).optional(),
  })
  .strict();

const meaningSchema = z
  .object({
    id: z.string().min(1),
    ja: z.string().trim().min(1),
    noteJa: z.string().trim().min(1).optional(),
    register: z.enum(["neutral", "formal", "informal", "technical"]).optional(),
  })
  .strict();

const exampleSentenceSchema = z
  .object({
    id: z.string().min(1),
    en: z.string().trim().min(1),
    ja: z.string().trim().min(1),
    stage: z.number().int().min(0).max(6),
  })
  .strict();

export const vocabularyItemSchema = z
  .object({
    id: itemIdSchema,
    schemaVersion: z.string().regex(semverPattern),
    contentRevision: z.number().int().min(1).default(1),
    stage: z.number().int().min(0).max(6),
    headword: z.string().trim().min(1),
    lemma: z.string().trim().min(1),
    partOfSpeech: z.enum([
      "noun",
      "verb",
      "adjective",
      "adverb",
      "pronoun",
      "preposition",
      "conjunction",
      "determiner",
      "phrase",
      "other",
    ]),
    meanings: z.array(meaningSchema).min(1),
    pronunciation: z
      .object({
        ipa: z.string().trim().min(1).optional(),
        kanaGuide: z.string().trim().min(1).optional(),
        audioAsset: z.string().trim().min(1).optional(),
      })
      .strict()
      .optional(),
    exampleSentences: z.array(exampleSentenceSchema).min(1),
    collocations: z.array(z.string().trim().min(1)).default([]),
    synonyms: z.array(z.string().trim().min(1)).default([]),
    antonyms: z.array(z.string().trim().min(1)).default([]),
    confusionGroupIds: z.array(z.string().trim().min(1)).default([]),
    tags: z.array(z.string().trim().min(1)).min(1),
    cefrHint: z.enum(["pre-A1", "A1", "A2", "B1"]).optional(),
    source: contentSourceSchema,
  })
  .strict();

const lessonSectionSchema = z
  .object({
    id: z.string().min(1),
    type: z.enum([
      "explanation",
      "examples",
      "exercise",
      "recall",
      "speaking",
      "summary",
    ]),
    titleJa: z.string().trim().min(1),
    bodyJa: z.string().trim().min(1).optional(),
    examples: z
      .array(
        z
          .object({
            en: z.string().trim().min(1),
            ja: z.string().trim().min(1),
          })
          .strict(),
      )
      .optional(),
    exerciseIds: z.array(itemIdSchema).optional(),
    estimatedMinutes: z.number().min(0).default(1),
  })
  .strict();

export const lessonSchema = z
  .object({
    id: itemIdSchema,
    schemaVersion: z.string().regex(semverPattern),
    contentRevision: z.number().int().min(1).default(1),
    stage: z.number().int().min(0).max(6),
    unitId: z.string().min(1),
    order: z.number().int().min(1),
    titleJa: z.string().trim().min(1),
    descriptionJa: z.string().trim().min(1).optional(),
    objectivesJa: z.array(z.string().trim().min(1)).min(1),
    prerequisites: z.array(itemIdSchema).default([]),
    sections: z.array(lessonSectionSchema).min(1),
    estimatedMinutes: z.number().int().min(1).max(60),
    reviewItemKeys: z.array(z.string().min(3)).default([]),
    source: contentSourceSchema,
  })
  .strict();

export const exerciseTypeSchema = z.enum([
  "multipleChoice",
  "multiSelect",
  "trueFalse",
  "textInput",
  "cloze",
  "sentenceOrder",
  "matching",
  "listenAndChoose",
  "dictation",
  "readingQuestion",
  "selfRecall",
  "writingPrompt",
  "speakingPrompt",
]);

export const exerciseSchema = z
  .object({
    id: itemIdSchema,
    schemaVersion: z.string().regex(semverPattern),
    contentRevision: z.number().int().min(1).default(1),
    type: exerciseTypeSchema,
    stage: z.number().int().min(0).max(6),
    lessonId: itemIdSchema.optional(),
    prompt: z.string().trim().min(1),
    instructionsJa: z.string().trim().min(1).optional(),
    payload: z.record(z.string(), z.unknown()),
    answer: z.unknown(),
    explanation: z.string().trim().min(1),
    hints: z.array(z.string().trim().min(1)).default([]),
    targetSkills: z
      .array(
        z.enum([
          "vocabulary",
          "grammar",
          "reading",
          "listening",
          "writing",
          "speaking",
        ]),
      )
      .min(1),
    targetMasteryDimensions: z
      .array(z.enum(["recognition", "recall", "listening", "spelling", "context"]))
      .default([]),
    reviewItemKeys: z.array(z.string().min(3)).default([]),
    estimatedSeconds: z.number().int().min(1).max(3600),
    tags: z.array(z.string().trim().min(1)).default([]),
    source: contentSourceSchema,
  })
  .strict();

export const practiceSetSchema = z
  .object({
    id: itemIdSchema,
    schemaVersion: z.string().regex(semverPattern),
    contentRevision: z.number().int().min(1).default(1),
    type: z.enum(["reading", "listening", "summary", "opinion", "speaking", "mock"]),
    stage: z.number().int().min(0).max(6),
    titleJa: z.string().trim().min(1),
    descriptionJa: z.string().trim().min(1),
    estimatedMinutes: z.number().int().min(1).max(120),
    payload: z.record(z.string(), z.unknown()),
    tags: z.array(z.string().trim().min(1)).default([]),
    source: contentSourceSchema,
  })
  .strict();

const contentPackMetadataShape = {
  id: itemIdSchema,
  schemaVersion: z.string().regex(semverPattern),
  contentVersion: z.string().regex(semverPattern),
  locale: z.literal("ja-JP"),
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  generatedAt: z.string().datetime({ offset: true }),
  source: contentSourceSchema,
};

export const contentPackEnvelopeSchema = z
  .object({
    ...contentPackMetadataShape,
    vocabulary: z.array(z.unknown()),
    lessons: z.array(z.unknown()),
    exercises: z.array(z.unknown()),
    practiceSets: z.array(z.unknown()).default([]),
  })
  .strict();

export const contentPackSchema = z
  .object({
    ...contentPackMetadataShape,
    vocabulary: z.array(vocabularyItemSchema),
    lessons: z.array(lessonSchema),
    exercises: z.array(exerciseSchema),
    practiceSets: z.array(practiceSetSchema).default([]),
  })
  .strict();

export type ContentSource = z.infer<typeof contentSourceSchema>;
export type VocabularyItem = z.infer<typeof vocabularyItemSchema>;
export type Lesson = z.infer<typeof lessonSchema>;
export type Exercise = z.infer<typeof exerciseSchema>;
export type PracticeSet = z.infer<typeof practiceSetSchema>;
export type ContentPack = z.infer<typeof contentPackSchema>;
