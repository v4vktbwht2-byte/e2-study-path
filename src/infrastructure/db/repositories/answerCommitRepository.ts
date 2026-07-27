import type { AnswerCommitRepository } from "../../../domain/repositories";
import type { CommitAnswerInput, CommitAnswerResult } from "../../../domain/models";
import { completeDailyPlanBlock } from "../../../domain/planning";
import type { AppDb } from "../appDb";

function appendUnique(values: readonly string[], value: string) {
  return values.includes(value) ? [...values] : [...values, value];
}

export class PersistenceError extends Error {
  constructor(
    readonly code:
      "SESSION_NOT_FOUND" | "DAILY_PLAN_NOT_FOUND" | "DAILY_PLAN_ITEM_MISMATCH",
    message: string,
  ) {
    super(message);
    this.name = "PersistenceError";
  }
}

export class DexieAnswerCommitRepository implements AnswerCommitRepository {
  constructor(private readonly db: AppDb) {}

  async commit(input: CommitAnswerInput): Promise<CommitAnswerResult> {
    return this.db.transaction(
      "rw",
      [
        this.db.attempts,
        this.db.reviewStates,
        this.db.mastery,
        this.db.sessions,
        this.db.dailyPlans,
      ],
      async () => {
        await this.db.attempts.add(input.attempt);
        await this.db.reviewStates.put(input.reviewState);
        await this.db.mastery.put(input.mastery);

        const currentSession = await this.db.sessions.get(input.sessionId);
        if (!currentSession) {
          throw new PersistenceError(
            "SESSION_NOT_FOUND",
            `学習セッション ${input.sessionId} が見つかりません。`,
          );
        }

        const session = {
          ...currentSession,
          completedItemKeys: appendUnique(
            currentSession.completedItemKeys,
            input.attempt.itemKey,
          ),
        };
        await this.db.sessions.put(session);

        let dailyPlan;
        if (input.dailyPlanDate) {
          const currentPlan = await this.db.dailyPlans.get(input.dailyPlanDate);
          if (!currentPlan) {
            throw new PersistenceError(
              "DAILY_PLAN_NOT_FOUND",
              `日次プラン ${input.dailyPlanDate} が見つかりません。`,
            );
          }

          if (input.completedPlanBlockId !== undefined) {
            const targetBlock = currentPlan.blocks.find(
              (block) => block.blockId === input.completedPlanBlockId,
            );
            if (
              targetBlock !== undefined &&
              targetBlock.itemId !== input.attempt.itemKey
            ) {
              throw new PersistenceError(
                "DAILY_PLAN_ITEM_MISMATCH",
                "日次プランの項目と回答した項目が一致しません。",
              );
            }
            dailyPlan = completeDailyPlanBlock(currentPlan, input.completedPlanBlockId);
          } else {
            dailyPlan = currentPlan;
          }
          await this.db.dailyPlans.put(dailyPlan);
        }

        return {
          attempt: input.attempt,
          reviewState: input.reviewState,
          mastery: input.mastery,
          session,
          dailyPlan,
        };
      },
    );
  }
}
