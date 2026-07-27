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
import {
  DAILY_PLAN_MODES,
  calculateDailyPlanCapacity,
  type DailyPlanCategory,
  type DailyPlanMode,
} from "../../domain/planning";
import type { ReviewState } from "../../domain/review/types";
import type { Exercise, Lesson, PracticeSet, VocabularyItem } from "../content/schemas";
import {
  pendingUpdateWriteCoordinator as defaultPendingUpdateWriteCoordinator,
  type PendingUpdateWriteCoordinator,
} from "../pwa/pendingWrites";

export const DB_NAME = "e2-study-path";
export const DB_VERSION = 2;

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

const LEGACY_CATEGORY_MAP: Readonly<Record<string, DailyPlanCategory>> = {
  overdue: "overdueReview",
  due: "dueReview",
  weak: "weakItem",
  lesson: "currentLesson",
  new: "newVocabulary",
  skill: "skillPractice",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function finiteNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/**
 * Phase 02の旧DailyPlan契約を、block単位の完了状態を持つ現行契約へ変換する。
 * 現行recordと判定できる場合、同じ参照を返して不要な書換えを避ける。
 */
export function migrateLegacyDailyPlanRecord(value: unknown): unknown {
  if (!isRecord(value) || !Array.isArray(value.blocks)) {
    return value;
  }
  if (
    isRecord(value.capacity) &&
    value.blocks.every(
      (block) =>
        isRecord(block) &&
        typeof block.blockId === "string" &&
        typeof block.itemId === "string" &&
        typeof block.category === "string" &&
        (block.status === "pending" || block.status === "completed"),
    )
  ) {
    return value;
  }
  if (typeof value.date !== "string" || typeof value.generatedAt !== "string") {
    return value;
  }

  const targetMinutes = Math.max(1, Math.round(finiteNumber(value.targetMinutes, 15)));
  const mode: DailyPlanMode =
    typeof value.mode === "string" &&
    DAILY_PLAN_MODES.includes(value.mode as DailyPlanMode)
      ? (value.mode as DailyPlanMode)
      : "standard";
  const completedLegacyIds = new Set(
    Array.isArray(value.completedBlockIds)
      ? value.completedBlockIds.filter((id): id is string => typeof id === "string")
      : [],
  );
  const blocks = value.blocks.flatMap((legacyBlock) => {
    if (!isRecord(legacyBlock) || typeof legacyBlock.id !== "string") {
      return [];
    }
    const legacyBlockId = legacyBlock.id;
    const category =
      typeof legacyBlock.type === "string"
        ? LEGACY_CATEGORY_MAP[legacyBlock.type]
        : undefined;
    if (category === undefined) {
      return [];
    }
    const itemIds = Array.isArray(legacyBlock.itemKeys)
      ? legacyBlock.itemKeys.filter(
          (itemKey): itemKey is string => typeof itemKey === "string",
        )
      : [];
    const normalizedItemIds = itemIds.length > 0 ? itemIds : [legacyBlock.id];
    return normalizedItemIds.map((itemId, index) => ({
      blockId:
        normalizedItemIds.length === 1
          ? legacyBlockId
          : `${legacyBlockId}:${index + 1}`,
      itemId,
      category,
      estimatedSeconds: Math.max(
        1,
        Math.round(finiteNumber(legacyBlock.estimatedSeconds, 60)),
      ),
      status: completedLegacyIds.has(legacyBlockId)
        ? ("completed" as const)
        : ("pending" as const),
    }));
  });
  const capacity = calculateDailyPlanCapacity(targetMinutes, mode);
  const plannedSeconds = blocks.reduce(
    (total, block) => total + block.estimatedSeconds,
    0,
  );
  const sourceSnapshot = isRecord(value.sourceSnapshot) ? value.sourceSnapshot : {};

  return {
    date: value.date,
    generatedAt: value.generatedAt,
    targetMinutes: capacity.requestedMinutes,
    mode,
    blocks,
    completedBlockIds: blocks
      .filter((block) => block.status === "completed")
      .map((block) => block.blockId),
    sourceSnapshot: {
      dueCount: Math.max(0, Math.round(finiteNumber(sourceSnapshot.dueCount, 0))),
      overdueCount: Math.max(
        0,
        Math.round(finiteNumber(sourceSnapshot.overdueCount, 0)),
      ),
      newLimit: Math.max(0, Math.round(finiteNumber(sourceSnapshot.newLimit, 0))),
    },
    capacity,
    plannedSeconds,
    remainingBudgetSeconds:
      capacity.budgetSeconds === null
        ? null
        : Math.max(0, capacity.budgetSeconds - plannedSeconds),
  };
}

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

  constructor(
    name = DB_NAME,
    options?: DexieOptions,
    readonly pendingWriteCoordinator: PendingUpdateWriteCoordinator = defaultPendingUpdateWriteCoordinator,
  ) {
    super(name, options);
    this.version(1).stores(DB_VERSION_1_STORES);
    this.version(DB_VERSION)
      .stores(DB_VERSION_1_STORES)
      .upgrade(async (transaction) => {
        await transaction
          .table("dailyPlans")
          .toCollection()
          .modify((record: unknown) => {
            const migrated = migrateLegacyDailyPlanRecord(record);
            if (migrated !== record && isRecord(record) && isRecord(migrated)) {
              for (const key of Object.keys(record)) {
                delete record[key];
              }
              Object.assign(record, migrated);
            }
          });
      });
  }

  runUserDataWrite<T>(key: string, write: () => Promise<T>): Promise<T> {
    return this.pendingWriteCoordinator.trackPendingUpdateWrite(key, write);
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
