import type { StudySession } from "../../domain/models";
import { completeDailyPlanBlock } from "../../domain/planning";
import type { AppDb } from "../../infrastructure/db/appDb";
import { parseReadingPracticeSet } from "./schema";
import { readingItemKey } from "./model";
import type {
  CompleteReadingInput,
  CompleteReadingResult,
  ReadingContentPort,
  ReadingHistory,
  ReadingLearningStore,
} from "./types";

export class ReadingPersistenceError extends Error {
  constructor(
    readonly code:
      | "INVALID_SESSION"
      | "INVALID_ATTEMPT"
      | "PLAN_NOT_FOUND"
      | "PLAN_ITEM_MISMATCH"
      | "VOCABULARY_NOT_FOUND",
    message: string,
  ) {
    super(message);
    this.name = "ReadingPersistenceError";
  }
}

function appendUnique(values: readonly string[], value: string): string[] {
  return values.includes(value) ? [...values] : [...values, value];
}

function assertCompletionInput(input: CompleteReadingInput): void {
  const itemKey = readingItemKey(input.setId);
  if (input.session.type !== "practice" || !input.session.itemKeys.includes(itemKey)) {
    throw new ReadingPersistenceError(
      "INVALID_SESSION",
      "読解教材と学習セッションが一致しません。",
    );
  }
  if (
    input.attempts.length === 0 ||
    input.attempts.some(
      (attempt) =>
        attempt.sessionId !== input.session.id ||
        attempt.itemKey !== itemKey ||
        attempt.mode !== "readingQuestion",
    )
  ) {
    throw new ReadingPersistenceError(
      "INVALID_ATTEMPT",
      "読解の回答と学習セッションが一致しません。",
    );
  }
  if (input.planContext !== undefined && input.planContext.itemKey !== itemKey) {
    throw new ReadingPersistenceError(
      "PLAN_ITEM_MISMATCH",
      "日次プランの項目と読解教材が一致しません。",
    );
  }
}

function completedSession(
  session: StudySession,
  itemKey: string,
  completedAt: string,
): StudySession {
  return {
    ...session,
    endedAt: completedAt,
    completedItemKeys: appendUnique(session.completedItemKeys, itemKey),
    interrupted: false,
  };
}

export function createDexieReadingContentPort(db: AppDb): ReadingContentPort {
  return {
    async listReadingSets() {
      const sets = await db.practiceSets.where("type").equals("reading").toArray();
      return sets
        .map((set) => parseReadingPracticeSet(set))
        .sort(
          (left, right) => left.stage - right.stage || left.id.localeCompare(right.id),
        );
    },

    async getReadingSet(id) {
      const set = await db.practiceSets.get(id);
      if (set === undefined || set.type !== "reading") {
        return undefined;
      }
      return parseReadingPracticeSet(set);
    },
  };
}

export function createDexieReadingLearningStore(db: AppDb): ReadingLearningStore {
  return {
    async completePractice(input): Promise<CompleteReadingResult> {
      assertCompletionInput(input);
      const itemKey = readingItemKey(input.setId);

      return db.transaction(
        "rw",
        [db.attempts, db.sessions, db.dailyPlans],
        async () => {
          await db.attempts.bulkPut(input.attempts);
          const session = completedSession(input.session, itemKey, input.completedAt);
          await db.sessions.put(session);

          let dailyPlan;
          if (input.planContext !== undefined) {
            const plan = await db.dailyPlans.get(input.planContext.planDate);
            if (plan === undefined) {
              throw new ReadingPersistenceError(
                "PLAN_NOT_FOUND",
                `日次プラン ${input.planContext.planDate} が見つかりません。`,
              );
            }
            const block = plan.blocks.find(
              (candidate) => candidate.blockId === input.planContext?.blockId,
            );
            if (block !== undefined && block.itemId !== itemKey) {
              throw new ReadingPersistenceError(
                "PLAN_ITEM_MISMATCH",
                "日次プランの項目と読解教材が一致しません。",
              );
            }
            dailyPlan = completeDailyPlanBlock(plan, input.planContext.blockId);
            await db.dailyPlans.put(dailyPlan);
          }

          return {
            session,
            attempts: [...input.attempts],
            ...(dailyPlan === undefined ? {} : { dailyPlan }),
          };
        },
      );
    },

    async addVocabularyFavorite(vocabularyItemId, updatedAt) {
      const itemKey = `vocab:${vocabularyItemId}`;
      await db.transaction("rw", [db.vocabulary, db.vocabularyUserStates], async () => {
        const vocabulary = await db.vocabulary.get(vocabularyItemId);
        if (vocabulary === undefined) {
          throw new ReadingPersistenceError(
            "VOCABULARY_NOT_FOUND",
            "追加する単語が単語帳に見つかりません。",
          );
        }
        const current = await db.vocabularyUserStates.get(itemKey);
        await db.vocabularyUserStates.put({
          itemKey,
          favorite: true,
          note: current?.note ?? "",
          suspended: current?.suspended ?? false,
          updatedAt,
        });
      });
    },

    getVocabularyUserState(itemKey) {
      return db.vocabularyUserStates.get(itemKey);
    },

    async loadHistory(setId): Promise<ReadingHistory> {
      const itemKey = readingItemKey(setId);
      const [attempts, sessions] = await Promise.all([
        db.attempts.where("itemKey").equals(itemKey).toArray(),
        db.sessions
          .where("type")
          .equals("practice")
          .filter((session) => session.itemKeys.includes(itemKey))
          .toArray(),
      ]);
      return {
        attempts: attempts.sort((left, right) =>
          right.createdAt.localeCompare(left.createdAt),
        ),
        sessions: sessions.sort((left, right) =>
          right.startedAt.localeCompare(left.startedAt),
        ),
      };
    },
  };
}
