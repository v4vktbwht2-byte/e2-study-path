import { describe, expect, it } from "vitest";
import {
  countWritingWords,
  evaluateWritingWordCount,
  tokenizeWritingWords,
} from "./wordCount";

describe("ライティング語数カウント", () => {
  it("連続する空白・改行・句読点を区切りとして英単語を数える", () => {
    expect(countWritingWords("  We study English.\nIt helps us communicate!  ")).toBe(
      7,
    );
  });

  it("短縮形、所有格、ハイフン語をそれぞれ1語として数える", () => {
    expect(tokenizeWritingWords("I don't use my sister's well-known app.")).toEqual([
      "I",
      "don't",
      "use",
      "my",
      "sister's",
      "well-known",
      "app",
    ]);
  });

  it("Unicode文字を正規化し、アクセント付き単語と全角文字を扱う", () => {
    expect(countWritingWords("A café serves re\u0301sume\u0301 advice.")).toBe(5);
    expect(countWritingWords("英語を学ぶ。")).toBe(5);
    expect(countWritingWords("🙂 — …")).toBe(0);
  });

  it("要約の45〜55語を短い・範囲内・長いに分類する", () => {
    const words = Array.from({ length: 45 }, (_, index) => `word${index + 1}`);
    expect(evaluateWritingWordCount("summary", words.slice(0, 44).join(" "))).toEqual({
      count: 44,
      range: { min: 45, max: 55 },
      status: "short",
      difference: 1,
    });
    expect(evaluateWritingWordCount("summary", words.join(" ")).status).toBe("within");
    expect(
      evaluateWritingWordCount("summary", [...words, ...words.slice(0, 11)].join(" ")),
    ).toMatchObject({ status: "long", difference: 1 });
  });

  it("意見英作文の80〜100語を判定する", () => {
    const text = Array.from({ length: 100 }, () => "reason").join(" ");
    expect(evaluateWritingWordCount("opinion", text)).toMatchObject({
      count: 100,
      status: "within",
    });
    expect(evaluateWritingWordCount("opinion", `${text} conclusion`)).toMatchObject({
      count: 101,
      status: "long",
      difference: 1,
    });
  });
});
