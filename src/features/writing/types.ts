import type {
  Attempt,
  DailyPlan,
  StudySession,
  WritingSubmission,
} from "../../domain/models";
import type {
  OpinionOutline,
  WritingRubricChecks,
  WritingType,
} from "../../domain/writing";
import type { ResolvedStudyDay } from "../../domain/planning";
import type { PracticeSet } from "../../infrastructure/content/schemas";

export interface SummaryPromptPayload {
  instructionsJa: string;
  sourceText: string;
  keyPoints: readonly string[];
  focusJa: string;
  targetWordMin: 45;
  targetWordMax: 55;
}

export interface OpinionPromptPayload {
  instructionsJa: string;
  topic: string;
  topicJa: string;
  points: readonly string[];
  targetWordMin: 80;
  targetWordMax: 100;
}

export type SummaryWritingPrompt = PracticeSet & {
  type: "summary";
  payload: SummaryPromptPayload;
};

export type OpinionWritingPrompt = PracticeSet & {
  type: "opinion";
  payload: OpinionPromptPayload;
};

export type WritingPrompt = SummaryWritingPrompt | OpinionWritingPrompt;

export type WritingSubmissionRecord = WritingSubmission;

export interface WritingPlanContext {
  planDate: string;
  blockId: string;
  itemKey: string;
}

export interface WritingCommitInput {
  submission: WritingSubmissionRecord & { submittedAt: string };
  attempt: Attempt & { correct: null };
  session: StudySession & { type: "practice"; endedAt: string };
  planContext?: WritingPlanContext;
}

export interface WritingCommitResult {
  submission: WritingSubmissionRecord & { submittedAt: string };
  attempt: Attempt & { correct: null };
  session: StudySession & { type: "practice"; endedAt: string };
  dailyPlan?: DailyPlan;
}

export interface WritingLearningPort {
  listSubmissions(promptId: string): Promise<WritingSubmissionRecord[]>;
  saveDraft(submission: WritingSubmissionRecord): Promise<void>;
  commitSubmission(input: WritingCommitInput): Promise<WritingCommitResult>;
}

export interface WritingClock {
  now(): Date;
}

export type WritingStudyDayResolver = (
  now: Date,
) => ResolvedStudyDay | Promise<ResolvedStudyDay>;

export interface WritingEditorSnapshot {
  submissionId: string;
  promptId: string;
  type: WritingType;
  draft: string;
  summaryMemo: string;
  opinionOutline: OpinionOutline;
  rubric: WritingRubricChecks;
  createdAt: string;
  updatedAt: string;
}

export interface WritingPageProps {
  practiceSets: readonly PracticeSet[];
  port: WritingLearningPort;
  initialPromptId?: string;
  planContext?: WritingPlanContext;
  clock?: WritingClock;
  studyDayResolver?: WritingStudyDayResolver;
  autosaveDelayMs?: number;
  onReturnToToday?: () => void;
}
