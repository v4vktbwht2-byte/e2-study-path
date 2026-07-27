import type { Attempt, StudySession } from "../../domain/models";
import type { LearningSkill } from "../../domain/planning";
import type { AudioService } from "../../infrastructure/audio";
import type { PracticeSet } from "../../infrastructure/content/schemas";

export interface MockQuestion {
  id: string;
  prompt: string;
  choices: string[];
  correctChoiceIndex: number;
  explanationJa: string;
  reviewPath: string;
}

export interface MockStimulus {
  kind: "passage" | "script";
  title: string;
  text: string;
}

export interface MockSection {
  id: string;
  titleJa: string;
  skill: LearningSkill;
  timeLimitSeconds: number;
  instructionsJa: string;
  stimulus?: MockStimulus;
  questions: MockQuestion[];
}

export interface MockPayload {
  noticeJa: string;
  sections: MockSection[];
}

export interface MockPracticeContent {
  set: PracticeSet & { type: "mock" };
  payload: MockPayload;
}

export interface MockPlanContext {
  planDate: string;
  blockId: string;
  itemKey: string;
}

export interface MockLoadResult {
  sets: readonly MockPracticeContent[];
  studyDayStartHour: number;
}

export interface CompleteMockInput {
  attempts: readonly Attempt[];
  session: StudySession;
  planContext?: MockPlanContext;
}

export interface MockPracticeStore {
  load(): Promise<MockLoadResult>;
  complete(input: CompleteMockInput): Promise<void>;
}

export interface MockClock {
  now(): Date;
}

export interface MockPracticePageProps {
  store: MockPracticeStore;
  audio?: AudioService;
  setId?: string;
  planContext?: MockPlanContext;
  clock?: MockClock;
  timeZone?: string;
  confirmExit?: (message: string) => boolean;
  onExit?: () => void;
  onOpenReview?: (path: string) => void;
  onComplete?: () => void;
  onActiveChange?: (active: boolean) => void;
}
