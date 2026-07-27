import { describe, expect, it } from "vitest";
import { mockPracticeSets } from "../../content/pilot/practiceMock";
import { pilotContentPack } from "../../content/pilot/pilotContentPack";
import { pilotListeningPracticeSets } from "../../content/pilot/practiceListening";
import { speakingPracticeSets } from "../../content/pilot/practiceSpeaking";
import { pilotWritingPracticeSets } from "../../content/pilot/practiceWriting";
import {
  listeningPayloadSchema,
  mockPayloadSchema,
  speakingPayloadSchema,
  summaryPromptPayloadSchema,
} from "./practiceSchemas";
import { validateContentPack, validatePilotPracticeCoverage } from "./validatePack";

describe("技能教材の共通検証", () => {
  it("Pilotの25セットと技能別最低件数をruntime検証する", () => {
    const result = validateContentPack(pilotContentPack);

    expect(result.issues).toEqual([]);
    expect(result.validPracticeSets).toHaveLength(25);
    expect(validatePilotPracticeCoverage(result.validPracticeSets)).toEqual([]);
    expect(
      result.validPracticeSets.every((set) => set.source.type === "original"),
    ).toBe(true);
  });

  it("Pilot IDの教材不足を通常のpack検証でも拒否する", () => {
    const result = validateContentPack({
      ...pilotContentPack,
      practiceSets: [],
    });

    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ itemId: "coverage:reading" }),
        expect.objectContaining({ itemId: "coverage:listening" }),
        expect.objectContaining({ itemId: "coverage:summary" }),
        expect.objectContaining({ itemId: "coverage:opinion" }),
        expect.objectContaining({ itemId: "coverage:speaking" }),
        expect.objectContaining({ itemId: "coverage:mock" }),
      ]),
    );
  });

  it("外部URLの音声assetを拒否する", () => {
    const source = listeningPayloadSchema.parse(pilotListeningPracticeSets[0]!.payload);
    const result = listeningPayloadSchema.safeParse({
      ...source,
      audio: {
        strategy: "asset",
        language: "en-US",
        assetUrl: "https://example.com/official-audio.mp3",
      },
    });

    expect(result.success).toBe(false);
  });

  it("作文の語数範囲をtype別の固定値として検証する", () => {
    const source = summaryPromptPayloadSchema.parse(
      pilotWritingPracticeSets[0]!.payload,
    );

    expect(
      summaryPromptPayloadSchema.safeParse({
        ...source,
        targetWordMin: 44,
      }).success,
    ).toBe(false);
  });

  it("会話の場面ID重複と本文にないNo.1根拠を拒否する", () => {
    const source = speakingPayloadSchema.parse(speakingPracticeSets[0]!.payload);
    const duplicatedScenes = source.scenes.map((scene) => ({
      ...scene,
      id: "same-scene",
    }));

    expect(
      speakingPayloadSchema.safeParse({
        ...source,
        scenes: duplicatedScenes,
        no1EvidenceQuote: "This sentence is not in the passage.",
      }).success,
    ).toBe(false);
  });

  it("模試のID重複・存在しない復習先・非公式表記不足を拒否する", () => {
    const source = mockPayloadSchema.parse(mockPracticeSets[0]!.payload);
    const firstSection = source.sections[0]!;
    const invalidSection = {
      ...firstSection,
      questions: firstSection.questions.map((question) => ({
        ...question,
        reviewPath: "/does-not-exist",
      })),
    };

    expect(
      mockPayloadSchema.safeParse({
        noticeJa: "公式という言葉はあります。",
        sections: [invalidSection, invalidSection],
      }).success,
    ).toBe(false);
  });
});
