import {
  aggregateProgress,
  type LessonCompletionRecord,
  type ProgressExerciseDescriptor,
  type ProgressItemDescriptor,
  type ProgressLessonDescriptor,
  type ProgressSkill,
} from "../../domain/progress";
import type { LessonProgress, StudySession } from "../../domain/models";
import { resolveStudyDay } from "../../domain/planning";
import type {
  Exercise,
  Lesson,
  PracticeSet,
  VocabularyItem,
} from "../../infrastructure/content/schemas";
import type { AppDb } from "../../infrastructure/db/appDb";
import { DEFAULT_SETTINGS } from "../../infrastructure/db/repositories";
import type { ProgressClock, ProgressDataPort } from "./types";

export const systemProgressClock: ProgressClock = {
  now: () => new Date(),
  timeZone: () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
};

function uniqueSkills(skills: readonly ProgressSkill[]): ProgressSkill[] {
  return [...new Set(skills)];
}

function practiceSkills(type: PracticeSet["type"]): ProgressSkill[] {
  switch (type) {
    case "reading":
      return ["reading"];
    case "listening":
      return ["listening"];
    case "summary":
    case "opinion":
      return ["writing"];
    case "speaking":
      return ["speaking"];
    case "mock":
      return [];
  }
}

function practicePath(type: PracticeSet["type"]): string {
  switch (type) {
    case "reading":
      return "/practice/reading";
    case "listening":
      return "/practice/listening";
    case "summary":
    case "opinion":
      return "/practice/writing";
    case "speaking":
      return "/practice/speaking";
    case "mock":
      return "/mock";
  }
}

function exerciseDescriptors(
  exercises: readonly Exercise[],
): ProgressExerciseDescriptor[] {
  return exercises.map((exercise) => ({
    exerciseId: exercise.id,
    skills: [...exercise.targetSkills],
  }));
}

function itemDescriptors(input: {
  vocabulary: readonly VocabularyItem[];
  lessons: readonly Lesson[];
  exercises: readonly Exercise[];
  practiceSets: readonly PracticeSet[];
}): ProgressItemDescriptor[] {
  const descriptors = new Map<string, ProgressItemDescriptor>();
  const add = (descriptor: ProgressItemDescriptor) => {
    const current = descriptors.get(descriptor.itemKey);
    if (current === undefined) {
      descriptors.set(descriptor.itemKey, descriptor);
      return;
    }
    descriptors.set(descriptor.itemKey, {
      ...current,
      skills: uniqueSkills([...current.skills, ...descriptor.skills]),
    });
  };

  for (const vocabulary of input.vocabulary) {
    add({
      itemKey: `vocab:${vocabulary.id}`,
      label: vocabulary.headword,
      skills: ["vocabulary"],
      path: `/vocabulary/${encodeURIComponent(vocabulary.id)}`,
    });
  }

  const lessonById = new Map(
    input.lessons.map((lesson) => [lesson.id, lesson] as const),
  );
  const exercisesByLesson = new Map<string, Exercise[]>();
  for (const exercise of input.exercises) {
    if (exercise.lessonId === undefined) {
      continue;
    }
    const values = exercisesByLesson.get(exercise.lessonId) ?? [];
    values.push(exercise);
    exercisesByLesson.set(exercise.lessonId, values);
  }
  for (const lesson of input.lessons) {
    const skills = uniqueSkills(
      (exercisesByLesson.get(lesson.id) ?? []).flatMap(
        ({ targetSkills }) => targetSkills,
      ),
    );
    const descriptor = {
      label: lesson.titleJa,
      skills: skills.length > 0 ? skills : (["grammar"] as const),
      path: `/lesson/${encodeURIComponent(lesson.id)}`,
    };
    add({ itemKey: `lesson:${lesson.id}`, ...descriptor });
    for (const itemKey of lesson.reviewItemKeys) {
      add({ itemKey, ...descriptor });
    }
  }
  for (const exercise of input.exercises) {
    const lesson =
      exercise.lessonId === undefined ? undefined : lessonById.get(exercise.lessonId);
    for (const itemKey of exercise.reviewItemKeys) {
      add({
        itemKey,
        label:
          lesson === undefined
            ? exercise.prompt
            : `${lesson.titleJa}：${exercise.prompt}`,
        skills: [...exercise.targetSkills],
        ...(lesson === undefined
          ? {}
          : { path: `/lesson/${encodeURIComponent(lesson.id)}` }),
      });
    }
  }

  for (const practiceSet of input.practiceSets) {
    add({
      itemKey: `practice:${practiceSet.id}`,
      label: practiceSet.titleJa,
      skills: practiceSkills(practiceSet.type),
      path: practicePath(practiceSet.type),
    });
  }

  return [...descriptors.values()];
}

