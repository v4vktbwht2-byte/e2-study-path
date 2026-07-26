import type {
  AppSettings,
  CommitAnswerInput,
  CommitAnswerResult,
  DailyPlan,
  LessonProgress,
  MasteryProfile,
  StudySession,
  UserProfile,
  VocabularyUserState,
  WritingSubmission,
} from "./models";
import type { ReviewState } from "./review/types";

export interface ProfileRepository {
  get(): Promise<UserProfile | undefined>;
  save(profile: UserProfile): Promise<void>;
}

export interface SettingsRepository {
  get(): Promise<AppSettings | undefined>;
  save(settings: AppSettings): Promise<void>;
}

export interface ReviewStateRepository {
  get(itemKey: string): Promise<ReviewState | undefined>;
  listDue(dueAtOrBefore: string): Promise<ReviewState[]>;
  save(state: ReviewState): Promise<void>;
}

export interface MasteryRepository {
  get(itemKey: string): Promise<MasteryProfile | undefined>;
  save(profile: MasteryProfile): Promise<void>;
}

export interface VocabularyUserStateRepository {
  get(itemKey: string): Promise<VocabularyUserState | undefined>;
  save(state: VocabularyUserState): Promise<void>;
}

export interface LessonProgressRepository {
  get(lessonId: string): Promise<LessonProgress | undefined>;
  save(progress: LessonProgress): Promise<void>;
}

export interface StudySessionRepository {
  get(id: string): Promise<StudySession | undefined>;
  save(session: StudySession): Promise<void>;
}

export interface DailyPlanRepository {
  get(date: string): Promise<DailyPlan | undefined>;
  save(plan: DailyPlan): Promise<void>;
}

export interface WritingSubmissionRepository {
  get(id: string): Promise<WritingSubmission | undefined>;
  save(submission: WritingSubmission): Promise<void>;
  listByPrompt(promptId: string): Promise<WritingSubmission[]>;
}

export interface AnswerCommitRepository {
  commit(input: CommitAnswerInput): Promise<CommitAnswerResult>;
}
