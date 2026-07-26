import type { LessonProgress } from "../../domain/models";
import type { Lesson } from "../../infrastructure/content/schemas";
import { CURRICULUM_STAGES } from "./catalog";
import type {
  BuildCourseMapInput,
  CourseLessonSummary,
  CourseMapSnapshot,
  CourseProgressStatus,
  CourseStageSummary,
  CurriculumStage,
} from "./types";

function sortLessons(lessons: readonly Lesson[]): Lesson[] {
  return [...lessons].sort(
    (left, right) =>
      left.stage - right.stage ||
      left.order - right.order ||
      left.id.localeCompare(right.id),
  );
}

function completedForSequence(progress: LessonProgress | undefined): boolean {
  return progress?.status === "completed" || progress?.status === "skipped";
}

function stageStatus(lessons: readonly CourseLessonSummary[]): CourseProgressStatus {
  if (
    lessons.length > 0 &&
    lessons.every(({ completedForSequence: completed }) => completed)
  ) {
    return "completed";
  }
  if (
    lessons.some(
      ({ progress }) => progress !== undefined && progress.status !== "notStarted",
    )
  ) {
    return "inProgress";
  }
  return "notStarted";
}

function normalizeStage(value: number): CurriculumStage {
  return Math.min(6, Math.max(0, Math.round(value))) as CurriculumStage;
}

function findRecommendedLesson(
  lessons: readonly CourseLessonSummary[],
  currentStage: CurriculumStage,
): CourseLessonSummary | undefined {
  const unfinished = lessons.filter(({ completedForSequence: done }) => !done);
  const atOrAfterCurrent = unfinished.filter(
    ({ lesson }) => lesson.stage >= currentStage,
  );
  const candidates = atOrAfterCurrent.length > 0 ? atOrAfterCurrent : unfinished;
  return candidates.find(({ prerequisitesMet }) => prerequisitesMet) ?? candidates[0];
}

export function buildCourseMap(input: BuildCourseMapInput): CourseMapSnapshot {
  const sortedLessons = sortLessons(input.lessons);
  const completedIds = new Set(
    sortedLessons
      .filter((lesson) => completedForSequence(input.progressByLessonId.get(lesson.id)))
      .map(({ id }) => id),
  );

  const lessonSummaries: CourseLessonSummary[] = sortedLessons.map((lesson) => {
    const progress = input.progressByLessonId.get(lesson.id);
    const unmetPrerequisiteIds = lesson.prerequisites.filter(
      (id) => !completedIds.has(id),
    );
    return {
      lesson,
      progress,
      status: progress?.status ?? "notStarted",
      completedForSequence: completedForSequence(progress),
      prerequisitesMet: unmetPrerequisiteIds.length === 0,
      unmetPrerequisiteIds,
      isRecommendedNext: false,
    };
  });

  const currentStage = normalizeStage(input.currentStage);
  const recommendedStage = normalizeStage(input.recommendedStage);
  const recommendedNextLesson = findRecommendedLesson(lessonSummaries, currentStage);
  if (recommendedNextLesson !== undefined) {
    recommendedNextLesson.isRecommendedNext = true;
  }

  const stages: CourseStageSummary[] = CURRICULUM_STAGES.map((definition) => {
    const stageLessons = lessonSummaries.filter(
      ({ lesson }) => lesson.stage === definition.stage,
    );
    const completedLessonCount = stageLessons.filter(
      ({ completedForSequence: done }) => done,
    ).length;
    const totalLessonCount = stageLessons.length;
    return {
      definition,
      lessons: stageLessons,
      status: stageStatus(stageLessons),
      completionRate:
        totalLessonCount === 0
          ? 0
          : Math.round((completedLessonCount / totalLessonCount) * 100),
      completedLessonCount,
      totalLessonCount,
      nextLesson: stageLessons.find(({ completedForSequence: done }) => !done),
      isCurrentStage: definition.stage === currentStage,
      isRecommendedStage: definition.stage === recommendedStage,
    };
  });

  return { stages, recommendedNextLesson };
}

export async function loadCourseMap(
  content: {
    listLessons(): Promise<readonly Lesson[]>;
  },
  progressStore: {
    get(lessonId: string): Promise<LessonProgress | undefined>;
  },
  currentStage: CurriculumStage,
  recommendedStage: CurriculumStage,
): Promise<CourseMapSnapshot> {
  const lessons = await content.listLessons();
  const progressEntries = await Promise.all(
    lessons.map(async (lesson) => {
      const progress = await progressStore.get(lesson.id);
      return [lesson.id, progress] as const;
    }),
  );
  const progressByLessonId = new Map<string, LessonProgress>();
  for (const [lessonId, progress] of progressEntries) {
    if (progress !== undefined) {
      progressByLessonId.set(lessonId, progress);
    }
  }
  return buildCourseMap({
    lessons,
    progressByLessonId,
    currentStage,
    recommendedStage,
  });
}
