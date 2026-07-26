import type { Attempt, LessonProgress } from "../../domain/models";
import type { Exercise, Lesson } from "../../infrastructure/content/schemas";
import type { LessonContentReader, LessonProgressStore } from "../course/types";

export type LessonSectionKind =
  "goal" | "explanation" | "example" | "exercise" | "recall" | "practice" | "summary";

export interface NormalizedLessonSection {
  id: string;
  kind: LessonSectionKind;
  titleJa: string;
  estimatedMinutes: number;
  bodyJa?: string;
  objectivesJa?: readonly string[];
  examples?: readonly { en: string; ja: string }[];
  exercises: readonly Exercise[];
  missingExerciseIds: readonly string[];
}

export interface LessonExerciseResult {
  exerciseId: string;
  correct: boolean | null;
  response: unknown;
  hintCount: number;
}

/**
 * レッスン開始時に注入された時計から一度だけ作る識別情報。
 * Attempt と StudySession が同じ学習日・セッションを参照するために使う。
 */
export interface LessonSessionIdentity {
  id: string;
  startedAt: string;
  studyDate: string;
}

export interface LessonAttemptCommitInput {
  attempt: Attempt;
  session: LessonSessionIdentity;
}

export type TerminalLessonProgress = LessonProgress & {
  status: "completed" | "skipped";
};

export interface LessonTerminalCommitInput {
  lesson: Lesson;
  progress: TerminalLessonProgress;
  session: LessonSessionIdentity;
}

/**
 * レッスン中の複数テーブル更新をUIから隠す永続化境界。
 * 実装側は各メソッドを単一トランザクションとして確定する。
 */
export interface LessonLearningStore extends LessonProgressStore {
  recordAttempt(input: LessonAttemptCommitInput): Promise<void>;
  commitTerminal(input: LessonTerminalCommitInput): Promise<void>;
}

export interface LessonClock {
  now(): Date;
}

export interface LessonRendererProps {
  lessonId: string;
  content: LessonContentReader;
  progressStore: LessonLearningStore;
  clock?: LessonClock;
  onExerciseResult?: (result: LessonExerciseResult) => void | Promise<void>;
  onProgressSaved?: (progress: LessonProgress) => void;
  /**
   * 原子的な完了保存が成功した後の通知。画面遷移などに使う。
   */
  onComplete?: (lesson: Lesson, progress: LessonProgress) => void | Promise<void>;
  /**
   * 原子的なスキップ保存が成功した後の通知。画面遷移などに使う。
   */
  onSkip?: (lesson: Lesson, progress: LessonProgress) => void | Promise<void>;
  onExit?: () => void;
}

export type { Exercise, Lesson, LessonContentReader, LessonProgressStore };
