export const DIAGNOSTIC_STAGES = [0, 1, 2, 3, 4, 5, 6] as const;

export type DiagnosticStage = (typeof DIAGNOSTIC_STAGES)[number];

export const DIAGNOSTIC_AREAS = [
  "alphabet",
  "basicVocabulary",
  "beVerb",
  "generalVerb",
  "questions",
  "shortReading",
  "basicListening",
  "pastFutureComparison",
  "presentPerfect",
  "passive",
  "relativeClauses",
  "upperGrammar",
  "upperVocabulary",
  "upperReading",
  "upperListening",
] as const;

export type DiagnosticArea = (typeof DIAGNOSTIC_AREAS)[number];

export type DiagnosticQuestionLevel = "foundation" | "standard" | "upper";

export interface DiagnosticQuestion {
  id: string;
  stage: DiagnosticStage;
  area: DiagnosticArea;
  level: DiagnosticQuestionLevel;
  sequence?: number;
}

export type DiagnosticResponse = "correct" | "incorrect" | "unknown" | "skipped";

export interface DiagnosticAnswer {
  questionId: string;
  stage: DiagnosticStage;
  area: DiagnosticArea;
  level: DiagnosticQuestionLevel;
  response: DiagnosticResponse;
}

export type DiagnosticFinishReason =
  "foundationDifficulty" | "maxQuestions" | "noEligibleQuestions" | "completedByUser";

export interface DiagnosticSession {
  answers: readonly DiagnosticAnswer[];
  maxQuestions: number;
  foundationSuppressionThreshold: number;
  foundationStopThreshold: number;
  consecutiveFoundationFailures: number;
  isComplete: boolean;
  finishReason?: DiagnosticFinishReason;
}

export interface CreateDiagnosticSessionOptions {
  maxQuestions?: number;
  foundationSuppressionThreshold?: number;
  foundationStopThreshold?: number;
}

export interface DiagnosticStageSummary {
  stage: DiagnosticStage;
  answeredCount: number;
  correctCount: number;
  accuracy: number;
  passed: boolean;
}

export interface DiagnosticInsight {
  area: DiagnosticArea;
  label: string;
  answeredCount: number;
  correctCount: number;
  accuracy: number;
}

export interface DiagnosticPlacement {
  recommendedStage: DiagnosticStage;
  strengths: readonly DiagnosticInsight[];
  gaps: readonly DiagnosticInsight[];
  stageSummaries: readonly DiagnosticStageSummary[];
  answeredCount: number;
  correctCount: number;
  skippedCount: number;
  finishReason?: DiagnosticFinishReason;
}

export interface PlacementOptions {
  passAccuracy?: number;
  minimumAnswersPerStage?: number;
}
