import type {
  Attempt,
  CommitAnswerInput,
  CommitAnswerResult,
  MasteryDimension,
  MasteryProfile,
  StudySession,
  VocabularyUserState,
} from "../../domain/models";
import type { ReviewConfidence, ReviewRating, ReviewState } from "../../domain/review";
import type { VocabularyLevel } from "../../domain/vocabulary";
import type { VocabularyItem } from "../../infrastructure/content/schemas";

export type VocabularySessionMode =
  "new" | "due" | "weak" | "quickSort" | "listening" | "spelling" | "context";

export type VocabularyQuestionLevel = VocabularyLevel;

export type VocabularyQuestionKind =
  | "recognitionChoice"
  | "selfRecall"
  | "recallChoice"
  | "initialLetter"
  | "spelling"
  | "cloze"
  | "dictation";

export interface VocabularyQuestion {
  id: string;
  itemKey: string;
  level: VocabularyQuestionLevel;
  kind: VocabularyQuestionKind;
  prompt: string;
  instructionsJa: string;
  answer: string | number | boolean;
  choices: readonly string[];
  choiceItemKeys?: readonly string[];
  hintJa?: string;
  passage?: string;
  speechText?: string;
  targetDimensions: readonly MasteryDimension[];
}

export interface VocabularyStudySnapshot {
  reviewStates: readonly ReviewState[];
  masteryProfiles: readonly MasteryProfile[];
  userStates: readonly VocabularyUserState[];
  attempts: readonly Attempt[];
}

export interface VocabularyStudyRecord {
  item: VocabularyItem;
  itemKey: string;
  reviewState?: ReviewState;
  mastery?: MasteryProfile;
  userState?: VocabularyUserState;
  recentAttempts: readonly Attempt[];
}

export interface VocabularyCollections {
  all: readonly VocabularyStudyRecord[];
  newItems: readonly VocabularyStudyRecord[];
  due: readonly VocabularyStudyRecord[];
  weak: readonly VocabularyStudyRecord[];
}

export interface VocabularyContentPort {
  listVocabulary(): Promise<readonly VocabularyItem[]>;
  getVocabulary(id: string): Promise<VocabularyItem | undefined>;
}

export interface SaveWordStateInput {
  userState: VocabularyUserState;
  reviewState?: ReviewState;
}

export interface VocabularyStudyStore {
  loadSnapshot(): Promise<VocabularyStudySnapshot>;
  saveWordState(input: SaveWordStateInput): Promise<void>;
  startSession(session: StudySession): Promise<void>;
  commitAnswer(input: CommitAnswerInput): Promise<CommitAnswerResult>;
  finishSession(sessionId: string, endedAt: string): Promise<StudySession>;
}

export interface VocabularyClock {
  now(): Date;
}

export interface VocabularyStartOptions {
  limit?: 5 | 10 | 15;
  level?: VocabularyQuestionLevel;
}

export interface VocabularyPageCallbacks {
  onStart?: (mode: VocabularySessionMode, options?: VocabularyStartOptions) => void;
  onOpenList?: () => void;
  onOpenWord?: (wordId: string) => void;
  onBack?: () => void;
}

export interface VocabularyHubPageProps extends VocabularyPageCallbacks {
  content: VocabularyContentPort;
  store: VocabularyStudyStore;
  clock?: VocabularyClock;
  configuredNewLimit?: number;
}

export interface VocabularyListPageProps extends VocabularyPageCallbacks {
  content: VocabularyContentPort;
  store: VocabularyStudyStore;
}

export interface WordDetailPageProps extends VocabularyPageCallbacks {
  wordId: string;
  content: VocabularyContentPort;
  store: VocabularyStudyStore;
  clock?: VocabularyClock;
}

export interface VocabularySessionPageProps extends VocabularyPageCallbacks {
  mode: VocabularySessionMode;
  content: VocabularyContentPort;
  store: VocabularyStudyStore;
  clock?: VocabularyClock;
  limit?: number;
  level?: VocabularyQuestionLevel;
}

export interface VocabularyAnswerObservation {
  question: VocabularyQuestion;
  response: unknown;
  correct: boolean;
  confidence: ReviewConfidence;
  hintCount: number;
  responseTimeMs: number;
  suggestedRating: ReviewRating;
  finalRating: ReviewRating;
}

export interface VocabularySessionSummary {
  studiedCount: number;
  answerCount: number;
  firstTrySuccessCount: number;
  relearnedCount: number;
  uncertainCount: number;
  nextDueTodayCount: number;
  nextDueLaterCount: number;
}

export interface VocabularyQueueEntry {
  itemKey: string;
  record: VocabularyStudyRecord;
  level: VocabularyQuestionLevel;
  repeated: boolean;
}

export interface VocabularyConfusionComparison {
  itemKey: string;
  headword: string;
  meaningJa: string;
  exampleEn?: string;
  exampleJa?: string;
  sharedGroupIds: readonly string[];
  isRecordedConfusion: boolean;
}
