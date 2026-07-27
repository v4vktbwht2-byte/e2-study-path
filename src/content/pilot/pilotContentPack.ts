import type {
  ContentPack,
  Exercise,
  Lesson,
} from "../../infrastructure/content/schemas";
import { ORIGINAL_CONTENT_SOURCE } from "./factories";
import { pilotListeningPracticeSets } from "./practiceListening";
import { mockPracticeSets } from "./practiceMock";
import { pilotReadingPracticeSets } from "./practiceReading";
import { speakingPracticeSets } from "./practiceSpeaking";
import { pilotWritingPracticeSets } from "./practiceWriting";
import { stage0Exercises, stage0Lessons } from "./stage0";
import { stage1Exercises, stage1Lessons } from "./stage1";
import { upperStageExercises, upperStageLessons } from "./upperStages";
import { pilotVocabulary } from "./vocabulary";

export const pilotLessons: readonly Lesson[] = [
  ...stage0Lessons,
  ...stage1Lessons,
  ...upperStageLessons,
];

export const pilotExercises: readonly Exercise[] = [
  ...stage0Exercises,
  ...stage1Exercises,
  ...upperStageExercises,
];

export const pilotDiagnosticExercises: readonly Exercise[] = pilotExercises.filter(
  (exercise) => exercise.tags.includes("diagnostic"),
);

export const pilotContentPack = {
  id: "pilot-core-ja-original",
  schemaVersion: "1.0.0",
  contentVersion: "0.7.0",
  locale: "ja-JP",
  title: "E2 Study Path Pilot オリジナル教材",
  description:
    "ステージ0〜6の導入レッスンと初期診断に使用する、日本語話者向けのオリジナル教材パックです。",
  generatedAt: "2026-07-27T00:00:00Z",
  source: ORIGINAL_CONTENT_SOURCE,
  vocabulary: [...pilotVocabulary],
  lessons: [...pilotLessons],
  exercises: [...pilotExercises],
  practiceSets: [
    ...pilotReadingPracticeSets,
    ...pilotListeningPracticeSets,
    ...pilotWritingPracticeSets,
    ...speakingPracticeSets,
    ...mockPracticeSets,
  ],
} satisfies ContentPack;

export function getPilotLessonsByStage(stage: number): readonly Lesson[] {
  return pilotLessons.filter((lesson) => lesson.stage === stage);
}
