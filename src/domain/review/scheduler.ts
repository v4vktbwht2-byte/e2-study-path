import {
  DEFAULT_STUDY_DAY_BOUNDARY,
  HARD_MINIMUM_DELAY_MINUTES,
  HARD_STEP_MULTIPLIER,
  LEARNING_STEPS,
  MILLISECONDS_PER_MINUTE,
  RELEARNING_STEPS,
  REVIEW_GRADUATION_INTERVAL_DAYS,
  REVIEW_LIMITS,
  type ReviewStep,
} from "./constants";
import { ReviewDomainError } from "./errors";
import {
  calculateReviewIntervalDays,
  clampEaseBias,
  roundReviewIntervalDays,
  updateEaseBias,
} from "./interval";
import { calculatePredictedRetention } from "./retention";
import { addCalendarStudyDays, addStepDelay, assertNow, parseIsoDate } from "./time";
import type {
  ReviewScheduler,
  ReviewState,
  ScheduleReviewInput,
  StudyDayBoundary,
} from "./types";

function assertNonNegativeInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new ReviewDomainError("INVALID_STATE", `${label}には0以上の整数が必要です。`);
  }
}

function assertScheduleInput(input: ScheduleReviewInput): void {
  assertNow(input.now);
  if (input.state.itemKey.trim().length < 3) {
    throw new ReviewDomainError(
      "INVALID_STATE",
      "itemKeyには3文字以上の安定した識別子が必要です。",
    );
  }
  assertNonNegativeInteger(input.state.reviewCount, "reviewCount");
  assertNonNegativeInteger(input.state.lapseCount, "lapseCount");
  assertNonNegativeInteger(input.state.consecutiveSuccesses, "consecutiveSuccesses");
  assertNonNegativeInteger(input.state.learningStep, "learningStep");
  if (!Number.isFinite(input.state.intervalDays) || input.state.intervalDays < 0) {
    throw new ReviewDomainError(
      "INVALID_STATE",
      "intervalDaysには0以上の有限値が必要です。",
    );
  }
  clampEaseBias(input.state.easeBias);
  parseIsoDate(input.state.dueAt, "復習予定時刻");
  parseIsoDate(input.state.updatedAt, "更新時刻");

  if (input.responseTimeMs !== undefined) {
    if (!Number.isFinite(input.responseTimeMs) || input.responseTimeMs < 0) {
      throw new ReviewDomainError(
        "INVALID_NUMBER",
        "回答時間には0以上の有限値を指定してください。",
      );
    }
  }

  if (input.state.status === "suspended") {
    throw new ReviewDomainError(
      "INVALID_STATE",
      "一時停止中の項目は、再開してから評価してください。",
    );
  }
}

function boundaryOf(input: ScheduleReviewInput): StudyDayBoundary {
  return input.studyDayBoundary ?? DEFAULT_STUDY_DAY_BOUNDARY;
}

function dueForReviewDays(
  now: Date,
  intervalDays: number,
  boundary: StudyDayBoundary,
): string {
  return addCalendarStudyDays(now, intervalDays, boundary).toISOString();
}

function dueForStep(
  now: Date,
  step: ReviewStep,
  boundary: StudyDayBoundary,
  multiplier = 1,
): string {
  if (step.kind === "days") {
    return addCalendarStudyDays(
      now,
      Math.max(1, Math.round(step.value * multiplier)),
      boundary,
    ).toISOString();
  }

  if (multiplier === HARD_STEP_MULTIPLIER) {
    const delayMinutes = Math.max(HARD_MINIMUM_DELAY_MINUTES, step.value * multiplier);
    return new Date(
      now.getTime() + delayMinutes * MILLISECONDS_PER_MINUTE,
    ).toISOString();
  }

  return addStepDelay(now, step, multiplier).toISOString();
}

function activeStateBase(input: ScheduleReviewInput): ReviewState {
  const previous: ReviewState = { ...input.state };
  delete previous.suspendedReason;
  delete previous.lastResponseTimeMs;
  const nowIso = input.now.toISOString();
  const responseTimeMs = input.responseTimeMs ?? input.responseTiming?.responseTimeMs;
  const base: ReviewState = {
    ...previous,
    easeBias: updateEaseBias(input.state.easeBias, input.rating),
    lastReviewedAt: nowIso,
    firstLearnedAt: input.state.firstLearnedAt ?? nowIso,
    reviewCount: input.state.reviewCount + 1,
    lapseCount:
      input.state.lapseCount +
      (input.state.status === "review" && input.rating === "again" ? 1 : 0),
    consecutiveSuccesses:
      input.rating === "again" ? 0 : input.state.consecutiveSuccesses + 1,
    lastRating: input.rating,
    updatedAt: nowIso,
  };

  if (responseTimeMs !== undefined) {
    base.lastResponseTimeMs = Math.round(responseTimeMs);
  }

  return base;
}

