import type { Attempt, DailyPlan, StudySession } from "../../domain/models";
import type { ResolvedStudyDay } from "../../domain/planning";
import type { AudioService } from "../../infrastructure/audio";
import type { ListeningPracticeSet } from "./schemas";

export type ListeningMode = "exam" | "review";

export interface ListeningPlanContext {
  planDate: string;
  blockId: string;
  itemKey: string;
}

export interface ListeningCompletionCommitInput {
  attempt: Attempt;
  session: StudySession;
  planContext?: ListeningPlanContext;
}

export interface ListeningCompletionCommitResult {
  attempt: Attempt;
  session: StudySession;
  dailyPlan?: DailyPlan;
}

export interface ListeningHistory {
  attempts: readonly Attempt[];
  sessions: readonly StudySession[];
}

export interface ListeningStudyStore {
  loadHistory(): Promise<ListeningHistory>;
  commitCompletion(
    input: ListeningCompletionCommitInput,
  ): Promise<ListeningCompletionCommitResult>;
}

export interface ListeningContentPort {
  listListeningSets(): Promise<readonly unknown[]>;
}

export interface ListeningClock {
  now(): Date;
}

export type ListeningStudyDayResolver = (
  now: Date,
) => ResolvedStudyDay | Promise<ResolvedStudyDay>;

export interface ListeningPageProps {
  content: ListeningContentPort;
  store: ListeningStudyStore;
  audio: AudioService;
  initialSetId?: string;
  planContext?: ListeningPlanContext;
  clock?: ListeningClock;
  studyDayResolver?: ListeningStudyDayResolver;
  idFactory?: (prefix: "attempt" | "session") => string;
  onComplete?: (
    set: ListeningPracticeSet,
    result: ListeningCompletionCommitResult,
  ) => void | Promise<void>;
  onBack?: () => void;
}
