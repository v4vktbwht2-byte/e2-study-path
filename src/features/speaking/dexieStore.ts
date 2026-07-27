import { completeDailyPlanBlock } from "../../domain/planning";
import type { AppDb } from "../../infrastructure/db/appDb";
import { DEFAULT_SETTINGS } from "../../infrastructure/db/repositories";
import { parseSpeakingPracticeSet } from "./schema";
import type { SpeakingPracticeStore } from "./types";

export function createDexieSpeakingStore(db: AppDb): SpeakingPracticeStore {
  return {
    async load() {
      return db.transaction("r", [db.practiceSets, db.settings], async () => {
        const [sets, settings] = await Promise.all([
          db.practiceSets.where("type").equals("speaking").sortBy("stage"),
          db.settings.get("settings"),
        ]);
        return {
          sets: sets.map(parseSpeakingPracticeSet),
          studyDayStartHour:
            settings?.studyDayStartHour ?? DEFAULT_SETTINGS.studyDayStartHour,
        };
      });
    },
    async saveRecording(recording) {
      await db.runUserDataWrite(`speaking:recording:${recording.id}`, () =>
        db.speakingRecordings.put(recording),
      );
    },
    async deleteRecording(recordingId) {
      await db.runUserDataWrite(`speaking:recording:${recordingId}`, () =>
        db.speakingRecordings.delete(recordingId),
      );
    },
    async complete(input) {
      if (
        input.attempt.correct !== null ||
        input.attempt.sessionId !== input.session.id ||
        input.attempt.studyDate !== input.session.studyDate ||
        input.session.type !== "practice" ||
        !input.session.itemKeys.includes(input.attempt.itemKey) ||
        !input.session.completedItemKeys.includes(input.attempt.itemKey) ||
        (input.planContext !== undefined &&
          input.planContext.planDate !== input.session.studyDate)
      ) {
        throw new Error("スピーキングの回答と学習セッションが一致しません。");
      }
      await db.runUserDataWrite(`speaking:complete:${input.session.id}`, () =>
        db.transaction("rw", [db.attempts, db.sessions, db.dailyPlans], async () => {
          await db.attempts.put(input.attempt);
          await db.sessions.put(input.session);
          if (input.planContext === undefined) {
            return;
          }
          if (input.planContext.itemKey !== input.attempt.itemKey) {
            throw new Error("日次プランの項目とスピーキング教材が一致しません。");
          }
          const plan = await db.dailyPlans.get(input.planContext.planDate);
          if (plan === undefined) {
            throw new Error(
              `日次プラン ${input.planContext.planDate} が見つかりません。`,
            );
          }
          const block = plan.blocks.find(
            (candidate) => candidate.blockId === input.planContext?.blockId,
          );
          if (block?.itemId !== input.planContext.itemKey) {
            throw new Error("日次プランのblockとスピーキング教材が一致しません。");
          }
          await db.dailyPlans.put(
            completeDailyPlanBlock(plan, input.planContext.blockId),
          );
        }),
      );
    },
  };
}