function graduateLearning(
  base: ReviewState,
  now: Date,
  intervalDays: number,
  boundary: StudyDayBoundary,
): ReviewState {
  const roundedInterval = roundReviewIntervalDays(intervalDays);
  return {
    ...base,
    status: "review",
    learningStep: 0,
    intervalDays: roundedInterval,
    dueAt: dueForReviewDays(now, roundedInterval, boundary),
  };
}

function scheduleNew(input: ScheduleReviewInput, base: ReviewState): ReviewState {
  const boundary = boundaryOf(input);
  if (input.rating === "easy") {
    return graduateLearning(
      base,
      input.now,
      REVIEW_GRADUATION_INTERVAL_DAYS.learningEasy,
      boundary,
    );
  }

  return {
    ...base,
    status: "learning",
    learningStep: 0,
    intervalDays: 0,
    dueAt: dueForStep(
      input.now,
      LEARNING_STEPS[0],
      boundary,
      input.rating === "hard" ? HARD_STEP_MULTIPLIER : 1,
    ),
  };
}

function getCurrentStep(
  steps: readonly ReviewStep[],
  stepIndex: number,
  statusLabel: string,
): ReviewStep {
  const step = steps[stepIndex];
  if (step === undefined) {
    throw new ReviewDomainError(
      "INVALID_STATE",
      `${statusLabel}のlearningStep ${stepIndex} は範囲外です。`,
    );
  }
  return step;
}

function scheduleLearning(input: ScheduleReviewInput, base: ReviewState): ReviewState {
  const boundary = boundaryOf(input);
  const currentStep = getCurrentStep(
    LEARNING_STEPS,
    input.state.learningStep,
    "learning",
  );

  if (input.rating === "again") {
    return {
      ...base,
      status: "learning",
      learningStep: 0,
      intervalDays: 0,
      dueAt: dueForStep(input.now, LEARNING_STEPS[0], boundary),
    };
  }

  if (input.rating === "hard") {
    return {
      ...base,
      status: "learning",
      learningStep: input.state.learningStep,
      intervalDays: 0,
      dueAt: dueForStep(input.now, currentStep, boundary, HARD_STEP_MULTIPLIER),
    };
  }

  if (input.rating === "easy") {
    return graduateLearning(
      base,
      input.now,
      REVIEW_GRADUATION_INTERVAL_DAYS.learningEasy,
      boundary,
    );
  }

  const nextStepIndex = input.state.learningStep + 1;
  const nextStep = LEARNING_STEPS[nextStepIndex];
  if (nextStep === undefined) {
    return graduateLearning(
      base,
      input.now,
      REVIEW_GRADUATION_INTERVAL_DAYS.learningGood,
      boundary,
    );
  }

  return {
    ...base,
    status: "learning",
    learningStep: nextStepIndex,
    intervalDays: 0,
    dueAt: dueForStep(input.now, nextStep, boundary),
  };
}

function relearningGraduationInterval(previousInterval: number): number {
  return roundReviewIntervalDays(
    Math.max(
      REVIEW_GRADUATION_INTERVAL_DAYS.relearningMinimum,
      previousInterval * REVIEW_GRADUATION_INTERVAL_DAYS.relearningFactor,
    ),
  );
}

function scheduleRelearning(
  input: ScheduleReviewInput,
  base: ReviewState,
): ReviewState {
  const boundary = boundaryOf(input);
  const currentStep = getCurrentStep(
    RELEARNING_STEPS,
    input.state.learningStep,
    "relearning",
  );
  const previousInterval = Math.min(
    REVIEW_LIMITS.maximumReviewIntervalDays,
    Math.max(REVIEW_LIMITS.minimumReviewIntervalDays, input.state.intervalDays),
  );

  if (input.rating === "again") {
    return {
      ...base,
      status: "relearning",
      learningStep: 0,
      intervalDays: previousInterval,
      dueAt: dueForStep(input.now, RELEARNING_STEPS[0], boundary),
    };
  }

  if (input.rating === "hard") {
    return {
      ...base,
      status: "relearning",
      learningStep: input.state.learningStep,
      intervalDays: previousInterval,
      dueAt: dueForStep(input.now, currentStep, boundary, HARD_STEP_MULTIPLIER),
    };
  }

  const nextStepIndex = input.state.learningStep + 1;
  const nextStep = RELEARNING_STEPS[nextStepIndex];
  if (input.rating === "good" && nextStep !== undefined) {
    return {
      ...base,
      status: "relearning",
      learningStep: nextStepIndex,
      intervalDays: previousInterval,
      dueAt: dueForStep(input.now, nextStep, boundary),
    };
  }

  return graduateLearning(
    base,
    input.now,
    relearningGraduationInterval(previousInterval),
    boundary,
  );
}

