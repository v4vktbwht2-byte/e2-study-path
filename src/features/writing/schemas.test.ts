import { describe, expect, it } from "vitest";
import { pilotWritingPracticeSets } from "../../content/pilot/practiceWriting";
import { practiceSetSchema } from "../../infrastructure/content/schemas";
import {
  parseWritingPracticeSet,
  parseWritingPracticeSets,
  WritingContentValidationError,
} from "./schemas";

describe("ライティング課題payload検証", () => {
  it("オリジナル要約4題・意見4題を共通schemaと専用schemaで検証する", () => {
    expect(
      pilotWritingPracticeSets.every(
        (practiceSet) => practiceSetSchema.safeParse(practiceSet).success,
      ),
    ).toBe(true);

    const prompts = parseWritingPracticeSets(pilotWritingPracticeSets);
    expect(prompts.filter((prompt) => prompt.type === "summary")).toHaveLength(4);
    expect(prompts.filter((prompt) => prompt.type === "opinion")).toHaveLength(4);
    expect(prompts.every((prompt) => prompt.source.type === "original")).toBe(true);
  });

  it("要約payloadの原文・key points不足を拒否する", () => {
    const source = pilotWritingPracticeSets.find(
      (candidate) => candidate.type === "summary",
    );
    if (source === undefined) {
      throw new Error("要約課題がありません。");
    }
    expect(() =>
      parseWritingPracticeSet({
        ...source,
        payload: {
          instructionsJa: "要約してください。",
          sourceText: "Too short.",
          keyPoints: ["一つだけ"],
          focusJa: "中心を探します。",
        },
      }),
    ).toThrow(WritingContentValidationError);
  });

  it("意見payloadのPOINTSが3件未満なら拒否する", () => {
    const source = pilotWritingPracticeSets.find(
      (candidate) => candidate.type === "opinion",
    );
    if (source === undefined) {
      throw new Error("意見課題がありません。");
    }
    expect(() =>
      parseWritingPracticeSet({
        ...source,
        payload: {
          instructionsJa: "意見を書いてください。",
          topic: "Should people study every day?",
          topicJa: "毎日勉強すべきですか。",
          points: ["Time", "Learning"],
        },
      }),
    ).toThrow(WritingContentValidationError);
  });

  it("作文以外のpractice setを明示的に拒否する", () => {
    const first = pilotWritingPracticeSets[0];
    if (first === undefined) {
      throw new Error("作文課題がありません。");
    }
    expect(() =>
      parseWritingPracticeSet({
        ...first,
        type: "reading",
      }),
    ).toThrow(WritingContentValidationError);
  });
});
