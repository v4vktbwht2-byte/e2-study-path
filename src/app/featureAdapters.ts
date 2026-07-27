import type { StudySession } from "../domain/models";
import {
  completeDailyPlanBlock,
  resolveStudyDay,
  type ResolvedStudyDay,
} from "../domain/planning";
import type { ProfileRepository } from "../domain/repositories";
import {
  createNewReviewState,
  scheduleReview,
  type StudyDayBoundary,
} from "../domain/review";
import type {
  LessonAttemptCommitInput,
  LessonLearningStore,
  LessonReviewCheckpointInput,
  LessonSessionIdentity,
  LessonStudyDayResolver,
  LessonTerminalCommitInput,
} from "../features/lesson";
import type { Exercise, Lesson } from "../infrastructure/content/schemas";
import { getAppDb, type AppDb } from "../infrastructure/db/appDb";
import {
  DexieLessonProgressRepository,
  DexieProfileRepository,
  DEFAULT_SETTINGS,
} from "../infrastructure/db/repositories";

export interface CurriculumContentAdapter {
  listLessons(): Promise<readonly Lesson[]>;
}

export interface LessonContentAdapter {
  getLesson(id: string): Promise<Lesson | undefined>;
  getExercises(ids: readonly string[]): Promise<readonly Exercise[]>;
}

export type LessonProgressAdapter = LessonLearningStore;

export interface Phase03FeatureAdapters {
  profileRepository: ProfileRepository;
  curriculumContent: CurriculumContentAdapter;
  lessonContent: LessonContentAdapter;
  lessonProgressStore: LessonProgressAdapter;
  studyDayResolver: LessonStudyDayResolver;
}

export function getDeviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function createAppStudyDayResolver(
  db: AppDb = getAppDb(),
  timeZone = getDeviceTimeZone(),
): (now: Date) => Promise<ResolvedStudyDay> {
  return async (now) => {
    const settings = (await db.settings.get("settings")) ?? DEFAULT_SETTINGS;
    return resolveStudyDay(now, {
      timeZone,
      hour: settings.studyDayStartHour,
    });
  };
}

function appendUnique(
  values: readonly string[],
  additions: readonly string[],
): string[] {
  return [...new Set([...values, ...additions])];
}

function lessonReviewItemKeys(lesson: Lesson): string[] {
  return lesson.reviewItemKeys.length > 0
    ? [...lesson.reviewItemKeys]
    : [`lesson:${lesson.id}`];
}

function buildLessonSession(
  identity: LessonSessionIdentity,
  existing: StudySession | undefined,
  itemKeys: readonly string[],
  completedItemKeys: readonly string[],
  endedAt?: string,
): StudySession {
  return {
    id: identity.id,
    type: "lesson",
    startedAt: existing?.startedAt ?? identity.startedAt,
    ...(endedAt !== undefined
      ? { endedAt }
      : existing?.endedAt === undefined
        ? {}
        : { endedAt: existing.endedAt }),
    studyDate: existing?.studyDate ?? identity.studyDate,
    itemKeys: appendUnique(existing?.itemKeys ?? [], itemKeys),
    completedItemKeys: appendUnique(
      existing?.completedItemKeys ?? [],
      completedItemKeys,
    ),
    interrupted: false,
  };
}

async function interruptPreviousLessonSessions(
  db: AppDb,
  identity: LessonSessionIdentity,
): Promise<void> {
  const identitySuffix = `:${identity.startedAt}`;
  const prefix = identity.id.endsWith(identitySuffix)
    ? `${identity.id.slice(0, -identitySuffix.length)}:`
    : identity.id;
  const unfinished = (await db.sessions.toArray()).filter(
    (session) =>
      session.id !== identity.id &&
      session.type === "lesson" &&
      session.endedAt === undefined &&
      session.id.startsWith(prefix),
  );
  if (unfinished.length > 0) {
    await db.sessions.bulkPut(
      unfinished.map((session) => ({
        ...session,
        endedAt: identity.startedAt,
        interrupted: true,
      })),
    );
  }
}

async function recordLessonAttempt(
  db: AppDb,
  input: LessonAttemptCommitInput,
): Promise<void> {
  await db.transaction("rw", [db.attempts, db.sessions], async () => {
    await interruptPreviousLessonSessions(db, input.session);
    const currentSession = await db.sessions.get(input.session.id);
    const completedItemKeys =
      input.attempt.correct === false ? [] : [input.attempt.itemKey];
    const session = buildLessonSession(
      input.session,
      currentSession,
      [input.attempt.itemKey],
      completedItemKeys,
    );

    // putを使い、UIから同じ回答を再送した場合も二重計上しない。
    await db.attempts.put(input.attempt);
    await db.sessions.put(session);
  });
}

async function saveLessonReviewCheckpoint(
  db: AppDb,
  input: LessonReviewCheckpointInput,
) {
  return db.transaction("rw", db.lessonProgress, async () => {
    if (input.planContext.itemKey !== `lesson:${input.lessonId}`) {
      throw new Error("日次プランのレッスンと、開いているレッスンが一致しません。");
    }
    const current = (await db.lessonProgress.get(input.lessonId)) ?? input.progress;
    if (current.status !== "completed" && current.status !== "skipped") {
      throw new Error("完了済みレッスンだけが復習位置を保存できます。");
    }
    const next = {
      ...current,
      updatedAt: input.updatedAt,
      reviewCheckpoint: {
        planDate: input.planContext.planDate,
        blockId: input.planContext.blockId,
        currentSectionIndex: input.currentSectionIndex,
        answeredExerciseIds: [...new Set(input.answeredExerciseIds)],
        updatedAt: input.updatedAt,
      },
    };
    await db.lessonProgress.put(next);
    return next;
  });
}

