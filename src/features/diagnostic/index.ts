export { DiagnosticPage, type DiagnosticPageProps } from "./DiagnosticPage";
export {
  createDiagnosticPlacement,
  createDiagnosticRun,
  DiagnosticFeatureError,
  finalizeAndSaveDiagnosticRun,
  getFirstDiagnosticLessons,
  getNextDiagnosticQuestion,
  isCorrectDiagnosticAnswer,
  loadOrCreateDiagnosticRun,
  normalizeDiagnosticAnswer,
  recordAndSaveDiagnosticResponse,
  saveDiagnosticPlacement,
  saveSelectedDiagnosticStage,
  validateDiagnosticQuestions,
} from "./service";
export { AppDbDiagnosticSessionStore, DiagnosticStorageError } from "./storage";
export type {
  DiagnosticChoice,
  DiagnosticCompletion,
  DiagnosticLessonSummary,
  DiagnosticMode,
  DiagnosticQuestionContent,
  DiagnosticQuestionKind,
  DiagnosticSessionStore,
  SavedDiagnosticRun,
} from "./types";
