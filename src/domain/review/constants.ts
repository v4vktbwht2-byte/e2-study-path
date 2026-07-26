import type {
  ResponseTimingKind,
  ReviewConfidence,
  ReviewRating,
  StudyDayBoundary,
} from "./types";

export const MILLISECONDS_PER_MINUTE = 60_000;
export const MILLISECONDS_PER_DAY = 86_400_000;

export const LEARNING_STEPS = [
  { kind: "minutes", value: 10 },
  { kind: "days", value: 1 },
  { kind: "days", value: 3 },
] as const;

export const RELEARNING_STEPS = [
  { kind: "minutes", value: 10 },
  { kind: "days", value: 1 },
] as const;

export type ReviewStep =
  (typeof LEARNING_STEPS)[number] | (typeof RELEARNING_STEPS)[number];

export const RATING_MULTIPLIER: Readonly<Record<ReviewRating, number>> = {
  again: 0.25,
  hard: 1.2,
  good: 2,
  easy: 3,
};

export const SPEED_FACTOR = {
  fast: 1.15,
  normal: 1,
  slow: 0.85,
} as const;

export const CONFIDENCE_FACTOR: Readonly<Record<ReviewConfidence, number>> = {
  none: 0.75,
  low: 0.85,
  medium: 1,
  high: 1.1,
};

export const HINT_FACTOR = {
  none: 1,
  one: 0.85,
  many: 0.7,
} as const;

export const EASE_BIAS_DELTA: Readonly<Record<ReviewRating, number>> = {
  again: -0.08,
  hard: -0.03,
  good: 0,
  easy: 0.04,
};

export const REVIEW_LIMITS = {
  minimumEaseBias: 0.75,
  maximumEaseBias: 1.3,
  minimumReviewIntervalDays: 1,
  maximumReviewIntervalDays: 180,
  minimumRetentionIntervalDays: 0.25,
} as const;

export const REVIEW_GRADUATION_INTERVAL_DAYS = {
  learningGood: 7,
  learningEasy: 14,
  relearningMinimum: 2,
  relearningFactor: 0.35,
} as const;

export const HARD_STEP_MULTIPLIER = 1.5;
export const HARD_MINIMUM_DELAY_MINUTES = 30;
export const AGAIN_SESSION_MINIMUM_QUESTIONS = 3;

export const DEFAULT_STUDY_DAY_BOUNDARY: Readonly<StudyDayBoundary> = {
  timeZone: "UTC",
  hour: 0,
  minute: 0,
};

export const RETENTION_BASE = 0.9;

export const RETENTION_BAND_THRESHOLDS = {
  stable: 0.9,
  highRisk: 0.6,
} as const;

export const QUEUE_PRIORITY_WEIGHT = {
  risk: 0.45,
  overdue: 0.25,
  lapse: 0.15,
  examImportance: 0.1,
  userPinned: 0.05,
} as const;

export const QUEUE_LAPSE_NORMALIZATION_COUNT = 5;
export const DEFAULT_INTERLEAVE_WINDOW = 4;

export const BACKLOG_LIMITS = {
  overdueStopsNewItemsAbove: 40,
  dueCapacityRatio: 0.7,
  reducedNewItemLimit: 3,
} as const;

interface TimingThreshold {
  fastMs: number;
  normalUpperMs: number;
  relativeToAudio: boolean;
}

export const RESPONSE_TIMING_THRESHOLDS: Readonly<
  Record<ResponseTimingKind, TimingThreshold>
> = {
  recognitionChoice: {
    fastMs: 2_500,
    normalUpperMs: 8_000,
    relativeToAudio: false,
  },
  recallChoice: {
    fastMs: 4_000,
    normalUpperMs: 12_000,
    relativeToAudio: false,
  },
  typing: {
    fastMs: 6_000,
    normalUpperMs: 20_000,
    relativeToAudio: false,
  },
  cloze: {
    fastMs: 8_000,
    normalUpperMs: 25_000,
    relativeToAudio: false,
  },
  listening: {
    fastMs: 2_000,
    normalUpperMs: 10_000,
    relativeToAudio: true,
  },
};
