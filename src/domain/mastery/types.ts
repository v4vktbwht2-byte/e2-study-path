import type { ResponseSpeed, ResponseTiming, ReviewConfidence } from "../review/types";
import type {
  MasteryDimension as DomainMasteryDimension,
  MasteryProfile as DomainMasteryProfile,
} from "../models";

/** アプリ全体の正本型を、このドメインAPIからも公開する。 */
export type MasteryDimension = DomainMasteryDimension;
export type MasteryProfile = DomainMasteryProfile;

export type MasteryExerciseMode =
  | "recognitionChoice"
  | "recallChoice"
  | "textInput"
  | "cloze"
  | "listeningChoice"
  | "dictation"
  | "selfRecall"
  | "other";

export interface MasteryAttemptResult {
  correct: boolean;
  hintCount: number;
  confidence?: ReviewConfidence;
  responseSpeed?: ResponseSpeed;
  responseTiming?: ResponseTiming;
  speedAdjustmentEnabled?: boolean;
  /** 同じセッションでAgain後に再出題し、今回は正解した場合。 */
  correctAfterAgain?: boolean;
  exerciseMode: MasteryExerciseMode;
  targetDimensions: readonly MasteryDimension[];
  /**
   * dimensionごとの反映比率。未指定は1。
   * 0〜1の範囲だけを受け付ける。
   */
  targetWeights?: Readonly<Partial<Record<MasteryDimension, number>>>;
}

export interface UpdateMasteryInput {
  profile: Readonly<MasteryProfile>;
  attempt: Readonly<MasteryAttemptResult>;
  /** 呼び出し側から注入する現在時刻。 */
  now: Date;
}

export interface MasteryUpdateResult {
  profile: MasteryProfile;
  appliedDelta: Readonly<Record<MasteryDimension, number>>;
}
