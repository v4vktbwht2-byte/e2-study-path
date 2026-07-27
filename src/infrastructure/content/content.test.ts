import starterPackJson from "../../../contracts/sample/content-pack.sample.json";
import exercisesSample from "../../../contracts/sample/exercises.sample.json";
import lessonsSample from "../../../contracts/sample/lessons.sample.json";
import vocabularySample from "../../../contracts/sample/vocabulary.sample.json";
import { exerciseSchema, lessonSchema, vocabularyItemSchema } from "./schemas";
import { loadStarterPack } from "./starterPack";
import { validateContentPack } from "./validatePack";

describe("教材パック検証", () => {
  it("実際にbundleするPilot教材をstarter packとして読み込める", () => {
    const pack = loadStarterPack();

    expect(pack.id).toBe("pilot-core-ja-original");
    expect(pack.vocabulary.length).toBeGreaterThanOrEqual(140);
    expect(pack.lessons).toHaveLength(31);
    expect(pack.exercises).toHaveLength(155);
  });

  it("契約パックサンプルの回帰検証を維持する", () => {
    const result = validateContentPack(starterPackJson);

    expect(result.issues).toEqual([]);
    expect(result.pack?.id).toBe("sample-core-ja");
    expect(result.validVocabulary).toHaveLength(1);
    expect(result.validLessons).toHaveLength(1);
    expect(result.validExercises).toHaveLength(1);
  });

  it("単体の契約サンプルも同じruntime schemaで検証できる", () => {
    expect(() =>
      vocabularySample.forEach((item) => vocabularyItemSchema.parse(item)),
    ).not.toThrow();
    expect(() =>
      lessonsSample.forEach((item) => lessonSchema.parse(item)),
    ).not.toThrow();
    expect(() =>
      exercisesSample.forEach((item) => exerciseSchema.parse(item)),
    ).not.toThrow();
  });

  it("不正な教材1件を隔離して有効項目を残す", () => {
    const invalidVocabulary = {
      ...starterPackJson.vocabulary[0],
      id: "invalid-vocabulary",
      source: { type: "copied", author: "unknown" },
    };
    const result = validateContentPack({
      ...starterPackJson,
      vocabulary: [...starterPackJson.vocabulary, invalidVocabulary],
    });

    expect(result.validVocabulary).toHaveLength(1);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          scope: "vocabulary",
          itemId: "invalid-vocabulary",
        }),
      ]),
    );
  });

  it("重複IDと参照切れを報告する", () => {
    const duplicate = {
      ...starterPackJson.exercises[0],
      lessonId: "missing-lesson",
    };
    const result = validateContentPack({
      ...starterPackJson,
      exercises: [...starterPackJson.exercises, duplicate],
    });

    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: "IDが重複しています。" }),
        expect.objectContaining({
          message: "レッスン missing-lesson が存在しません。",
        }),
      ]),
    );
  });

  it("選択問題の正答index範囲を検証する", () => {
    const exercise = {
      ...starterPackJson.exercises[0],
      answer: 99,
    };
    const result = validateContentPack({
      ...starterPackJson,
      exercises: [exercise],
    });

    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          scope: "exercise",
          message: "選択肢または正答indexが不正です。",
        }),
      ]),
    );
  });

  it("raw HTMLを教材本文へ許可しない", () => {
    const exercise = {
      ...starterPackJson.exercises[0],
      prompt: "<strong>hello</strong> の意味は？",
    };
    const result = validateContentPack({
      ...starterPackJson,
      exercises: [exercise],
    });

    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: "raw HTMLは使用できません。" }),
      ]),
    );
  });
});
