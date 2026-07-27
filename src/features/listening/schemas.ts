import type { z } from "zod";
import {
  listeningPayloadSchema,
  listeningPlaybackRateSchema,
} from "../../infrastructure/content/practiceSchemas";
import {
  practiceSetSchema,
  type PracticeSet,
} from "../../infrastructure/content/schemas";

export { listeningPayloadSchema, listeningPlaybackRateSchema };

export type ListeningPayload = z.infer<typeof listeningPayloadSchema>;
export type ListeningPlaybackRate = z.infer<typeof listeningPlaybackRateSchema>;
export type ListeningSentence = ListeningPayload["script"]["sentences"][number];
export type ListeningChoice = ListeningPayload["question"]["choices"][number];

export type ListeningPracticeSet = Omit<PracticeSet, "payload" | "type"> & {
  type: "listening";
  payload: ListeningPayload;
};

export function parseListeningPracticeSet(value: unknown): ListeningPracticeSet {
  const base = practiceSetSchema.parse(value);
  if (base.type !== "listening") {
    throw new Error(`教材 ${base.id} はリスニング教材ではありません。`);
  }
  return {
    ...base,
    type: "listening",
    payload: listeningPayloadSchema.parse(base.payload),
  };
}

export function parseListeningPracticeSets(
  values: readonly unknown[],
): readonly ListeningPracticeSet[] {
  const parsed = values.map(parseListeningPracticeSet);
  const ids = parsed.map((set) => set.id);
  if (new Set(ids).size !== ids.length) {
    throw new Error("リスニング教材のIDが重複しています。");
  }
  return parsed;
}
