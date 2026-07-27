import type { WritingType, WritingWordCountGuide, WritingWordRange } from "./types";

const CJK_CHARACTER =
  "[\\p{Script=Han}\\p{Script=Hiragana}\\p{Script=Katakana}\\p{Script=Hangul}]";
const WORD_CHARACTER = "[\\p{L}\\p{M}\\p{N}]";
const WORD_TOKEN = `${WORD_CHARACTER}+(?:['’${"\u2010\u2011-"}]${WORD_CHARACTER}+)*`;
const TOKEN_PATTERN = new RegExp(`${CJK_CHARACTER}|${WORD_TOKEN}`, "gu");

export const WRITING_WORD_RANGES: Readonly<Record<WritingType, WritingWordRange>> = {
  summary: { min: 45, max: 55 },
  opinion: { min: 80, max: 100 },
};

/**
 * 空白区切りだけに依存せず、英語の短縮形・ハイフン語・アクセント付き文字を
 * 1語として数える。CJK文字は空白を置かない文章でも数えられるよう1文字を1語とする。
 * 絵文字と句読点だけの並びは語数へ含めない。
 */
export function tokenizeWritingWords(text: string): readonly string[] {
  return text.normalize("NFC").match(TOKEN_PATTERN) ?? [];
}

export function countWritingWords(text: string): number {
  return tokenizeWritingWords(text).length;
}

export function evaluateWritingWordCount(
  type: WritingType,
  text: string,
): WritingWordCountGuide {
  const count = countWritingWords(text);
  const range = WRITING_WORD_RANGES[type];
  if (count < range.min) {
    return {
      count,
      range,
      status: "short",
      difference: range.min - count,
    };
  }
  if (count > range.max) {
    return {
      count,
      range,
      status: "long",
      difference: count - range.max,
    };
  }
  return {
    count,
    range,
    status: "within",
    difference: 0,
  };
}
