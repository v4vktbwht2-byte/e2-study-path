import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Lesson } from "../../infrastructure/content/schemas";
import { CourseMap } from "./CourseMap";
import { StageDetail } from "./StageDetail";

function lesson(
  id: string,
  stage: number,
  order: number,
  prerequisites: string[] = [],
): Lesson {
  return {
    id,
    schemaVersion: "1.0.0",
    contentRevision: 1,
    stage,
    unitId: `S${stage}-U1`,
    order,
    titleJa: id === "lesson-a" ? "最初の文" : "次の文",
    descriptionJa: "やさしい説明です。",
    objectivesJa: ["短い文を作る"],
    prerequisites,
    sections: [
      {
        id: "summary",
        type: "summary",
        titleJa: "まとめ",
        bodyJa: "まとめです。",
        estimatedMinutes: 1,
      },
    ],
    estimatedMinutes: 5,
    reviewItemKeys: [],
    source: { type: "original", author: "テスト" },
  };
}

const progressStore = {
  get: () => Promise.resolve(undefined),
  save: () => Promise.resolve(),
};

describe("コース画面", () => {
  it("7ステージ・現在地・おすすめ開始地点を表示する", async () => {
    const onOpenStage = vi.fn();
    render(
      <CourseMap
        content={{ listLessons: () => Promise.resolve([lesson("lesson-a", 1, 1)]) }}
        progressStore={progressStore}
        currentStage={1}
        recommendedStage={1}
        onOpenStage={onOpenStage}
      />,
    );

    expect(
      await screen.findByRole("heading", { name: "ステージマップ" }),
    ).toBeInTheDocument();
    expect(screen.getByText("はじめての英語")).toBeInTheDocument();
    expect(screen.getByText("英検2級対策")).toBeInTheDocument();
    expect(screen.getByText("現在地")).toBeInTheDocument();
    expect(screen.getByText("おすすめ開始地点")).toBeInTheDocument();

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "ステージ1を見る" }));
    expect(onOpenStage).toHaveBeenCalledWith(1);
  });

  it("前提未完了を案内しつつ開始ボタンを有効に保つ", async () => {
    const onOpenLesson = vi.fn();
    render(
      <StageDetail
        stage={1}
        content={{
          listLessons: () =>
            Promise.resolve([
              lesson("lesson-a", 1, 1),
              lesson("lesson-b", 1, 2, ["lesson-a"]),
            ]),
        }}
        progressStore={progressStore}
        recommendedStage={1}
        onOpenLesson={onOpenLesson}
      />,
    );

    expect(
      await screen.findByRole("heading", { name: "1文を作る" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/このまま始めることもできます/)).toBeInTheDocument();
    const startButtons = screen.getAllByRole("button", {
      name: "このレッスンを始める",
    });
    expect(startButtons[1]).toBeEnabled();
    await userEvent.setup().click(startButtons[1]!);
    expect(onOpenLesson).toHaveBeenCalledWith("lesson-b");
  });

  it("読み込み失敗時に再試行できる", async () => {
    let attempts = 0;
    const listLessons = vi.fn(() => {
      attempts += 1;
      if (attempts === 1) {
        return Promise.reject(new Error("一時的な読み込みエラー"));
      }
      return Promise.resolve([lesson("lesson-a", 1, 1)]);
    });
    render(
      <CourseMap
        content={{ listLessons }}
        progressStore={progressStore}
        currentStage={1}
        recommendedStage={1}
        onOpenStage={() => undefined}
      />,
    );

    expect(await screen.findByText("一時的な読み込みエラー")).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "もう一度試す" }));
    expect(
      await screen.findByRole("heading", { name: "ステージマップ" }),
    ).toBeInTheDocument();
    expect(listLessons).toHaveBeenCalledTimes(2);
  });
});
