import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ExerciseRenderer } from "./ExerciseRenderer";
import type { Exercise } from "./types";

function exercise(type: Exercise["type"], payload: Record<string, unknown>): Exercise {
  return {
    id: `exercise-${type}`,
    schemaVersion: "1.0.0",
    contentRevision: 1,
    type,
    stage: 1,
    lessonId: "lesson-a",
    prompt: "内容に合う答えを選んでください。",
    payload,
    answer: 0,
    explanation: "回答の解説です。",
    hints: [],
    targetSkills: [type === "listenAndChoose" ? "listening" : "reading"],
    targetMasteryDimensions: ["recognition"],
    reviewItemKeys: ["vocab:hello"],
    estimatedSeconds: 20,
    tags: [],
    source: { type: "original", author: "テスト" },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("問題レンダラーの教材表示", () => {
  it("readingQuestionのpassageを読解本文として表示する", () => {
    render(
      <ExerciseRenderer
        exercise={exercise("readingQuestion", {
          passage: "Mika studies English every morning.",
          choices: ["朝", "夜"],
        })}
      />,
    );

    expect(screen.getByLabelText("読解本文")).toHaveTextContent(
      "Mika studies English every morning.",
    );
  });

  it("英語だけの問題文・選択肢へlang=enを付け、日本語混在はページ既定を使う", () => {
    render(
      <ExerciseRenderer
        exercise={{
          ...exercise("multipleChoice", {
            choices: ["We study English.", "日本語の選択肢"],
          }),
          prompt: "Choose the best answer.",
        }}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Choose the best answer." }),
    ).toHaveAttribute("lang", "en");
    expect(screen.getByText("We study English.")).toHaveAttribute("lang", "en");
    expect(screen.getByText("日本語の選択肢")).not.toHaveAttribute("lang");
  });

  it("英日混在の問題文では英文部分だけにlang=enを付ける", () => {
    render(
      <ExerciseRenderer
        exercise={{
          ...exercise("multipleChoice", {
            choices: ["is", "are"],
          }),
          prompt: "She ___ a teacher. の空所に入る語を選びます。",
        }}
      />,
    );

    const heading = screen.getByRole("heading", {
      name: "She ___ a teacher.の空所に入る語を選びます。",
    });
    expect(heading.querySelector('span[lang="en"]')).toHaveTextContent(
      "She ___ a teacher.",
    );
    expect(screen.getByText("の空所に入る語を選びます。")).not.toHaveAttribute("lang");
  });

  it("Web Speech非対応時はspeechTextを明示して表示する", () => {
    vi.stubGlobal("speechSynthesis", undefined);
    vi.stubGlobal("SpeechSynthesisUtterance", undefined);

    render(
      <ExerciseRenderer
        exercise={exercise("listenAndChoose", {
          speechText: "Please open the window.",
          choices: ["窓を開ける", "窓を閉める"],
        })}
      />,
    );

    expect(screen.getByText("音声の代わりに英文を表示します")).toBeInTheDocument();
    expect(screen.getByText("Please open the window.")).toHaveAttribute("lang", "en");
    expect(
      screen.queryByRole("button", { name: "英文を聞く" }),
    ).not.toBeInTheDocument();
  });

  it("Web Speech対応時は英語音声を再生する", async () => {
    const speak = vi.fn();
    const cancel = vi.fn();
    class FakeSpeechSynthesisUtterance {
      lang = "";

      constructor(readonly text: string) {}
    }
    vi.stubGlobal("speechSynthesis", { speak, cancel });
    vi.stubGlobal("SpeechSynthesisUtterance", FakeSpeechSynthesisUtterance);

    render(
      <ExerciseRenderer
        exercise={exercise("listenAndChoose", {
          speechText: "Please open the window.",
          choices: ["窓を開ける", "窓を閉める"],
        })}
      />,
    );

    await userEvent.setup().click(screen.getByRole("button", { name: "英文を聞く" }));

    expect(cancel).toHaveBeenCalledTimes(1);
    expect(speak).toHaveBeenCalledWith(
      expect.objectContaining({
        text: "Please open the window.",
        lang: "en-US",
      }),
    );
  });
});
