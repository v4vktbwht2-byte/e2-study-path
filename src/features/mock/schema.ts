import { mockPayloadSchema } from "../../infrastructure/content/practiceSchemas";
import type { PracticeSet } from "../../infrastructure/content/schemas";
import type { MockPracticeContent } from "./types";

export { mockPayloadSchema };

export function parseMockPracticeSet(set: PracticeSet): MockPracticeContent {
  if (set.type !== "mock") {
    throw new Error(`短縮模試教材ではありません: ${set.id}`);
  }
  const parsed = mockPayloadSchema.safeParse(set.payload);
  if (!parsed.success) {
    throw new Error(
      `短縮模試教材 ${set.id} の形式が不正です: ${parsed.error.issues
        .map((issue) => issue.message)
        .join("; ")}`,
    );
  }
  return {
    set: set as PracticeSet & { type: "mock" },
    payload: parsed.data,
  };
}
