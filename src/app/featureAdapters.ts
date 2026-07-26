import type { StudySession } from "../domain/models";
import type { ProfileRepository } from "../domain/repositories";
import { createNewReviewState, scheduleReview } from "../domain/review";
import type {
  LessonAttemptCommitInput,
  LessonLearningStore,
  LessonSessionIdentity,
  LessonTerminalCommitInput,
} from "../features/lesson";
import type { Exercise, Lesson } from "../infrastructure/content/schemas";
import { getAppDb, type AppDb } from "../infrastructure/db/appDb";
import {
  DexieLessonProgressRepository,
  DexieProfileRepository,
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

async function recordLessonAttempt(
  db: AppDb,
  input: LessonAttemptCommitInput,
): Promise<void> {
  await db.transaction("rw", [db.attempts, db.sessions], async () => {
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

async function commitLessonTerminal(
  db: AppDb,
  input: LessonTerminalCommitInput,
): Promise<void> {
  const itemKeys = lessonReviewItemKeys(input.lesson);
  const now = new Date(input.progress.updatedAt);

  await db.transaction(
    "rw",
    [db.lessonProgress, db.reviewStates, db.sessions],
    async () => {
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
        if (existing === undefined || existing.status === "new") {
          const initial = existing ?? createNewReviewState(itemKey, now);
          await db.reviewStates.put(
            scheduleReview({
              state: initial,
              rating: "good",
              now,
              speedAdjustmentEnabled: false,
            }),
          );
        }
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

  return {
    profileRepository: new DexieProfileRepository(db),
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
        return recordLessonAttempt(db, input);
      },
      commitTerminal(input) {
        return commitLessonTerminal(db, input);
      },
    },
  };
}
