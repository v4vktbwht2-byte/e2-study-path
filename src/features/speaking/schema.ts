import { speakingPayloadSchema } from "../../infrastructure/content/practiceSchemas";
import type { PracticeSet } from "../../infrastructure/content/schemas";
import type { SpeakingPracticeContent } from "./types";

export { speakingPayloadSchema };

export function parseSpeakingPracticeSet(set: PracticeSet): SpeakingPracticeContent {
  if (set.type !== "speaking") {
    throw new Error(`スピーキング教材ではありません: ${set.id}`);
  }
  const parsed = speakingPayloadSchema.safeParse(set.payload);
  if (!parsed.success) {
    throw new Error(
      `スピーキング教材 ${set.id} の形式が不正です: ${parsed.error.issues
        .map((issue) => issue.message)
        .join("; ")}`,
    );
  }
  return {
    set: set as PracticeSet & { type: "speaking" },
    payload: parsed.data,
  };
}
