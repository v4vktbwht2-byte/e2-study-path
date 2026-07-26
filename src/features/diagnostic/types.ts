import type {
  DiagnosticQuestion,
  DiagnosticSession,
  DiagnosticStage,
} from "../../domain/diagnostic";

export type DiagnosticMode = "initial" | "reassessment";
export type DiagnosticQuestionKind = "singleChoice" | "textInput" | "listeningChoice";

export interface DiagnosticChoice {
  value: string;
  label: string;
}

export interface DiagnosticQuestionContent extends DiagnosticQuestion {
  prompt: string;
  instructionsJa?: string;
  kind: DiagnosticQuestionKind;
  choices?: readonly DiagnosticChoice[];
  acceptedAnswers: readonly string[];
  audioSrc?: string;
  audioTranscript?: string;
}

export interface DiagnosticLessonSummary {
  id: string;
  stage: number;
  order: number;
  titleJa: string;
  descriptionJa?: string;
}

export interface SavedDiagnosticRun {
  version: 1;
  mode: DiagnosticMode;
  session: DiagnosticSession;
  startedAt: string;
  updatedAt: string;
}

export interface DiagnosticSessionStore {
  load(mode: DiagnosticMode): Promise<SavedDiagnosticRun | undefined>;
  save(run: SavedDiagnosticRun): Promise<void>;
  clear(mode: DiagnosticMode): Promise<void>;
}

export interface DiagnosticCompletion {
  selectedStage: DiagnosticStage;
  recommendedStage: DiagnosticStage;
}
