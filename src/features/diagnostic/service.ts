import {
  createDiagnosticSession,
  finalizeDiagnosticSession,
  recordDiagnosticResponse,
  selectNextDiagnosticQuestion,
  summarizeDiagnosticPlacement,
  type DiagnosticPlacement,
  type DiagnosticResponse,
  type DiagnosticStage,
} from "../../domain/diagnostic";
import type { UserProfile } from "../../domain/models";
import type { ProfileRepository } from "../../domain/repositories";
import type {
  DiagnosticLessonSummary,
  DiagnosticMode,
  DiagnosticQuestionContent,
  DiagnosticSessionStore,
  SavedDiagnosticRun,
} from "./types";

export class DiagnosticFeatureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DiagnosticFeatureError";
  }
}

export function normalizeDiagnosticAnswer(value: string): string {
  return value
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase("en-US")
    .replace(/[.!?！？。、]/g, "")
    .replace(/\s+/g, " ");
}

export function isCorrectDiagnosticAnswer(
  question: DiagnosticQuestionContent,
  value: string,
): boolean {
  const normalized = normalizeDiagnosticAnswer(value);
  return question.acceptedAnswers.some(
    (answer) => normalizeDiagnosticAnswer(answer) === normalized,
  );
}

export function validateDiagnosticQuestions(
  questions: readonly DiagnosticQuestionContent[],
): readonly string[] {
  const errors: string[] = [];
  const ids = new Set<string>();

  for (const question of questions) {
    if (ids.has(question.id)) {
      errors.push(`診断問題IDが重複しています: ${question.id}`);
    }
    ids.add(question.id);

    if (question.prompt.trim() === "") {
      errors.push(`${question.id}: 問題文がありません。`);
    }
    if (question.acceptedAnswers.length === 0) {
      errors.push(`${question.id}: 正答が設定されていません。`);
    }

    if (question.kind === "singleChoice" || question.kind === "listeningChoice") {
      if (!question.choices || question.choices.length < 2) {
        errors.push(`${question.id}: 選択肢を2件以上設定してください。`);
      } else {
        const choiceValues = new Set(question.choices.map((choice) => choice.value));
        if (choiceValues.size !== question.choices.length) {
          errors.push(`${question.id}: 選択肢の値が重複しています。`);
        }
        if (
          !question.acceptedAnswers.some((answer) =>
            question.choices?.some(
              (choice) =>
                normalizeDiagnosticAnswer(choice.value) ===
                normalizeDiagnosticAnswer(answer),
            ),
          )
        ) {
          errors.push(`${question.id}: 正答が選択肢に含まれていません。`);
        }
      }
    }

    if (
      question.kind === "listeningChoice" &&
      !question.audioSrc &&
      !question.audioTranscript
    ) {
      errors.push(`${question.id}: 音声または代替スクリプトのどちらかが必要です。`);
    }
  }

  return errors;
}

export function createDiagnosticRun(
  mode: DiagnosticMode,
  now = new Date().toISOString(),
  maxQuestions = 24,
): SavedDiagnosticRun {
  return {
    version: 1,
    mode,
    session: createDiagnosticSession({ maxQuestions }),
    startedAt: now,
    updatedAt: now,
  };
}

export async function loadOrCreateDiagnosticRun(
  store: DiagnosticSessionStore,
  mode: DiagnosticMode,
  now = new Date().toISOString(),
): Promise<{ run: SavedDiagnosticRun; resumed: boolean }> {
  const saved = await store.load(mode);
  if (saved) {
    return { run: saved, resumed: saved.session.answers.length > 0 };
  }

  const run = createDiagnosticRun(mode, now);
  await store.save(run);
  return { run, resumed: false };
}

export function getNextDiagnosticQuestion(
  run: SavedDiagnosticRun,
  questions: readonly DiagnosticQuestionContent[],
): DiagnosticQuestionContent | null {
  const question = selectNextDiagnosticQuestion(run.session, questions);
  if (!question) {
    return null;
  }
  return questions.find((candidate) => candidate.id === question.id) ?? null;
}

export async function recordAndSaveDiagnosticResponse(
  store: DiagnosticSessionStore,
  run: SavedDiagnosticRun,
  question: DiagnosticQuestionContent,
  response: DiagnosticResponse,
  now = new Date().toISOString(),
): Promise<SavedDiagnosticRun> {
  const updated: SavedDiagnosticRun = {
    ...run,
    session: recordDiagnosticResponse(run.session, question, response),
    updatedAt: now,
  };
  await store.save(updated);
  return updated;
}

export async function finalizeAndSaveDiagnosticRun(
  store: DiagnosticSessionStore,
  run: SavedDiagnosticRun,
  now = new Date().toISOString(),
): Promise<SavedDiagnosticRun> {
  const updated: SavedDiagnosticRun = {
    ...run,
    session: finalizeDiagnosticSession(run.session, "noEligibleQuestions"),
    updatedAt: now,
  };
  await store.save(updated);
  return updated;
}

export function createDiagnosticPlacement(
  run: SavedDiagnosticRun,
): DiagnosticPlacement {
  return summarizeDiagnosticPlacement(run.session);
}

export async function saveDiagnosticPlacement(
  repository: ProfileRepository,
  placement: DiagnosticPlacement,
  mode: DiagnosticMode,
  now = new Date().toISOString(),
): Promise<UserProfile> {
  const existing = await repository.get();
  if (!existing) {
    throw new DiagnosticFeatureError(
      "初回設定が見つかりません。先に学習目標と学習時間を設定してください。",
    );
  }

  const profile: UserProfile = {
    ...existing,
    updatedAt: now,
    recommendedStage: placement.recommendedStage,
    selectedStage:
      mode === "initial" ? placement.recommendedStage : existing.selectedStage,
    onboardingCompleted: mode === "initial" ? true : existing.onboardingCompleted,
    diagnosticCompletedAt: now,
  };
  await repository.save(profile);
  return profile;
}

export async function saveSelectedDiagnosticStage(
  repository: ProfileRepository,
  stage: DiagnosticStage,
  now = new Date().toISOString(),
): Promise<UserProfile> {
  if (!Number.isInteger(stage) || stage < 0 || stage > 6) {
    throw new DiagnosticFeatureError("開始ステージは0〜6から選んでください。");
  }

  const existing = await repository.get();
  if (!existing) {
    throw new DiagnosticFeatureError(
      "初回設定が見つかりません。先に学習目標と学習時間を設定してください。",
    );
  }

  const profile: UserProfile = {
    ...existing,
    updatedAt: now,
    selectedStage: stage,
    onboardingCompleted: true,
  };
  await repository.save(profile);
  return profile;
}

export function getFirstDiagnosticLessons(
  lessons: readonly DiagnosticLessonSummary[],
  stage: DiagnosticStage,
): readonly DiagnosticLessonSummary[] {
  return lessons
    .filter((lesson) => lesson.stage === stage)
    .sort(
      (left, right) =>
        left.order - right.order ||
        (left.id < right.id ? -1 : left.id > right.id ? 1 : 0),
    )
    .slice(0, 3);
}
