import { completeDailyPlanBlock } from "../../domain/planning";
import type { AppDb } from "../../infrastructure/db/appDb";
import { DEFAULT_SETTINGS } from "../../infrastructure/db/repositories";
import { parseMockPracticeSet } from "./schema";
import type { MockPracticeStore } from "./types";

export function createDexieMockStore(db: AppDb): MockPracticeStore {
  return {
    async load() {
      return db.transaction("r", [db.practiceSets, db.settings], async () => {
        const [sets, settings] = await Promise.all([
          db.practiceSets.where("type").equals("mock").sortBy("stage"),
          db.settings.get("settings"),
        ]);
        return {
          sets: sets.map(parseMockPracticeSet),
          studyDayStartHour:
            settings?.studyDayStartHour ?? DEFAULT_SETTINGS.studyDayStartHour,
        };
      });
    },
    async complete(input) {
      const itemKey = input.session.itemKeys[0];
      if (
        itemKey === undefined ||
        input.attempts.length === 0 ||
        input.session.type !== "mock" ||
        !input.session.completedItemKeys.includes(itemKey) ||
        input.attempts.some(
          (attempt) =>
            attempt.sessionId !== input.session.id ||
            attempt.itemKey !== itemKey ||
            attempt.studyDate !== input.session.studyDate ||
            attempt.correct === null,
        ) ||
        (input.planContext !== undefined &&
          input.planContext.planDate !== input.session.studyDate)
      ) {
        throw new Error("短縮模試の回答と学習セッションが一致しません。");
      }
      await db.transaction(
        "rw",
        [db.attempts, db.sessions, db.dailyPlans],
        async () => {
          await db.attempts.bulkPut([...input.attempts]);
          await db.sessions.put(input.session);
          if (input.planContext === undefined) {
            return;
          }
          if (input.planContext.itemKey !== itemKey) {
            throw new Error("日次プランの項目と短縮模試が一致しません。");
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
          if (block?.itemId !== itemKey) {
            throw new Error("日次プランのblockと短縮模試が一致しません。");
          }
          await db.dailyPlans.put(
            completeDailyPlanBlock(plan, input.planContext.blockId),
          );
        },
      );
    },
  };
}
