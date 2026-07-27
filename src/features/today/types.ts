import type {
  AppSettings,
  Attempt,
  LessonProgress,
  MasteryProfile,
  UserProfile,
  VocabularyUserState,
} from "../../domain/models";
import type {
  DailyPlan,
  DailyPlanBlock,
  DailyPlanCandidate,
  DailyPlanMode,
  LearningSkill,
} from "../../domain/planning";
import type { ReviewState } from "../../domain/review";
import type {
  Exercise,
  Lesson,
  PracticeSet,
  VocabularyItem,
} from "../../infrastructure/content/schemas";

export interface TodayDataSnapshot {
  profile?: UserProfile;
  settings?: AppSettings;
  reviewStates: readonly ReviewState[];
  masteryProfiles: readonly MasteryProfile[];
  attempts: readonly Attempt[];
  vocabularyUserStates: readonly VocabularyUserState[];
  vocabulary: readonly VocabularyItem[];
  exercises: readonly Exercise[];
  lessons: readonly Lesson[];
  lessonProgress: readonly LessonProgress[];
  practiceSets: readonly PracticeSet[];
  dailyPlans: readonly DailyPlan[];
}

export interface TodayDataPort {
  loadSnapshot(): Promise<TodayDataSnapshot>;
  /** DB上の最新完了状態を統合した、実際に保存されたplanを返す。 */
  savePlan(plan: DailyPlan): Promise<DailyPlan>;
}

export interface TodayClock {
  now(): Date;
  timeZone(): string;
}

export interface TodaySource {
  snapshot: TodayDataSnapshot;
  studyDate: string;
  studyDayStartMs: number;
  candidates: readonly DailyPlanCandidate[];
  weakSkills: readonly LearningSkill[];
}

export interface TodayPlanPreview {
  mode: DailyPlanMode;
  plan: DailyPlan;
  pendingCount: number;
  reviewCount: number;
  newCount: number;
  estimatedMinutes: number;
}

export type TodayBlockAction =
  | {
      kind: "lesson";
      lessonId: string;
    }
  | {
      kind: "vocabulary";
      mode: "due" | "weak" | "new";
      limit: number;
    }
  | {
      kind: "practice";
      practiceSetId: string;
    }
  | {
      kind: "none";
    };

export interface TodayBlockPresentation {
  block: DailyPlanBlock;
  title: string;
  description: string;
  action: TodayBlockAction;
}

export interface TodayCompletionSummary {
  estimatedStudyMinutes: number;
  reviewCount: number;
  newCount: number;
  uncertainCount: number;
  nextDueLabel: string;
}

export interface TodayNavigationContext {
  planDate: string;
  blockId: string;
  itemKey: string;
}

export interface TodayPageProps {
  port: TodayDataPort;
  clock?: TodayClock;
  onRequireOnboarding?: () => void;
  onOpenLesson?: (lessonId: string, context: TodayNavigationContext) => void;
  onOpenVocabulary?: (
    mode: "due" | "weak" | "new",
    limit: number,
    context: TodayNavigationContext,
  ) => void;
  onOpenPractice?: (practiceSetId: string, context: TodayNavigationContext) => void;
  onOpenVocabularyHub?: () => void;
}
