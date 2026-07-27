import { describe, expect, it } from "vitest";
import { contentTextLanguage, segmentContentText } from "./textLanguage";

describe("教材文字列の言語判定", () => {
  it.each([
    ["The city needs more parks.", "en"],
    ["A", "en"],
    ["都市には公園が必要です。", undefined],
    ["The cityは公園を増やします。", undefined],
  ] as const)("%s", (text, expected) => {
    expect(contentTextLanguage(text)).toBe(expected);
  });

  it("英日混在の教材を言語別の表示単位へ分ける", () => {
    expect(segmentContentText("She ___ a teacher. の空所に入る語を選びます。")).toEqual(
      [
        { text: "She ___ a teacher. ", language: "en" },
        { text: "の空所に入る語を選びます。" },
      ],
    );
  });

  it("英文だけの教材を1つの英語表示単位にする", () => {
    expect(segmentContentText("Choose the best answer.")).toEqual([
      { text: "Choose the best answer.", language: "en" },
    ]);
  });
});
