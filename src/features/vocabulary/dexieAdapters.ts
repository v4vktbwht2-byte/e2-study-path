import { DexieAnswerCommitRepository } from "../../infrastructure/db/repositories";
import type { AppDb } from "../../infrastructure/db/appDb";
import type { VocabularyContentPort, VocabularyStudyStore } from "./types";

export function createDexieVocabularyContentPort(db: AppDb): VocabularyContentPort {
  return {
    async listVocabulary() {
      const items = await db.vocabulary.toArray();
      return items.sort(
        (left, right) =>
          left.stage - right.stage || left.headword.localeCompare(right.headword, "en"),
      );
    },
    getVocabulary(id) {
      return db.vocabulary.get(id);
    },
  };
}

export function createDexieVocabularyStudyStore(db: AppDb): VocabularyStudyStore {
  const answerCommitRepository = new DexieAnswerCommitRepository(db);

  return {
    async loadSnapshot() {
      const [reviewStates, masteryProfiles, userStates, attempts] = await Promise.all([
        db.reviewStates.toArray(),
        db.mastery.toArray(),
        db.vocabularyUserStates.toArray(),
        db.attempts.toArray(),
      ]);
      return { reviewStates, masteryProfiles, userStates, attempts };
    },

    async saveWordState(input) {
      await db.transaction(
        "rw",
        [db.vocabularyUserStates, db.reviewStates],
        async () => {
          await db.vocabularyUserStates.put(input.userState);
          if (input.reviewState !== undefined) {
            await db.reviewStates.put(input.reviewState);
          }
        },
      );
    },

    async startSession(session) {
      await db.sessions.put(session);
    },

    commitAnswer(input) {
      return answerCommitRepository.commit(input);
    },

    async finishSession(sessionId, endedAt) {
      return db.transaction("rw", db.sessions, async () => {
        const session = await db.sessions.get(sessionId);
        if (session === undefined) {
          throw new Error(`学習セッション ${sessionId} が見つかりません。`);
        }
        const finished = { ...session, endedAt, interrupted: false };
        await db.sessions.put(finished);
        return finished;
      });
    },
  };
}
