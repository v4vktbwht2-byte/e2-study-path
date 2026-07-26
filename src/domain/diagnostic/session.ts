import type {
  CreateDiagnosticSessionOptions,
  DiagnosticAnswer,
  DiagnosticFinishReason,
  DiagnosticQuestion,
  DiagnosticResponse,
  DiagnosticSession,
} from "./types";

const MIN_DIAGNOSTIC_QUESTIONS = 18;
const MAX_DIAGNOSTIC_QUESTIONS = 24;
const DEFAULT_SUPPRESSION_THRESHOLD = 2;
const DEFAULT_STOP_THRESHOLD = 3;

function normalizeInteger(
  value: number,
  minimum: number,
  maximum: number,
  name: string,
): number {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${name}には有限の数値を指定してください。`);
  }

  return Math.min(maximum, Math.max(minimum, Math.round(value)));
}

export function createDiagnosticSession(
  options: CreateDiagnosticSessionOptions = {},
): DiagnosticSession {
  const maxQuestions = normalizeInteger(
    options.maxQuestions ?? MAX_DIAGNOSTIC_QUESTIONS,
    MIN_DIAGNOSTIC_QUESTIONS,
    MAX_DIAGNOSTIC_QUESTIONS,
    "診断問題数",
  );
  const foundationSuppressionThreshold = normalizeInteger(
    options.foundationSuppressionThreshold ?? DEFAULT_SUPPRESSION_THRESHOLD,
    2,
    3,
    "難問抑制の連続失敗数",
  );
  const foundationStopThreshold = normalizeInteger(
    options.foundationStopThreshold ?? DEFAULT_STOP_THRESHOLD,
    foundationSuppressionThreshold + 1,
    4,
    "早期終了の連続失敗数",
  );

  return {
    answers: [],
    maxQuestions,
    foundationSuppressionThreshold,
    foundationStopThreshold,
    consecutiveFoundationFailures: 0,
    isComplete: false,
  };
}

function isFailure(response: DiagnosticResponse): boolean {
  return response !== "correct";
}

export function recordDiagnosticResponse(
  session: DiagnosticSession,
  question: DiagnosticQuestion,
  response: DiagnosticResponse,
): DiagnosticSession {
  if (session.isComplete) {
    throw new Error("完了した診断には回答を追加できません。");
  }
  if (session.answers.some((answer) => answer.questionId === question.id)) {
    throw new Error(`診断問題へ重複回答しています: ${question.id}`);
  }

  const answer: DiagnosticAnswer = {
    questionId: question.id,
    stage: question.stage,
    area: question.area,
    level: question.level,
    response,
  };
  const consecutiveFoundationFailures =
    question.level !== "foundation"
      ? session.consecutiveFoundationFailures
      : isFailure(response)
        ? session.consecutiveFoundationFailures + 1
        : 0;
  const answers = [...session.answers, answer];
  const foundationDifficulty =
    consecutiveFoundationFailures >= session.foundationStopThreshold;
  const reachedMaximum = answers.length >= session.maxQuestions;
  const finishReason: DiagnosticFinishReason | undefined = foundationDifficulty
    ? "foundationDifficulty"
    : reachedMaximum
      ? "maxQuestions"
      : undefined;

  return {
    ...session,
    answers,
    consecutiveFoundationFailures,
    isComplete: finishReason !== undefined,
    ...(finishReason === undefined ? {} : { finishReason }),
  };
}

export function shouldSuppressUpperQuestions(session: DiagnosticSession): boolean {
  return (
    session.consecutiveFoundationFailures >= session.foundationSuppressionThreshold
  );
}

export function finalizeDiagnosticSession(
  session: DiagnosticSession,
  reason: Extract<
    DiagnosticFinishReason,
    "noEligibleQuestions" | "completedByUser"
  > = "completedByUser",
): DiagnosticSession {
  if (session.isComplete) {
    return session;
  }

  return {
    ...session,
    isComplete: true,
    finishReason: reason,
  };
}
