import { completeDailyPlanBlock } from "../../domain/planning";
import type { AppDb } from "../../infrastructure/db/appDb";
import type {
  ListeningCompletionCommitInput,
  ListeningContentPort,
  ListeningStudyStore,
} from "./types";

export type ListeningPersistenceErrorCode =
  | "INVALID_COMPLETION"
  | "DAILY_PLAN_NOT_FOUND"
  | "DAILY_PLAN_BLOCK_NOT_FOUND"
  | "DAILY_PLAN_ITEM_MISMATCH";

export class ListeningPersistenceError extends Error {
  constructor(
    readonly code: ListeningPersistenceErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ListeningPersistenceError";
  }
}

function validateCompletion(input: ListeningCompletionCommitInput): void {
  if (input.attempt.sessionId !== input.session.id) {
    throw new ListeningPersistenceError(
      "INVALID_COMPLETION",
      "回答と学習セッションのIDが一致しません。",
    );
  }
  if (!input.session.completedItemKeys.includes(input.attempt.itemKey)) {
    throw new ListeningPersistenceError(
      "INVALID_COMPLETION",
      "完了した教材が学習セッションに記録されていません。",
    );
  }
}

export function createDexieListeningContentPort(db: AppDb): ListeningContentPort {
  return {
    async listListeningSets() {
      return db.practiceSets.where("type").equals("listening").sortBy("stage");
    },
  };
}

export function createDexieListeningStudyStore(db: AppDb): ListeningStudyStore {
  return {
    async loadHistory() {
      const [attempts, sessions] = await db.transaction(
        "r",
        [db.attempts, db.sessions],
        () => Promise.all([db.attempts.toArray(), db.sessions.toArray()]),
      );
      const listeningAttempts = attempts.filter((attempt) =>
        attempt.mode.startsWith("listening:"),
      );
      const listeningSessionIds = new Set(
        listeningAttempts.map((attempt) => attempt.sessionId),
      );
      return {
        attempts: listeningAttempts,
        sessions: sessions.filter((session) => listeningSessionIds.has(session.id)),
      };
    },

    async commitCompletion(input) {
      validateCompletion(input);
      return db.transaction(
        "rw",
        [db.attempts, db.sessions, db.dailyPlans],
        async () => {
          await db.attempts.add(input.attempt);
          await db.sessions.put(input.session);

          let dailyPlan;
          if (input.planContext) {
            const currentPlan = await db.dailyPlans.get(input.planContext.planDate);
            if (!currentPlan) {
              throw new ListeningPersistenceError(
                "DAILY_PLAN_NOT_FOUND",
                `日次プラン ${input.planContext.planDate} が見つかりません。`,
              );
            }
            const block = currentPlan.blocks.find(
              (candidate) => candidate.blockId === input.planContext?.blockId,
            );
            if (!block) {
              throw new ListeningPersistenceError(
                "DAILY_PLAN_BLOCK_NOT_FOUND",
                "日次プランのリスニングblockが見つかりません。",
              );
            }
            if (
              input.planContext.itemKey !== input.attempt.itemKey ||
              block.itemId !== input.attempt.itemKey
            ) {
              throw new ListeningPersistenceError(
                "DAILY_PLAN_ITEM_MISMATCH",
                "日次プランの教材と完了したリスニング教材が一致しません。",
              );
            }
            dailyPlan = completeDailyPlanBlock(currentPlan, input.planContext.blockId);
            await db.dailyPlans.put(dailyPlan);
          }

          return {
            attempt: input.attempt,
            session: input.session,
            ...(dailyPlan === undefined ? {} : { dailyPlan }),
          };
        },
      );
    },
  };
}
