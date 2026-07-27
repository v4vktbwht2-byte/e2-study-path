import type { Attempt, SpeakingRecording, StudySession } from "../../domain/models";
import type { PracticeSet } from "../../infrastructure/content/schemas";

export interface SpeakingScene {
  id: string;
  titleJa: string;
  description: string;
}

export interface SpeakingPayload {
  passageTitle: string;
  passage: string;
  silentReadingSeconds: number;
  no1Question: string;
  no1GuideJa: string;
  no1EvidenceQuote: string;
  narrationPreparationSeconds: number;
  scenes: SpeakingScene[];
  no3Question: string;
  no4Question: string;
  sampleStructureJa: string[];
}

export interface SpeakingPracticeContent {
  set: PracticeSet & { type: "speaking" };
  payload: SpeakingPayload;
}

export interface SpeakingPlanContext {
  planDate: string;
  blockId: string;
  itemKey: string;
}

export interface SpeakingLoadResult {
  sets: readonly SpeakingPracticeContent[];
  studyDayStartHour: number;
}

export interface SpeakingCompletionInput {
  attempt: Attempt;
  session: StudySession;
  planContext?: SpeakingPlanContext;
}

export interface SpeakingPracticeStore {
  load(): Promise<SpeakingLoadResult>;
  saveRecording(recording: SpeakingRecording): Promise<void>;
  deleteRecording(recordingId: string): Promise<void>;
  complete(input: SpeakingCompletionInput): Promise<void>;
}

export interface CapturedSpeakingRecording {
  blob: Blob;
  durationMs: number;
  mimeType: string;
}

export interface SpeakingRecorder {
  isSupported(): boolean;
  start(): Promise<void>;
  stop(): Promise<CapturedSpeakingRecording>;
  dispose(): void;
}

export interface SpeakingClock {
  now(): Date;
}

export interface SpeakingPracticePageProps {
  store: SpeakingPracticeStore;
  recorder?: SpeakingRecorder;
  clock?: SpeakingClock;
  setId?: string;
  planContext?: SpeakingPlanContext;
  timeZone?: string;
  onBack?: () => void;
  onComplete?: () => void;
}
