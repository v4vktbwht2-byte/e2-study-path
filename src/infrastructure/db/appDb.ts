import Dexie, { type DexieOptions, type EntityTable } from "dexie";
import type {
  AppMeta,
  AppSettings,
  Attempt,
  ContentPackMeta,
  DailyPlan,
  LessonProgress,
  MasteryProfile,
  SpeakingRecording,
  StudySession,
  UserProfile,
  VocabularyUserState,
  WritingSubmission,
} from "../../domain/models";
import type { ReviewState } from "../../domain/review/types";
import type { Exercise, Lesson, PracticeSet, VocabularyItem } from "../content/schemas";

export const DB_NAME = "e2-study-path";
export const DB_VERSION = 1;

export const DB_VERSION_1_STORES = {
  profiles: "id",
  settings: "id",
  appMeta: "key",
  contentPacks: "id, contentVersion, installedAt, enabled",
  vocabulary: "id, stage, partOfSpeech, *tags, *confusionGroupIds",
  lessons: "id, stage, unitId, [stage+unitId], order",
  exercises: "id, type, stage, lessonId, *targetSkills, *tags",
  practiceSets: "id, type, stage, *tags",
  attempts:
    "id, itemKey, exerciseId, sessionId, createdAt, studyDate, [itemKey+createdAt]",
  reviewStates: "itemKey, status, dueAt, lastReviewedAt, [status+dueAt]",
  mastery: "itemKey, lastUpdatedAt",
  vocabularyUserStates: "itemKey, favorite, suspended, updatedAt",
  lessonProgress: "lessonId, status, updatedAt",
  sessions: "id, type, startedAt, studyDate, endedAt",
  dailyPlans: "date, generatedAt",
  writingSubmissions: "id, promptId, type, updatedAt",
  speakingRecordings: "id, promptId, createdAt",
} as const;

export class AppDb extends Dexie {
  profiles!: EntityTable<UserProfile, "id">;
  settings!: EntityTable<AppSettings, "id">;
  appMeta!: EntityTable<AppMeta, "key">;
  contentPacks!: EntityTable<ContentPackMeta, "id">;
  vocabulary!: EntityTable<VocabularyItem, "id">;
  lessons!: EntityTable<Lesson, "id">;
  exercises!: EntityTable<Exercise, "id">;
  practiceSets!: EntityTable<PracticeSet, "id">;
  attempts!: EntityTable<Attempt, "id">;
  reviewStates!: EntityTable<ReviewState, "itemKey">;
  mastery!: EntityTable<MasteryProfile, "itemKey">;
  vocabularyUserStates!: EntityTable<VocabularyUserState, "itemKey">;
  lessonProgress!: EntityTable<LessonProgress, "lessonId">;
  sessions!: EntityTable<StudySession, "id">;
  dailyPlans!: EntityTable<DailyPlan, "date">;
  writingSubmissions!: EntityTable<WritingSubmission, "id">;
  speakingRecordings!: EntityTable<SpeakingRecording, "id">;

  constructor(name = DB_NAME, options?: DexieOptions) {
    super(name, options);
    this.version(DB_VERSION).stores(DB_VERSION_1_STORES);
  }
}

let sharedDb: AppDb | undefined;

export function getAppDb() {
  sharedDb ??= new AppDb();
  return sharedDb;
}

export function resetSharedAppDbForTests() {
  sharedDb?.close();
  sharedDb = undefined;
}
