import type { LessonProgress } from "../../domain/models";
import type { Exercise, Lesson } from "../../infrastructure/content/schemas";

export type CurriculumStage = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type CourseProgressStatus = "notStarted" | "inProgress" | "completed";

export interface CurriculumStageDefinition {
  stage: CurriculumStage;
  titleJa: string;
  roleJa: string;
  goalJa: string;
}

/**
 * 教材の保存先をUIから隠す読み取りポート。
 * IndexedDB、テスト用メモリ、静的contentのどれでも注入できる。
 */
export interface CurriculumContentReader {
  listLessons(): Promise<readonly Lesson[]>;
}

export interface LessonContentReader {
  getLesson(lessonId: string): Promise<Lesson | undefined>;
  getExercises(exerciseIds: readonly string[]): Promise<readonly Exercise[]>;
}

/**
 * `domain/repositories.ts` のLessonProgressRepositoryと構造互換。
 */
export interface LessonProgressStore {
  get(lessonId: string): Promise<LessonProgress | undefined>;
  save(progress: LessonProgress): Promise<void>;
}

export interface CourseLessonSummary {
  lesson: Lesson;
  progress?: LessonProgress;
  status: LessonProgress["status"];
  completedForSequence: boolean;
  prerequisitesMet: boolean;
  unmetPrerequisiteIds: readonly string[];
  isRecommendedNext: boolean;
}

export interface CourseStageSummary {
  definition: CurriculumStageDefinition;
  lessons: readonly CourseLessonSummary[];
  status: CourseProgressStatus;
  completionRate: number;
  completedLessonCount: number;
  totalLessonCount: number;
  nextLesson?: CourseLessonSummary;
  isCurrentStage: boolean;
  isRecommendedStage: boolean;
}

export interface CourseMapSnapshot {
  stages: readonly CourseStageSummary[];
  recommendedNextLesson?: CourseLessonSummary;
}

export interface BuildCourseMapInput {
  lessons: readonly Lesson[];
  progressByLessonId: ReadonlyMap<string, LessonProgress>;
  currentStage: CurriculumStage;
  recommendedStage: CurriculumStage;
}
