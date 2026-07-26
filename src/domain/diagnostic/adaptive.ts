import { shouldSuppressUpperQuestions } from "./session";
import {
  DIAGNOSTIC_STAGES,
  type DiagnosticQuestion,
  type DiagnosticSession,
  type DiagnosticStage,
} from "./types";

const DEFAULT_PASS_ACCURACY = 2 / 3;
const DEFAULT_MINIMUM_STAGE_ANSWERS = 2;

function stageIsDemonstrated(
  session: DiagnosticSession,
  stage: DiagnosticStage,
): boolean {
  const answers = session.answers.filter((answer) => answer.stage === stage);
  if (answers.length < DEFAULT_MINIMUM_STAGE_ANSWERS) {
    return false;
  }

  const correct = answers.filter((answer) => answer.response === "correct").length;
  return correct / answers.length >= DEFAULT_PASS_ACCURACY;
}

function getHighestAllowedStage(session: DiagnosticSession): DiagnosticStage {
  let highestAllowed: DiagnosticStage = 0;

  for (const stage of DIAGNOSTIC_STAGES) {
    if (stage === 6 || !stageIsDemonstrated(session, stage)) {
      break;
    }
    highestAllowed = (stage + 1) as DiagnosticStage;
  }

  return highestAllowed;
}

function compareQuestions(left: DiagnosticQuestion, right: DiagnosticQuestion): number {
  const stageDifference = left.stage - right.stage;
  if (stageDifference !== 0) {
    return stageDifference;
  }

  const levelOrder = { foundation: 0, standard: 1, upper: 2 } as const;
  const levelDifference = levelOrder[left.level] - levelOrder[right.level];
  if (levelDifference !== 0) {
    return levelDifference;
  }

  const sequenceDifference =
    (left.sequence ?? Number.MAX_SAFE_INTEGER) -
    (right.sequence ?? Number.MAX_SAFE_INTEGER);
  if (sequenceDifference !== 0) {
    return sequenceDifference;
  }

  return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
}

export function selectNextDiagnosticQuestion(
  session: DiagnosticSession,
  questions: readonly DiagnosticQuestion[],
): DiagnosticQuestion | null {
  if (session.isComplete) {
    return null;
  }

  const answeredIds = new Set(session.answers.map((answer) => answer.questionId));
  const unanswered = questions.filter((question) => !answeredIds.has(question.id));

  if (shouldSuppressUpperQuestions(session)) {
    const lastFoundationStage =
      [...session.answers].reverse().find((answer) => answer.level === "foundation")
        ?.stage ?? 0;

    return (
      unanswered
        .filter(
          (question) =>
            question.level === "foundation" && question.stage <= lastFoundationStage,
        )
        .sort(compareQuestions)[0] ?? null
    );
  }

  const highestAllowedStage = getHighestAllowedStage(session);
  return (
    unanswered
      .filter((question) => question.stage <= highestAllowedStage)
      .sort(compareQuestions)[0] ?? null
  );
}
