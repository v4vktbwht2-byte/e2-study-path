import { describe, expect, it } from "vitest";
import { reinsertAgainItem } from "./sessionQueue";

describe("Againのセッション内再挿入", () => {
  it("既存の同一項目を重複させず末尾へ移し3問以上を挟む", () => {
    const again = { itemKey: "vocab:again", label: "再出題" };
    const remaining = [
      again,
      { itemKey: "vocab:a", label: "A" },
      { itemKey: "vocab:b", label: "B" },
      { itemKey: "vocab:c", label: "C" },
      { itemKey: "vocab:d", label: "D" },
    ];
    const snapshot = structuredClone(remaining);
    const result = reinsertAgainItem(remaining, again);

    expect(result.queue.map(({ itemKey }) => itemKey)).toEqual([
      "vocab:a",
      "vocab:b",
      "vocab:c",
      "vocab:d",
      "vocab:again",
    ]);
    expect(result).toMatchObject({
      insertionIndex: 4,
      questionsBetween: 4,
      minimumSpacingMet: true,
      additionalQuestionsNeeded: 0,
    });
    expect(remaining).toEqual(snapshot);
  });

  it("残りが3問未満なら必要な追加問題数を通知する", () => {
    const result = reinsertAgainItem([{ itemKey: "vocab:a" }], {
      itemKey: "vocab:again",
    });

    expect(result.minimumSpacingMet).toBe(false);
    expect(result.additionalQuestionsNeeded).toBe(2);
    expect(result.queue.at(-1)?.itemKey).toBe("vocab:again");
  });

  it("同一入力から同一の再挿入結果を返す", () => {
    const remaining = [
      { itemKey: "vocab:a" },
      { itemKey: "vocab:b" },
      { itemKey: "vocab:c" },
    ];
    const again = { itemKey: "vocab:again" };
    expect(reinsertAgainItem(remaining, again)).toEqual(
      reinsertAgainItem(remaining, again),
    );
  });
});
