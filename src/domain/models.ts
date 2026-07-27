import type { ReviewRating, ReviewState } from "./review/types";

export type Goal = "grade2" | "relearn" | "conversation" | "vocabulary";
export type Theme = "system" | "light" | "dark";
export type ReviewIntensity = "gentle" | "standard" | "strong";
export type MasteryDimension =
  "recognition" | "recall" | "listening" | "spelling" | "context";

export interface UserProfile {
  id: "local-user";
  createdAt: string;
  updatedAt: string;
  goals: Goal[];
  dailyMinutes: number;
  targetExamDate?: string;
  recommendedStage: number;
  selectedStage: number;
  onboardingCompleted: boolean;
  diagnosticCompletedAt?: string;
}

export interface AppSettings {
  id: "settings";
  theme: Theme;
  fontScale: number;
  reducedMotion: boolean;
  dailyNewVocabularyLimit: number;
  reviewIntensity: ReviewIntensity;
  speechRate: number;
  autoPlayAudio: boolean;
  showKanaPronunciationGuide: boolean;
  speedAdjustmentEnabled: boolean;
  studyDayStartHour: number;
}

export interface AppMeta {
  key: string;
  value: string;
  updatedAt: string;
}

export interface ContentPackMeta {
  id: string;
  schemaVersion: string;
  contentVersion: string;
  title: string;
  locale: "ja-JP";
  installedAt: string;
  checksum?: string;
  source: "bundled" | "imported";
  enabled: boolean;
}

export interface Attempt {
  id: string;
  itemKey: string;
  exerciseId?: string;
  sessionId: string;
  createdAt: string;
  studyDate: string;
  mode: string;
  response: unknown;
  /** 自動採点しない作文・会話ではnull。 */
  correct: boolean | null;
  score: number;
  responseTimeMs: number;
  hintCount: number;
  confidence?: "none" | "low" | "medium" | "high";
  suggestedRating?: ReviewRating;
  finalRating?: ReviewRating;
  /** 誤答時に選んだ、同じ混同グループ内の単語。 */
  confusedWithItemKey?: string;
}

export interface MasteryProfile {
  itemKey: string;
  recognition: number;
  recall: number;
  listening: number;
  spelling: number;
  context: number;
  lastUpdatedAt: string;
}

export interface VocabularyUserState {
  itemKey: string;
  favorite: boolean;
  note: string;
  suspended: boolean;
  updatedAt: string;
}

export interface LessonProgress {
  lessonId: string;
  status: "notStarted" | "inProgress" | "completed" | "skipped";
  currentSectionIndex: number;
  bestScore?: number;
  completedAt?: string;
  updatedAt: string;
}

export type StudySessionType =
  "daily" | "lesson" | "vocabulary" | "review" | "practice" | "mock";

export interface StudySession {
  id: string;
  type: StudySessionType;
  startedAt: string;
  endedAt?: string;
  studyDate: string;
  plannedMinutes?: number;
  itemKeys: string[];
  completedItemKeys: string[];
  interrupted: boolean;
}

export type DailyPlanMode = "light" | "standard" | "thorough" | "all";

export interface DailyPlanBlock {
  id: string;
  type: "overdue" | "due" | "weak" | "lesson" | "new" | "skill";
  titleJa: string;
  itemKeys: string[];
  estimatedSeconds: number;
  skill?: string;
}

export interface DailyPlan {
  date: string;
  generatedAt: string;
  targetMinutes: number;
  mode: DailyPlanMode;
  blocks: DailyPlanBlock[];
  completedBlockIds: string[];
  sourceSnapshot: {
    dueCount: number;
    overdueCount: number;
    newLimit: number;
  };
}

export interface WritingSubmission {
  id: string;
  promptId: string;
  type: "summary" | "opinion";
  draft: string;
  wordCount: number;
  checklist: Record<string, boolean>;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
}

export interface SpeakingRecording {
  id: string;
  promptId: string;
  createdAt: string;
  durationMs: number;
  mimeType: string;
  blob: Blob;
  selfAssessment: Record<string, number | boolean | string>;
}

export interface CommitAnswerInput {
  attempt: Attempt;
  reviewState: ReviewState;
  mastery: MasteryProfile;
  sessionId: string;
  dailyPlanDate?: string;
  completedPlanBlockId?: string;
}

export interface CommitAnswerResult {
  attempt: Attempt;
  reviewState: ReviewState;
  mastery: MasteryProfile;
  session: StudySession;
  dailyPlan?: DailyPlan;
}