function scheduleReviewState(
  input: ScheduleReviewInput,
  base: ReviewState,
): ReviewState {
  const previousInterval = Math.min(
    REVIEW_LIMITS.maximumReviewIntervalDays,
    Math.max(REVIEW_LIMITS.minimumReviewIntervalDays, input.state.intervalDays),
  );

  if (input.rating === "again") {
    return {
      ...base,
      status: "relearning",
      learningStep: 0,
      intervalDays: previousInterval,
      dueAt: dueForStep(input.now, RELEARNING_STEPS[0], boundaryOf(input)),
    };
  }

  const intervalDays = calculateReviewIntervalDays(input);
  return {
    ...base,
    status: "review",
    learningStep: 0,
    intervalDays,
    dueAt: dueForReviewDays(input.now, intervalDays, boundaryOf(input)),
  };
}

export function scheduleReview(input: ScheduleReviewInput): ReviewState {
  assertScheduleInput(input);
  const base = activeStateBase(input);
  let scheduled: ReviewState;

  switch (input.state.status) {
    case "new":
      scheduled = scheduleNew(input, base);
      break;
    case "learning":
      scheduled = scheduleLearning(input, base);
      break;
    case "review":
      scheduled = scheduleReviewState(input, base);
      break;
    case "relearning":
      scheduled = scheduleRelearning(input, base);
      break;
    case "suspended":
      // assertScheduleInputで拒否するが、網羅性のため残す。
      throw new ReviewDomainError(
        "INVALID_STATE",
        "一時停止中の項目は評価できません。",
      );
  }

  return {
    ...scheduled,
    predictedRetention: calculatePredictedRetention(scheduled, input.now),
  };
}

export const heuristicReviewScheduler: ReviewScheduler = {
  schedule: scheduleReview,
};

export function createNewReviewState(itemKey: string, now: Date): ReviewState {
  assertNow(now);
  if (itemKey.trim().length < 3) {
    throw new ReviewDomainError(
      "INVALID_STATE",
      "itemKeyには3文字以上の安定した識別子が必要です。",
    );
  }
  const nowIso = now.toISOString();
  return {
    itemKey,
    status: "new",
    learningStep: 0,
    intervalDays: 0,
    easeBias: 1,
    dueAt: nowIso,
    reviewCount: 0,
    lapseCount: 0,
    consecutiveSuccesses: 0,
    updatedAt: nowIso,
  };
}

export function suspendReviewState(
  state: Readonly<ReviewState>,
  reason: string,
  now: Date,
): ReviewState {
  assertNow(now);
  return {
    ...state,
    status: "suspended",
    suspendedReason: reason.trim() || "ユーザー操作",
    updatedAt: now.toISOString(),
  };
}

export function resumeReviewState(
  state: Readonly<ReviewState>,
  now: Date,
): ReviewState {
  assertNow(now);
  if (state.status !== "suspended") {
    throw new ReviewDomainError(
      "INVALID_STATE",
      "一時停止中の項目だけを再開できます。",
    );
  }
  const rest: ReviewState = { ...state };
  delete rest.suspendedReason;
  return {
    ...rest,
    status: "review",
    learningStep: 0,
    intervalDays: roundReviewIntervalDays(
      Math.max(REVIEW_LIMITS.minimumReviewIntervalDays, state.intervalDays),
    ),
    dueAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

export function resetSuspendedReviewState(
  state: Readonly<ReviewState>,
  now: Date,
): ReviewState {
  if (state.status !== "suspended") {
    throw new ReviewDomainError(
      "INVALID_STATE",
      "一時停止中の項目だけを完全リセットできます。",
    );
  }
  return createNewReviewState(state.itemKey, now);
}
