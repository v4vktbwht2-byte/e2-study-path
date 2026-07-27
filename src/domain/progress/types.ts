import type { Attempt, LessonProgress, MasteryProfile, StudySession } from "../models";
import type { ReviewState } from "../review";

export const PROGRESS_PERIOD_DAYS = [7, 30] as const;
export type ProgressPeriodDays = (typeof PROGRESS_PERIOD_DAYS)[number];

export const PROGRESS_SKILLS = [
  "vocabulary",
  "grammar",
  "reading",
  "listening",
  "writing",
  "speaking",
] as const;
export type ProgressSkill = (typeof PROGRESS_SKILLS)[number];

export interface ProgressItemDescriptor {
  readonly itemKey: string;
  readonly label: string;
  readonly skills: readonly ProgressSkill[];
  readonly path?: string;
}

export interface ProgressExerciseDescriptor {
  readonly exerciseId: string;
  readonly skills: readonly ProgressSkill[];
}

export interface ProgressLessonDescriptor {
  readonly lessonId: string;
  readonly stage: number;
  readonly title: string;
}

export interface LessonCompletionRecord {
  readonly lessonId: string;
  readonly studyDate: string;
}

export interface ProgressAggregateInput {
  readonly endStudyDate: string;
  readonly periodDays: ProgressPeriodDays;
  readonly now: Date;
  readonly currentStage: number;
  readonly attempts: readonly Attempt[];
  readonly sessions: readonly StudySession[];
  readonly reviewStates: readonly ReviewState[];
  readonly masteryProfiles: readonly MasteryProfile[];
  readonly lessonProgress: readonly LessonProgress[];
  readonly items: readonly ProgressItemDescriptor[];
  readonly exercises: readonly ProgressExerciseDescriptor[];
  readonly lessons: readonly ProgressLessonDescriptor[];
  readonly lessonCompletions: readonly LessonCompletionRecord[];
}

export interface DailyProgress {
  readonly studyDate: string;
  readonly studyMinutes: number;
  readonly reviewCount: number;
  readonly newCount: number;
  readonly completedLessonCount: number;
  readonly active: boolean;
}

export interface ProgressTotals {
  readonly studyMinutes: number;
  readonly reviewCount: number;
  readonly newCount: number;
  readonly completedLessonCount: number;
  readonly activeDays: number;
}

export type SkillTrendDirection =
  "improving" | "steady" | "needsPractice" | "new" | "noData";

export interface SkillTrend {
  readonly skill: ProgressSkill;
  readonly score: number | null;
  readonly previousScore: number | null;
  readonly delta: number | null;
  readonly attemptCount: number;
  readonly direction: SkillTrendDirection;
  readonly summary: string;
}

export interface ProgressWeakItem {
  readonly itemKey: string;
  readonly label: string;
  readonly path?: string;
  readonly score: number;
  readonly errorRate: number;
  readonly averageResponseTimeMs: number;
  readonly lapseCount: number;
  readonly overdueDays: number;
  readonly reasons: readonly string[];
}

export interface RecognitionRecallGap {
  readonly itemKey: string;
  readonly label: string;
  readonly path?: string;
  readonly recognition: number;
  readonly recall: number;
  readonly gap: number;
}

export interface LapseInsight {
  readonly itemKey: string;
  readonly label: string;
  readonly path?: string;
  readonly lapseCount: number;
  readonly lastReviewedAt?: string;
}

export interface SlowResponseInsight {
  readonly itemKey: string;
  readonly label: string;
  readonly path?: string;
  readonly averageResponseTimeMs: number;
  readonly attemptCount: number;
}

export interface WeaknessSummary {
  readonly weakItems: readonly ProgressWeakItem[];
  readonly recognitionRecallGaps: readonly RecognitionRecallGap[];
  readonly lapses: readonly LapseInsight[];
  readonly slowResponses: readonly SlowResponseInsight[];
}

export interface StageProgress {
  readonly stage: number;
  readonly completedLessonCount: number;
  readonly totalLessonCount: number;
  readonly completionRate: number;
  readonly isCurrentStage: boolean;
}

export interface LearningContinuity {
  readonly currentStreak: number;
  readonly longestStreak: number;
  readonly totalActiveDays: number;
  readonly restartCount: number;
  readonly isRestartDay: boolean;
  readonly latestStudyDate?: string;
  readonly message: string;
}

export interface ProgressSnapshot {
  readonly period: {
    readonly days: ProgressPeriodDays;
    readonly startStudyDate: string;
    readonly endStudyDate: string;
  };
  readonly daily: readonly DailyProgress[];
  readonly totals: ProgressTotals;
  readonly skills: readonly SkillTrend[];
  readonly weakness: WeaknessSummary;
  readonly stages: readonly StageProgress[];
  readonly continuity: LearningContinuity;
  readonly textSummary: string;
  readonly hasActivity: boolean;
}
