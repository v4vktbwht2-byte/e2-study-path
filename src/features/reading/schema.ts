import type { z } from "zod";
import {
  readingChoiceFeedbackSchema,
  readingParagraphSchema,
  readingPayloadSchema,
  readingPracticeSetSchema,
  readingQuestionSchema,
  readingSentenceSchema,
  readingVocabularySchema,
} from "../../infrastructure/content/practiceSchemas";

export {
  readingChoiceFeedbackSchema,
  readingParagraphSchema,
  readingPayloadSchema,
  readingPracticeSetSchema,
  readingQuestionSchema,
  readingSentenceSchema,
  readingVocabularySchema,
};

export type ReadingSentence = z.infer<typeof readingSentenceSchema>;
export type ReadingParagraph = z.infer<typeof readingParagraphSchema>;
export type ReadingChoiceFeedback = z.infer<typeof readingChoiceFeedbackSchema>;
export type ReadingQuestion = z.infer<typeof readingQuestionSchema>;
export type ReadingVocabulary = z.infer<typeof readingVocabularySchema>;
export type ReadingPayload = z.infer<typeof readingPayloadSchema>;
export type ReadingPracticeSet = z.infer<typeof readingPracticeSetSchema>;

export function parseReadingPracticeSet(value: unknown): ReadingPracticeSet {
  return readingPracticeSetSchema.parse(value);
}

export function parseReadingPracticeSets(
  values: readonly unknown[],
): ReadingPracticeSet[] {
  return values.map((value) => parseReadingPracticeSet(value));
}
