import type { AppDb } from "../../infrastructure/db/appDb";
import type { PracticeHubPort } from "./types";

export function createDexiePracticeHubPort(db: AppDb): PracticeHubPort {
  return {
    loadSets() {
      return db.practiceSets.orderBy("stage").toArray();
    },
  };
}
