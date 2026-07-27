import type {
  Attempt,
  DailyPlan,
  StudySession,
  VocabularyUserState,
} from "../../domain/models";
import type { ResolvedStudyDay } from "../../domain/planning";
import type { ReadingPracticeSet } from "./schema";

export interface ReadingContentPort {
  listReadingSets(): Promise<readonly ReadingPracticeSet[]>;
  getReadingSet(id: string): Promise<ReadingPracticeSet | undefined>;
}

export interface ReadingPlanContext {
  planDate: string;
  blockId: string;
  itemKey: string;
}

export interface ReadingClock {
  now(): Date;
}

export type ReadingStudyDayResolver = (
  now: Date,
) => ResolvedStudyDay | Promise<ResolvedStudyDay>;

export interface ReadingQuestionResponse {
  questionId: string;
  choiceIndex: number;
  evidenceSentenceId: string;
  responseTimeMs: number;
}

export interface CompleteReadingInput {
  setId: string;
  session: StudySession;
  attempts: readonly Attempt[];
  completedAt: string;
  planContext?: ReadingPlanContext;
}

export interface CompleteReadingResult {
  session: StudySession;
  attempts: readonly Attempt[];
  dailyPlan?: DailyPlan;
}

export interface ReadingHistory {
  sessions: readonly StudySession[];
  attempts: readonly Attempt[];
}

export interface ReadingLearningStore {
  completePractice(input: CompleteReadingInput): Promise<CompleteReadingResult>;
  addVocabularyFavorite(vocabularyItemId: string, updatedAt: string): Promise<void>;
  getVocabularyUserState(itemKey: string): Promise<VocabularyUserState | undefined>;
  loadHistory(setId: string): Promise<ReadingHistory>;
}

export interface ReadingHubPageProps {
  content: ReadingContentPort;
  onSelectSet: (set: ReadingPracticeSet) => void;
}

export interface ReadingPracticePageProps {
  setId: string;
  content: ReadingContentPort;
  store: ReadingLearningStore;
  clock?: ReadingClock;
  studyDayResolver?: ReadingStudyDayResolver;
  planContext?: ReadingPlanContext;
  onComplete?: (result: CompleteReadingResult) => void | Promise<void>;
  onExit?: () => void;
}

export interface ReadingQuestionResult extends ReadingQuestionResponse {
  correct: boolean;
  evidenceCorrect: boolean;
}
