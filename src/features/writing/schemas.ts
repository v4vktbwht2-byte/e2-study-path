import { z } from "zod";
import { EMPTY_OPINION_OUTLINE, WRITING_TYPES } from "../../domain/writing";
import {
  opinionPromptPayloadSchema,
  summaryPromptPayloadSchema,
} from "../../infrastructure/content/practiceSchemas";
import type { PracticeSet } from "../../infrastructure/content/schemas";
import type { WritingPrompt, WritingSubmissionRecord } from "./types";

export { opinionPromptPayloadSchema, summaryPromptPayloadSchema };

const opinionOutlineSchema = z
  .object({
    opinion: z.string(),
    reason1: z.string(),
    detail1: z.string(),
    reason2: z.string(),
    detail2: z.string(),
    conclusion: z.string(),
  })
  .strict()
  .default(EMPTY_OPINION_OUTLINE);

export const writingSubmissionRecordSchema = z
  .object({
    id: z.string().min(1),
    promptId: z.string().min(1),
    type: z.enum(WRITING_TYPES),
    draft: z.string(),
    wordCount: z.number().int().min(0),
    checklist: z.record(z.string(), z.boolean()),
    summaryMemo: z.string().default(""),
    opinionOutline: opinionOutlineSchema,
    createdAt: z.string().datetime({ offset: true }),
    updatedAt: z.string().datetime({ offset: true }),
    submittedAt: z.string().datetime({ offset: true }).optional(),
  })
  .strict();

export class WritingContentValidationError extends Error {
  constructor(
    readonly promptId: string,
    readonly issues: readonly string[],
  ) {
    super(`作文課題「${promptId}」の内容を読み込めません。`);
    this.name = "WritingContentValidationError";
  }
}

export function parseWritingPracticeSet(practiceSet: PracticeSet): WritingPrompt {
  if (practiceSet.type === "summary") {
    const result = summaryPromptPayloadSchema.safeParse(practiceSet.payload);
    if (!result.success) {
      throw new WritingContentValidationError(
        practiceSet.id,
        result.error.issues.map((issue) => issue.message),
      );
    }
    return {
      ...practiceSet,
      type: "summary",
      payload: result.data,
    };
  }

  if (practiceSet.type === "opinion") {
    const result = opinionPromptPayloadSchema.safeParse(practiceSet.payload);
    if (!result.success) {
      throw new WritingContentValidationError(
        practiceSet.id,
        result.error.issues.map((issue) => issue.message),
      );
    }
    return {
      ...practiceSet,
      type: "opinion",
      payload: result.data,
    };
  }

  throw new WritingContentValidationError(practiceSet.id, [
    "作文課題のtypeはsummaryまたはopinionにしてください。",
  ]);
}

export function parseWritingPracticeSets(
  practiceSets: readonly PracticeSet[],
): WritingPrompt[] {
  return practiceSets.map(parseWritingPracticeSet);
}

export function parseWritingSubmissionRecord(value: unknown): WritingSubmissionRecord {
  const parsed = writingSubmissionRecordSchema.parse(value);
  return parsed;
}