async function commitLessonTerminal(
  db: AppDb,
  input: LessonTerminalCommitInput,
  studyDayBoundary: StudyDayBoundary,
): Promise<void> {
  const itemKeys =
    input.planContext === undefined
      ? lessonReviewItemKeys(input.lesson)
      : appendUnique(lessonReviewItemKeys(input.lesson), [input.planContext.itemKey]);
  const now = new Date(input.progress.updatedAt);

  await db.transaction(
    "rw",
    [db.lessonProgress, db.reviewStates, db.sessions, db.dailyPlans],
    async () => {
      if (
        input.planContext !== undefined &&
        input.planContext.itemKey !== `lesson:${input.lesson.id}`
      ) {
        throw new Error("日次プランのレッスンと、開いているレッスンが一致しません。");
      }
      await interruptPreviousLessonSessions(db, input.session);
      await db.lessonProgress.put(input.progress);

      const currentSession = await db.sessions.get(input.session.id);
      await db.sessions.put(
        buildLessonSession(
          input.session,
          currentSession,
          itemKeys,
          itemKeys,
          input.progress.updatedAt,
        ),
      );

      for (const itemKey of itemKeys) {
        const existing = await db.reviewStates.get(itemKey);

        if (input.progress.status === "skipped") {
          if (existing === undefined) {
            await db.reviewStates.put(createNewReviewState(itemKey, now));
          }
          continue;
        }

        // スキップで作られたnew状態も、後から完了したらGoodとして学習開始する。
        if (
          existing === undefined ||
          existing.status === "new" ||
          input.planContext !== undefined
        ) {
          const initial = existing ?? createNewReviewState(itemKey, now);
          await db.reviewStates.put(
            scheduleReview({
              state: initial,
              rating: "good",
              now,
              speedAdjustmentEnabled: false,
              studyDayBoundary,
            }),
          );
        }
      }

      if (input.planContext !== undefined) {
        const currentPlan = await db.dailyPlans.get(input.planContext.planDate);
        if (currentPlan === undefined) {
          throw new Error(
            `日次プラン ${input.planContext.planDate} が見つかりません。`,
          );
        }
        const targetBlock = currentPlan.blocks.find(
          (block) => block.blockId === input.planContext?.blockId,
        );
        if (
          targetBlock !== undefined &&
          targetBlock.itemId !== input.planContext.itemKey
        ) {
          throw new Error("日次プランの項目とレッスン開始情報が一致しません。");
        }
        await db.dailyPlans.put(
          completeDailyPlanBlock(currentPlan, input.planContext.blockId),
        );
      }
    },
  );
}

/**
 * Feature UIからDexieの詳細を隠す、小さなapplication adapter。
 * テストでは各Featureへ同じ構造のメモリ実装を注入できる。
 */
export function createPhase03FeatureAdapters(
  db: AppDb = getAppDb(),
): Phase03FeatureAdapters {
  const progressRepository = new DexieLessonProgressRepository(db);
  const timeZone = getDeviceTimeZone();
  const studyDayResolver = createAppStudyDayResolver(db, timeZone);

  return {
    profileRepository: new DexieProfileRepository(db),
    studyDayResolver,
    curriculumContent: {
      async listLessons() {
        const lessons = await db.lessons.toArray();
        return lessons.sort(
          (left, right) =>
            left.stage - right.stage ||
            left.order - right.order ||
            left.id.localeCompare(right.id),
        );
      },
    },
    lessonContent: {
      getLesson(id) {
        return db.lessons.get(id);
      },
      async getExercises(ids) {
        const exercises = await db.exercises.bulkGet([...ids]);
        return exercises.filter(
          (exercise): exercise is Exercise => exercise !== undefined,
        );
      },
    },
    lessonProgressStore: {
      get(id) {
        return progressRepository.get(id);
      },
      save(progress) {
        if (progress.status === "completed" || progress.status === "skipped") {
          return Promise.reject(
            new Error("完了・学習済みの進捗は、復習状態と同時に保存してください。"),
          );
        }
        return progressRepository.save(progress);
      },
      recordAttempt(input) {
        return db.runUserDataWrite(`lesson-attempt:${input.attempt.id}`, () =>
          recordLessonAttempt(db, input),
        );
      },
      saveReviewCheckpoint(input) {
        return db.runUserDataWrite(`lesson-review-checkpoint:${input.lessonId}`, () =>
          saveLessonReviewCheckpoint(db, input),
        );
      },
      commitTerminal(input) {
        return db.runUserDataWrite(`lesson-terminal:${input.lesson.id}`, async () => {
          const settings = (await db.settings.get("settings")) ?? DEFAULT_SETTINGS;
          return commitLessonTerminal(db, input, {
            timeZone,
            hour: settings.studyDayStartHour,
          });
        });
      },
    },
  };
}
