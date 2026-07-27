import { describe, expect, it } from "vitest";
import {
  completedRubricCount,
  EMPTY_OPINION_OUTLINE,
  hasOpinionOutlineContent,
  normalizeWritingRubric,
} from "./rubric";

describe("ライティング自己評価", () => {
  it("4観点だけを安全に読み込む", () => {
    expect(
      normalizeWritingRubric({
        content: true,
        organization: false,
        vocabulary: true,
        grammar: false,
        unknown: true,
      }),
    ).toEqual({
      content: true,
      organization: false,
      vocabulary: true,
      grammar: false,
    });
  });

  it("確認済み観点を数える", () => {
    expect(
      completedRubricCount({
        content: true,
        organization: true,
        vocabulary: false,
        grammar: false,
      }),
    ).toBe(2);
  });

  it("構成メモの空白だけは未入力として扱う", () => {
    expect(hasOpinionOutlineContent(EMPTY_OPINION_OUTLINE)).toBe(false);
    expect(
      hasOpinionOutlineContent({ ...EMPTY_OPINION_OUTLINE, reason1: "  because " }),
    ).toBe(true);
  });
});
