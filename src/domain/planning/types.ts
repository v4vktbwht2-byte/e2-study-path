export const DAILY_PLAN_MODES = ["light", "standard", "thorough", "all"] as const;

export type DailyPlanMode = (typeof DAILY_PLAN_MODES)[number];

export const LEARNING_SKILLS = [
  "vocabulary",
  "grammar",
  "reading",
  "listening",
  "writing",
  "speaking",
] as const;

export type LearningSkill = (typeof LEARNING_SKILLS)[number];

export type CurriculumStage = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type DailyPlanCategory =
  | "overdueReview"
  | "dueReview"
  | "weakItem"
  | "currentLesson"
  | "newVocabulary"
  | "skillPractice";

interface CandidateBase {
  id: string;
  estimatedSeconds: number;
  priorityScore?: number;
  skill?: LearningSkill;
}

export interface ReviewCandidate extends CandidateBase {
  kind: "review";
  dueAtMs: number;
}

export interface WeakItemCandidate extends CandidateBase {
  kind: "weak";
}

export interface CurrentLessonCandidate extends CandidateBase {
  kind: "currentLesson";
}

export interface NewVocabularyCandidate extends CandidateBase {
  kind: "newVocabulary";
}

export interface SkillPracticeCandidate extends CandidateBase {
  kind: "skillPractice";
  skill: LearningSkill;
  minimumStage?: CurriculumStage;
}

export type DailyPlanCandidate =
  | ReviewCandidate
  | WeakItemCandidate
  | CurrentLessonCandidate
  | NewVocabularyCandidate
  | SkillPracticeCandidate;

export interface DailyPlanBlock {
  blockId: string;
  itemId: string;
  category: DailyPlanCategory;
  estimatedSeconds: number;
  status: "pending" | "completed";
  skill?: LearningSkill;
}

export interface CompletedDailyPlanBlock extends DailyPlanBlock {
  status: "completed";
}

export interface DailyPlanCapacity {
  requestedMinutes: number;
  effectiveMinutes: number | null;
  budgetSeconds: number | null;
  estimatedReviewItemCapacity: number;
}

export interface DailyPlanSourceSnapshot {
  dueCount: number;
  overdueCount: number;
  newLimit: number;
}

export interface DailyPlan {
  date: string;
  generatedAt: string;
  targetMinutes: number;
  mode: DailyPlanMode;
  blocks: readonly DailyPlanBlock[];
  completedBlockIds: readonly string[];
  sourceSnapshot: DailyPlanSourceSnapshot;
  capacity: DailyPlanCapacity;
  plannedSeconds: number;
  remainingBudgetSeconds: number | null;
}

export interface BuildDailyPlanInput {
  studyDate: string;
  nowMs: number;
  studyDayStartMs: number;
  targetMinutes: number;
  mode: DailyPlanMode;
  configuredNewItemLimit: number;
  currentStage: CurriculumStage;
  weakSkills?: readonly LearningSkill[];
  candidates: readonly DailyPlanCandidate[];
  completedBlocks?: readonly CompletedDailyPlanBlock[];
}