function lessonDescriptors(lessons: readonly Lesson[]): ProgressLessonDescriptor[] {
  return lessons.map((lesson) => ({
    lessonId: lesson.id,
    stage: lesson.stage,
    title: lesson.titleJa,
  }));
}

function completionRecords(input: {
  lessonProgress: readonly LessonProgress[];
  sessions: readonly StudySession[];
  timeZone: string;
  studyDayStartHour: number;
}): LessonCompletionRecord[] {
  const sessionByEndTime = new Map(
    input.sessions.flatMap((session) =>
      session.endedAt === undefined
        ? []
        : ([[session.endedAt, session.studyDate]] as const),
    ),
  );
  return input.lessonProgress.flatMap((progress) => {
    if (progress.status !== "completed" || progress.completedAt === undefined) {
      return [];
    }
    const matchingSessionStudyDate = sessionByEndTime.get(progress.completedAt);
    if (matchingSessionStudyDate !== undefined) {
      return [
        {
          lessonId: progress.lessonId,
          studyDate: matchingSessionStudyDate,
        },
      ];
    }
    const completedAt = new Date(progress.completedAt);
    if (Number.isNaN(completedAt.getTime())) {
      return [];
    }
    return [
      {
        lessonId: progress.lessonId,
        studyDate: resolveStudyDay(completedAt, {
          timeZone: input.timeZone,
          hour: input.studyDayStartHour,
        }).studyDate,
      },
    ];
  });
}

export function createDexieProgressPort(
  db: AppDb,
  clock: ProgressClock = systemProgressClock,
): ProgressDataPort {
  return {
    async load(periodDays) {
      const now = clock.now();
      if (Number.isNaN(now.getTime())) {
        throw new Error("現在時刻を確認できませんでした。");
      }
      const snapshot = await db.transaction(
        "r",
        [
          db.profiles,
          db.settings,
          db.vocabulary,
          db.lessons,
          db.exercises,
          db.practiceSets,
          db.attempts,
          db.sessions,
          db.reviewStates,
          db.mastery,
          db.lessonProgress,
        ],
        async () => {
          const [
            profile,
            settings,
            vocabulary,
            lessons,
            exercises,
            practiceSets,
            attempts,
            sessions,
            reviewStates,
            masteryProfiles,
            progress,
          ] = await Promise.all([
            db.profiles.get("local-user"),
            db.settings.get("settings"),
            db.vocabulary.toArray(),
            db.lessons.toArray(),
            db.exercises.toArray(),
            db.practiceSets.toArray(),
            db.attempts.toArray(),
            db.sessions.toArray(),
            db.reviewStates.toArray(),
            db.mastery.toArray(),
            db.lessonProgress.toArray(),
          ]);
          return {
            profile,
            settings,
            vocabulary,
            lessons,
            exercises,
            practiceSets,
            attempts,
            sessions,
            reviewStates,
            masteryProfiles,
            progress,
          };
        },
      );
      const studyDayStartHour =
        snapshot.settings?.studyDayStartHour ?? DEFAULT_SETTINGS.studyDayStartHour;
      const timeZone = clock.timeZone();
      const endStudyDate = resolveStudyDay(now, {
        timeZone,
        hour: studyDayStartHour,
      }).studyDate;

      return aggregateProgress({
        endStudyDate,
        periodDays,
        now,
        currentStage: snapshot.profile?.selectedStage ?? 0,
        attempts: snapshot.attempts,
        sessions: snapshot.sessions,
        reviewStates: snapshot.reviewStates,
        masteryProfiles: snapshot.masteryProfiles,
        lessonProgress: snapshot.progress,
        items: itemDescriptors({
          vocabulary: snapshot.vocabulary,
          lessons: snapshot.lessons,
          exercises: snapshot.exercises,
          practiceSets: snapshot.practiceSets,
        }),
        exercises: exerciseDescriptors(snapshot.exercises),
        lessons: lessonDescriptors(snapshot.lessons),
        lessonCompletions: completionRecords({
          lessonProgress: snapshot.progress,
          sessions: snapshot.sessions,
          timeZone,
          studyDayStartHour,
        }),
      });
    },
  };
}
