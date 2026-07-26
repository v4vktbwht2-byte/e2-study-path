/**
 * 復習ドメインで永続化する状態。
 *
 * `docs/08_DATA_MODEL_AND_INDEXEDDB.md` と
 * `contracts/review-state.schema.json` の契約をそのまま表す。
 */
export type ReviewStatus = "new" | "learning" | "review" | "relearning" | "suspended";

export type ReviewRating = "again" | "hard" | "good" | "easy";

export type ReviewConfidence = "none" | "low" | "medium" | "high";

export type ResponseSpeed = "fast" | "normal" | "slow";

export interface ReviewState {
  itemKey: string;
  status: ReviewStatus;
  learningStep: number;
  intervalDays: number;
  easeBias: number;
  dueAt: string;
  lastReviewedAt?: string;
  firstLearnedAt?: string;
  reviewCount: number;
  lapseCount: number;
  consecutiveSuccesses: number;
  predictedRetention?: number;
  lastRating?: ReviewRating;
  lastResponseTimeMs?: number;
  suspendedReason?: string;
  updatedAt: string;
}

export interface StudyDayBoundary {
  /** IANAタイムゾーン名。例: `Asia/Tokyo` */
  timeZone: string;
  /** 学習日の開始時（0〜23）。 */
  hour: number;
  /** 学習日の開始分（0〜59）。 */
  minute?: number;
}

export type ResponseTimingKind =
  "recognitionChoice" | "recallChoice" | "typing" | "cloze" | "listening";

export interface ResponseTiming {
  kind: ResponseTimingKind;
  responseTimeMs: number;
  /** listeningの場合の音声長。未指定時は0として扱う。 */
  audioDurationMs?: number;
}

export interface ScheduleReviewInput {
  state: Readonly<ReviewState>;
  rating: ReviewRating;
  /** 呼び出し側から注入する現在時刻。 */
  now: Date;
  responseTimeMs?: number;
  responseSpeed?: ResponseSpeed;
  responseTiming?: ResponseTiming;
  confidence?: ReviewConfidence;
  hintCount?: number;
  /**
   * falseの場合、間隔計算から回答速度の補正を完全に除外する。
   * アクセシビリティ設定や利用者傾向に応じて使用する。
   */
  speedAdjustmentEnabled?: boolean;
  /** 1日以上先のdueAtを学習日開始時刻へそろえる設定。 */
  studyDayBoundary?: StudyDayBoundary;
}

/**
 * 将来アルゴリズムを差し替えるための最小境界。
 * 実装は現在時刻を内部取得せず、必ず入力から受け取る。
 */
export interface ReviewScheduler {
  schedule(input: ScheduleReviewInput): ReviewState;
}

export interface SuggestedRatingInput {
  correct: boolean;
  hintCount?: number;
  confidence?: ReviewConfidence;
  responseSpeed?: ResponseSpeed;
  responseTiming?: ResponseTiming;
  speedAdjustmentEnabled?: boolean;
}

export interface ReviewPriorityInput {
  state: Readonly<ReviewState>;
  now: Date;
  examImportanceScore?: number;
  userPinned?: boolean;
}

export interface ReviewPriorityBreakdown {
  priority: number;
  riskScore: number;
  overdueScore: number;
  lapseScore: number;
  examImportanceScore: number;
  userPinnedScore: number;
  predictedRetention: number;
}

export interface ReviewQueueCandidate<T = unknown> {
  state: Readonly<ReviewState>;
  examImportanceScore?: number;
  userPinned?: boolean;
  /** 軽いインターリーブに使う問題形式。 */
  questionFormat?: string;
  data?: T;
}

export interface RankedReviewQueueItem<T = unknown> extends ReviewQueueCandidate<T> {
  priority: ReviewPriorityBreakdown;
}

export interface RankReviewQueueOptions {
  /** true（既定）の場合は期限到来済みだけを返す。 */
  dueOnly?: boolean;
  /** 同形式の連続を避けるために先読みする最大件数。 */
  interleaveWindow?: number;
}

export interface SessionQueueItem {
  itemKey: string;
}

export interface AgainReinsertionResult<T extends SessionQueueItem> {
  queue: T[];
  insertionIndex: number;
  questionsBetween: number;
  minimumSpacingMet: boolean;
  /** 最低間隔を満たすため、追加で必要な別問題数。 */
  additionalQuestionsNeeded: number;
}

export type RetentionBand = "stable" | "reviewSoon" | "dueToday" | "highRisk";
