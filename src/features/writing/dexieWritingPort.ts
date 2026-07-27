import { completeDailyPlanBlock } from "../../domain/planning";
import type { AppDb } from "../../infrastructure/db/appDb";
import { parseWritingSubmissionRecord, writingSubmissionRecordSchema } from "./schemas";
import type {
  WritingCommitInput,
  WritingCommitResult,
  WritingLearningPort,
} from "./types";

export type WritingPersistenceErrorCode =
  | "DRAFT_ALREADY_SUBMITTED"
  | "INVALID_SUBMISSION"
  | "INVALID_ATTEMPT"
  | "INVALID_SESSION"
  | "DAILY_PLAN_NOT_FOUND"
  | "DAILY_PLAN_ITEM_MISMATCH";

export class WritingPersistenceError extends Error {
  constructor(
    readonly code: WritingPersistenceErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "WritingPersistenceError";
  }
}

function assertCommitInput(input: WritingCommitInput): void {
  const submissionResult = writingSubmissionRecordSchema.safeParse(input.submission);
  if (!submissionResult.success || input.submission.submittedAt === undefined) {
    throw new WritingPersistenceError(
      "INVALID_SUBMISSION",
      "提出する作文データが正しくありません。",
    );
  }
  const itemKey = `practice:${input.submission.promptId}`;
  if (
    input.attempt.correct !== null ||
    input.attempt.score !== 0 ||
    input.attempt.itemKey !== itemKey ||
    input.attempt.sessionId !== input.session.id
  ) {
    throw new WritingPersistenceError(
      "INVALID_ATTEMPT",
      "自由作文の学習記録は自動採点せずに保存してください。",
    );
  }
  if (
    input.session.type !== "practice" ||
    input.session.endedAt === undefined ||
    !input.session.itemKeys.includes(itemKey) ||
    !input.session.completedItemKeys.includes(itemKey)
  ) {
    throw new WritingPersistenceError(
      "INVALID_SESSION",
      "作文セッションの完了情報が正しくありません。",
    );
  }
  if (
    input.planContext !== undefined &&
    (input.planContext.itemKey !== itemKey ||
      input.planContext.planDate !== input.session.studyDate)
  ) {
    throw new WritingPersistenceError(
      "DAILY_PLAN_ITEM_MISMATCH",
      "日次プランの項目と作文課題が一致しません。",
    );
  }
}

export function createDexieWritingLearningPort(db: AppDb): WritingLearningPort {
  return {
    async listSubmissions(promptId) {
      const records = await db.writingSubmissions
        .where("promptId")
        .equals(promptId)
        .toArray();
      return records
        .map((record) => parseWritingSubmissionRecord(record))
        .sort(
          (left, right) =>
            right.updatedAt.localeCompare(left.updatedAt) ||
            right.id.localeCompare(left.id),
        );
    },

    async saveDraft(submission) {
      const validated = parseWritingSubmissionRecord(submission);
      if (validated.submittedAt !== undefined) {
        throw new WritingPersistenceError(
          "DRAFT_ALREADY_SUBMITTED",
          "提出済みの作文を下書きとして上書きできません。",
        );
      }
      await db.runUserDataWrite(`writing-draft:${validated.id}`, () =>
        db.transaction("rw", db.writingSubmissions, async () => {
          const existing = await db.writingSubmissions.get(validated.id);
          if (existing?.submittedAt !== undefined) {
            throw new WritingPersistenceError(
              "DRAFT_ALREADY_SUBMITTED",
              "提出済みの作文を下書きとして上書きできません。",
            );
          }
          await db.writingSubmissions.put(validated);
        }),
      );
    },

    async commitSubmission(input): Promise<WritingCommitResult> {
      assertCommitInput(input);
      return db.runUserDataWrite(`writing-submission:${input.submission.id}`, () =>
        db.transaction(
          "rw",
          [db.writingSubmissions, db.attempts, db.sessions, db.dailyPlans],
          async () => {
            await db.writingSubmissions.put(input.submission);
            await db.attempts.add(input.attempt);
            await db.sessions.put(input.session);

            let dailyPlan;
            if (input.planContext !== undefined) {
              const plan = await db.dailyPlans.get(input.planContext.planDate);
              if (plan === undefined) {
                throw new WritingPersistenceError(
                  "DAILY_PLAN_NOT_FOUND",
                  "今日の学習プランが見つかりません。",
                );
              }
              const block = plan.blocks.find(
                (candidate) => candidate.blockId === input.planContext?.blockId,
              );
              if (block === undefined || block.itemId !== input.planContext.itemKey) {
                throw new WritingPersistenceError(
                  "DAILY_PLAN_ITEM_MISMATCH",
                  "日次プランの項目と作文課題が一致しません。",
                );
              }
              dailyPlan = completeDailyPlanBlock(plan, input.planContext.blockId);
              await db.dailyPlans.put(dailyPlan);
            }

            return {
              submission: input.submission,
              attempt: input.attempt,
              session: input.session,
              ...(dailyPlan === undefined ? {} : { dailyPlan }),
            };
          },
        ),
      );
    },
  };
}
