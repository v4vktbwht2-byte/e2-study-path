import type { Attempt, StudySession } from "../../domain/models";
import type { AudioPlaybackRequest } from "../../infrastructure/audio";
import type {
  ListeningPlaybackRate,
  ListeningPracticeSet,
  ListeningSentence,
} from "./schemas";
import type { ListeningMode } from "./types";

export interface ExamPlaybackState {
  playCount: number;
}

export interface ListeningCompletionRecordsInput {
  set: ListeningPracticeSet;
  mode: ListeningMode;
  selectedChoiceId?: string;
  dictation: string;
  selfPractice: boolean;
  attemptId: string;
  sessionId: string;
  startedAt: Date;
  completedAt: Date;
  studyDate: string;
}

export interface ListeningCompletionRecords {
  attempt: Attempt;
  session: StudySession;
}

export function listeningItemKey(setId: string): string {
  return `practice:${setId}`;
}

export function fullScriptText(set: ListeningPracticeSet): string {
  return set.payload.script.sentences.map((sentence) => sentence.text).join(" ");
}

export function findListeningSentence(
  set: ListeningPracticeSet,
  sentenceId: string,
): ListeningSentence {
  const sentence = set.payload.script.sentences.find(
    (candidate) => candidate.id === sentenceId,
  );
  if (!sentence) {
    throw new Error(`script内に文 ${sentenceId} が見つかりません。`);
  }
  return sentence;
}

export function createFullPlaybackRequest(
  set: ListeningPracticeSet,
  mode: ListeningMode,
  rate: ListeningPlaybackRate,
): AudioPlaybackRequest {
  return {
    text: fullScriptText(set),
    language: set.payload.audio.language,
    rate: mode === "exam" ? 1 : rate,
    ...(set.payload.audio.assetUrl === undefined
      ? {}
      : { assetUrl: set.payload.audio.assetUrl }),
  };
}

export function createSentencePlaybackRequest(
  set: ListeningPracticeSet,
  sentenceId: string,
  rate: ListeningPlaybackRate,
): AudioPlaybackRequest {
  const sentence = findListeningSentence(set, sentenceId);
  return {
    text: sentence.text,
    language: set.payload.audio.language,
    rate,
    ...(sentence.audioAsset === undefined ? {} : { assetUrl: sentence.audioAsset }),
  };
}

export function consumeExamPlayback(state: ExamPlaybackState): ExamPlaybackState {
  if (state.playCount >= 1) {
    throw new Error("本番風モードの音声は1回だけ再生できます。");
  }
  return { playCount: state.playCount + 1 };
}

export function normalizeDictation(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[’‘]/gu, "'")
    .trim()
    .toLocaleLowerCase("en-US")
    .replace(/[.!?,;:]+$/gu, "")
    .replace(/\s+/gu, " ");
}

export function isDictationMatch(response: string, target: string): boolean {
  return normalizeDictation(response) === normalizeDictation(target);
}

export function createListeningCompletionRecords(
  input: ListeningCompletionRecordsInput,
): ListeningCompletionRecords {
  const itemKey = listeningItemKey(input.set.id);
  const selectedChoiceId = input.selectedChoiceId;
  const correct =
    input.selfPractice || selectedChoiceId === undefined
      ? null
      : selectedChoiceId === input.set.payload.question.correctChoiceId;
  const completedAtIso = input.completedAt.toISOString();
  const responseTimeMs = Math.max(
    0,
    input.completedAt.getTime() - input.startedAt.getTime(),
  );
  const attempt: Attempt = {
    id: input.attemptId,
    itemKey,
    exerciseId: `listening-question:${input.set.id}`,
    sessionId: input.sessionId,
    createdAt: completedAtIso,
    studyDate: input.studyDate,
    mode: `listening:${input.mode}`,
    response: {
      selectedChoiceId: selectedChoiceId ?? null,
      dictation: input.dictation,
      selfPractice: input.selfPractice,
    },
    correct,
    score: correct === true ? 1 : 0,
    responseTimeMs,
    hintCount: 0,
  };
  const session: StudySession = {
    id: input.sessionId,
    type: "practice",
    startedAt: input.startedAt.toISOString(),
    endedAt: completedAtIso,
    studyDate: input.studyDate,
    plannedMinutes: input.set.estimatedMinutes,
    itemKeys: [itemKey],
    completedItemKeys: [itemKey],
    interrupted: false,
  };

  return { attempt, session };
}
