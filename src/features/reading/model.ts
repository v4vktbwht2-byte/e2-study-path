import type { Attempt, StudySession } from "../../domain/models";
import type { ReadingPracticeSet, ReadingQuestion } from "./schema";
import type { ReadingQuestionResponse, ReadingQuestionResult } from "./types";

export const READING_FONT_SCALES = [0.9, 1, 1.15, 1.3] as const;

export function readingItemKey(setId: string): string {
  return `practice:${setId}`;
}

export function clampReadingFontScaleIndex(index: number): number {
  return Math.min(READING_FONT_SCALES.length - 1, Math.max(0, Math.round(index)));
}

export function formatReadingDuration(milliseconds: number): string {
  const seconds = Math.max(0, Math.floor(milliseconds / 1_000));
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

export function isCorrectEvidence(
  question: ReadingQuestion,
  sentenceId: string,
): boolean {
  return question.evidenceSentenceIds.includes(sentenceId);
}

export function scoreReadingResponses(
  set: ReadingPracticeSet,
  responses: readonly ReadingQuestionResponse[],
): ReadingQuestionResult[] {
  const responseByQuestionId = new Map(
    responses.map((response) => [response.questionId, response]),
  );
  return set.payload.questions.map((question) => {
    const response = responseByQuestionId.get(question.id);
    if (response === undefined) {
      throw new Error(`設問 ${question.id} の回答がありません。`);
    }
    return {
      ...response,
      correct: response.choiceIndex === question.correctChoiceIndex,
      evidenceCorrect: isCorrectEvidence(question, response.evidenceSentenceId),
    };
  });
}

export function createReadingSession(input: {
  setId: string;
  startedAt: Date;
  studyDate: string;
}): StudySession {
  const itemKey = readingItemKey(input.setId);
  const startedAt = input.startedAt.toISOString();
  return {
    id: `reading-session:${input.setId}:${startedAt}`,
    type: "practice",
    startedAt,
    studyDate: input.studyDate,
    itemKeys: [itemKey],
    completedItemKeys: [],
    interrupted: true,
  };
}

export function createReadingAttempts(input: {
  set: ReadingPracticeSet;
  session: StudySession;
  responses: readonly ReadingQuestionResponse[];
  createdAt: string;
}): Attempt[] {
  return scoreReadingResponses(input.set, input.responses).map((result, index) => ({
    id: `${input.session.id}:attempt:${String(index + 1).padStart(2, "0")}`,
    itemKey: readingItemKey(input.set.id),
    exerciseId: result.questionId,
    sessionId: input.session.id,
    createdAt: input.createdAt,
    studyDate: input.session.studyDate,
    mode: "readingQuestion",
    response: {
      choiceIndex: result.choiceIndex,
      evidenceSentenceId: result.evidenceSentenceId,
      evidenceCorrect: result.evidenceCorrect,
    },
    correct: result.correct,
    score: result.correct ? 1 : 0,
    responseTimeMs: Math.max(0, Math.round(result.responseTimeMs)),
    hintCount: 0,
  }));
}

export function readingScore(attempts: readonly Attempt[]): {
  correctCount: number;
  totalCount: number;
  totalAnswerTimeMs: number;
} {
  return {
    correctCount: attempts.filter((attempt) => attempt.correct === true).length,
    totalCount: attempts.length,
    totalAnswerTimeMs: attempts.reduce(
      (total, attempt) => total + attempt.responseTimeMs,
      0,
    ),
  };
}
