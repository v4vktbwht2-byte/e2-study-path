import type { MasteryDimension, MasteryExerciseMode, MasteryProfile } from "../mastery";
import type {
  ResponseSpeed,
  ResponseTimingKind,
  ReviewConfidence,
  ReviewState,
} from "../review";

export type VocabularyLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type VocabularyQuestionFormat =
  | "englishToJapaneseChoice"
  | "englishRecallReveal"
  | "japaneseToEnglishChoice"
  | "initialLetterInput"
  | "fullSpellingInput"
  | "contextCloze"
  | "audioSpellingInput";

export type VocabularyLevelSelectionReason =
  | "manual"
  | "newItem"
  | "lowRecognition"
  | "recognitionPractice"
  | "lowRecall"
  | "recallPractice"
  | "lowSpelling"
  | "lowContext"
  | "lowListening"
  | "maintenance";

export interface SelectVocabularyLevelInput {
  reviewState: Readonly<ReviewState>;
  mastery: Readonly<MasteryProfile>;
  now: Date;
  manualLevel?: VocabularyLevel;
}

export interface VocabularyLevelSelection {
  level: VocabularyLevel;
  format: VocabularyQuestionFormat;
  reason: VocabularyLevelSelectionReason;
  isDue: boolean;
  elapsedDaysSinceLastReview: number;
  selectedAutomatically: boolean;
}

export type VocabularyJudgmentMode = "strict" | "practice";
export type VocabularyAnswerOutcome = "exact" | "tolerated" | "incorrect";

export interface JudgeVocabularyAnswerInput {
  answer: string;
  acceptedAnswers: readonly string[];
  mode: VocabularyJudgmentMode;
  /**
   * 練習モードで許容する編集距離。省略時は4文字以上の答えに限り1文字まで。
   * strictモードでは常に0として扱う。
   */
  practiceMaxEditDistance?: number;
}

export interface VocabularyAnswerJudgment {
  correct: boolean;
  exact: boolean;
  outcome: VocabularyAnswerOutcome;
  normalizedAnswer: string;
  matchedAnswer?: string;
  editDistance?: number;
}

export interface VocabularyAttemptSnapshot {
  attemptedAt: string;
  correct: boolean;
  responseSpeed?: ResponseSpeed;
  confidence?: ReviewConfidence;
  confusedWithItemKey?: string;
}

export interface WeakWordCandidate {
  itemKey: string;
  reviewState: Readonly<ReviewState>;
  mastery: Readonly<MasteryProfile>;
  recentAttempts: readonly VocabularyAttemptSnapshot[];
}

export type WeakWordReason =
  | "repeatedLapses"
  | "recentErrors"
  | "slowResponse"
  | "lowConfidence"
  | "recognitionRecallGap"
  | "confusionError";

export interface WeakWordThresholds {
  lapseCount: number;
  recentAttemptCount: number;
  recentIncorrectCount: number;
  recognitionRecallGap: number;
}

export interface WeakWord {
  itemKey: string;
  score: number;
  reasons: readonly WeakWordReason[];
}

export type QuickSortResult = "unknown" | "unsure" | "known";
export type QuickSortNextAction = "introduce" | "confirmSoon" | "verifyRecognition";

export interface QuickSortAnswer {
  itemKey: string;
  result: QuickSortResult;
}

export interface RankedQuickSortItem extends QuickSortAnswer {
  priority: number;
  nextAction: QuickSortNextAction;
  recommendedLevel: VocabularyLevel;
  /** Quick Sort単独では長期定着扱いにしない。 */
  marksMastered: false;
}

export interface ConfusionVocabularyItem {
  itemKey: string;
  headword: string;
  confusionGroupIds: readonly string[];
}

export interface ConfusionComparisonCandidate {
  itemKey: string;
  headword: string;
  sharedGroupIds: readonly string[];
  isRecordedConfusion: boolean;
}

export interface SelectConfusionCandidatesInput {
  target: Readonly<ConfusionVocabularyItem>;
  candidates: readonly Readonly<ConfusionVocabularyItem>[];
  confusedWithItemKey?: string;
  limit?: number;
}

export interface VocabularyMasteryMapping {
  level: VocabularyLevel;
  format: VocabularyQuestionFormat;
  exerciseMode: MasteryExerciseMode;
  responseTimingKind: ResponseTimingKind;
  targetDimensions: readonly MasteryDimension[];
  targetWeights?: Readonly<Partial<Record<MasteryDimension, number>>>;
}
