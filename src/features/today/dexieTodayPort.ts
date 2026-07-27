import type { AppDb } from "../../infrastructure/db/appDb";
import { mergeDailyPlanCompletions } from "../../domain/planning";
import type { TodayDataPort } from "./types";

/**
 * Today feature専用の読み取り境界。
 * 画面はDexie tableを直接参照せず、1つの整合したsnapshotとして受け取る。
 */
export function createDexieTodayPort(db: AppDb): TodayDataPort {
  return {
    loadSnapshot() {
      return db.transaction(
        "r",
        [
          db.profiles,
          db.settings,
          db.reviewStates,
          db.mastery,
          db.attempts,
          db.vocabularyUserStates,
          db.vocabulary,
          db.exercises,
          db.lessons,
          db.lessonProgress,
          db.practiceSets,
          db.dailyPlans,
        ],
        async () => {
          const [
            profile,
            settings,
            reviewStates,
            masteryProfiles,
            attempts,
            vocabularyUserStates,
            vocabulary,
            exercises,
            lessons,
            lessonProgress,
            practiceSets,
            dailyPlans,
          ] = await Promise.all([
            db.profiles.get("local-user"),
            db.settings.get("settings"),
            db.reviewStates.toArray(),
            db.mastery.toArray(),
            db.attempts.toArray(),
            db.vocabularyUserStates.toArray(),
            db.vocabulary.toArray(),
            db.exercises.toArray(),
            db.lessons.toArray(),
            db.lessonProgress.toArray(),
            db.practiceSets.toArray(),
            db.dailyPlans.toArray(),
          ]);
          return {
            ...(profile === undefined ? {} : { profile }),
            ...(settings === undefined ? {} : { settings }),
            reviewStates,
            masteryProfiles,
            attempts,
            vocabularyUserStates,
            vocabulary,
            exercises,
            lessons,
            lessonProgress,
            practiceSets,
            dailyPlans,
          };
        },
      );
    },
    async savePlan(plan) {
      return db.transaction("rw", db.dailyPlans, async () => {
        const latest = await db.dailyPlans.get(plan.date);
        const persisted =
          latest === undefined ? plan : mergeDailyPlanCompletions(latest, plan);
        await db.dailyPlans.put(persisted);
        return persisted;
      });
    },
  };
}
