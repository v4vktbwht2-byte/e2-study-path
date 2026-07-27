import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { LessonProgress } from "../../domain/models";
import { LessonRenderer } from "./LessonRenderer";
import type {
  Exercise,
  Lesson,
  LessonContentReader,
  LessonLearningStore,
} from "./types";

const NOW = new Date("2026-07-27T00:00:00.000Z");
const clock = { now: () => NOW };

function exercise(): Exercise {
  return {
    id: "exercise-a",
    schemaVersion: "1.0.0",
    contentRevision: 1,
    type: "multipleChoice",
    stage: 1,
    lessonId: "lesson-a",
    prompt: "hello の意味を選んでください。",
    payload: { choices: ["こんにちは", "さようなら"] },
    answer: 0,
    explanation: "hello は『こんにちは』という意味です。",
    hints: ["会ったときに使います。", "最初の選択肢です。"],
    targetSkills: ["vocabulary"],
    targetMasteryDimensions: ["recognition"],
    reviewItemKeys: [],
    estimatedSeconds: 10,
    tags: [],
    source: { type: "original", author: "テスト" },
  };
}

function selfRecallExercise(): Exercise {
  return {
    ...exercise(),
    id: "exercise-recall",
    type: "selfRecall",
    prompt: "hello の意味を思い出してください。",
    payload: {},
    answer: null,
    explanation: "思い出した内容と回答例を比べましょう。",
    targetMasteryDimensions: ["recall"],
  };
}

function lesson(): Lesson {
  return {
    id: "lesson-a",
    schemaVersion: "1.0.0",
    contentRevision: 1,
    stage: 1,
    unitId: "S1-U1",
    order: 1,
    titleJa: "hello であいさつする",
    descriptionJa: "基本のあいさつです。",
    objectivesJa: ["hello の意味が分かる"],
    prerequisites: [],
    sections: [
      {
        id: "exercise",
        type: "exercise",
        titleJa: "確認",
        exerciseIds: ["exercise-a"],
        estimatedMinutes: 1,
      },
      {
        id: "summary",
        type: "summary",
        titleJa: "まとめ",
        bodyJa: "hello を確認しました。",
        estimatedMinutes: 1,
      },
    ],
    estimatedMinutes: 3,
    reviewItemKeys: ["vocab:hello"],
    source: { type: "original", author: "テスト" },
  };
}

function content(): LessonContentReader {
  return {
    getLesson: () => Promise.resolve(lesson()),
    getExercises: () => Promise.resolve([exercise()]),
  };
}

function contentWithExercise(value: Exercise): LessonContentReader {
  return {
    getLesson: () =>
      Promise.resolve({
        ...lesson(),
        sections: lesson().sections.map((section) =>
          section.id === "exercise" ? { ...section, exerciseIds: [value.id] } : section,
        ),
      }),
    getExercises: () => Promise.resolve([value]),
  };
}

function progress(
  status: LessonProgress["status"],
  currentSectionIndex: number,
): LessonProgress {
  return {
    lessonId: "lesson-a",
    status,
    currentSectionIndex,
    updatedAt: "2026-07-26T00:00:00.000Z",
  };
}

function progressStore(initial?: LessonProgress) {
  const save = vi.fn((savedProgress: LessonProgress) => {
    void savedProgress;
    return Promise.resolve();
  });
  const recordAttempt = vi.fn(
    (input: Parameters<LessonLearningStore["recordAttempt"]>[0]) => {
      void input;
      return Promise.resolve();
    },
  );
  const commitTerminal = vi.fn(
    (input: Parameters<LessonLearningStore["commitTerminal"]>[0]) => {
      void input;
      return Promise.resolve();
    },
  );
  const saveReviewCheckpoint = vi.fn(
    (
      input: Parameters<LessonLearningStore["saveReviewCheckpoint"]>[0],
    ): Promise<LessonProgress> =>
      Promise.resolve({
        ...input.progress,
        updatedAt: input.updatedAt,
        reviewCheckpoint: {
          planDate: input.planContext.planDate,
          blockId: input.planContext.blockId,
          currentSectionIndex: input.currentSectionIndex,
          answeredExerciseIds: [...input.answeredExerciseIds],
          updatedAt: input.updatedAt,
        },
      }),
  );
  const store: LessonLearningStore = {
    get: () => Promise.resolve(initial),
    save,
    recordAttempt,
    saveReviewCheckpoint,
    commitTerminal,
  };
  return {
    store,
    save,
    recordAttempt,
    saveReviewCheckpoint,
    commitTerminal,
  };
}

describe("レッスンレンダラー", () => {
  it("保存されたセクション位置から再開して見出しへフォーカスする", async () => {
    const { store } = progressStore(progress("inProgress", 1));
    render(
      <LessonRenderer
        lessonId="lesson-a"
        content={content()}
        progressStore={store}
        clock={clock}
      />,
    );

    const heading = await screen.findByRole("heading", {
      name: "確認",
      level: 2,
    });
    expect(heading).toHaveFocus();
    expect(screen.getByText(/前回の続きから再開しました/)).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "2");
  });

  it("次へ移動する前に進捗を保存する", async () => {
    const { store, save } = progressStore();
    render(
      <LessonRenderer
        lessonId="lesson-a"
        content={content()}
        progressStore={store}
        clock={clock}
      />,
    );
    await screen.findByRole("heading", {
      name: "今日できるようになること",
    });
    await userEvent.setup().click(screen.getByRole("button", { name: "次へ" }));
    expect(
      await screen.findByRole("heading", { name: "確認", level: 2 }),
    ).toBeInTheDocument();
    expect(save).toHaveBeenLastCalledWith({
      lessonId: "lesson-a",
      status: "inProgress",
      currentSectionIndex: 1,
      updatedAt: NOW.toISOString(),
    });
  });

  it("段階ヒントの使用数と採点結果をcallbackへ渡す", async () => {
    const onExerciseResult = vi.fn();
    const { store, recordAttempt } = progressStore(progress("inProgress", 1));
    render(
      <LessonRenderer
        lessonId="lesson-a"
        content={content()}
        progressStore={store}
        clock={clock}
        onExerciseResult={onExerciseResult}
      />,
    );
    await screen.findByText("hello の意味を選んでください。");
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "ヒントを見る" }));
    expect(screen.getByText("会ったときに使います。")).toBeInTheDocument();
    await user.click(screen.getByLabelText("こんにちは"));
    await user.click(screen.getByRole("button", { name: "答えを確認" }));

    expect(screen.getByText("確認できました")).toBeInTheDocument();
    expect(onExerciseResult).toHaveBeenCalledWith({
      exerciseId: "exercise-a",
      correct: true,
      response: 0,
      hintCount: 1,
    });
    expect(recordAttempt).toHaveBeenCalledWith({
      attempt: {
        id: "lesson-session:lesson-a:2026-07-27T00:00:00.000Z:attempt:1",
        itemKey: "vocab:hello",
        exerciseId: "exercise-a",
        sessionId: "lesson-session:lesson-a:2026-07-27T00:00:00.000Z",
        createdAt: "2026-07-27T00:00:00.000Z",
        studyDate: "2026-07-27",
        mode: "multipleChoice",
        response: 0,
        correct: true,
        score: 1,
        responseTimeMs: 0,
        hintCount: 1,
      },
      session: {
        id: "lesson-session:lesson-a:2026-07-27T00:00:00.000Z",
        startedAt: "2026-07-27T00:00:00.000Z",
        studyDate: "2026-07-27",
      },
    });
  });

  it("確認セクションは全問題の回答保存が終わるまで次へ進めない", async () => {
    const { store, recordAttempt } = progressStore(progress("inProgress", 1));
    render(
      <LessonRenderer
        lessonId="lesson-a"
        content={content()}
        progressStore={store}
        clock={clock}
      />,
    );
    await screen.findByText("hello の意味を選んでください。");
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "次へ" }));
    expect(
      screen.getByText(/すべて回答してから進んでください。未回答は1問です/),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "確認", level: 2 })).toBeInTheDocument();

    await user.click(screen.getByLabelText("こんにちは"));
    await user.click(screen.getByRole("button", { name: "答えを確認" }));
    await screen.findByText("確認できました");
    expect(recordAttempt).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "次へ" }));
    expect(
      await screen.findByRole("heading", { name: "まとめ", level: 2 }),
    ).toBeInTheDocument();
  });

  it("Attempt保存失敗を表示し、成功するまで回答済みにしない", async () => {
    const { store, recordAttempt } = progressStore(progress("inProgress", 1));
    recordAttempt.mockRejectedValueOnce(new Error("端末へ回答を保存できません"));
    render(
      <LessonRenderer
        lessonId="lesson-a"
        content={content()}
        progressStore={store}
        clock={clock}
      />,
    );
    await screen.findByText("hello の意味を選んでください。");
    const user = userEvent.setup();
    await user.click(screen.getByLabelText("こんにちは"));
    await user.click(screen.getByRole("button", { name: "答えを確認" }));

    expect(
      await screen.findByText(/回答を保存できませんでした.*端末へ回答を保存できません/),
    ).toBeInTheDocument();
    expect(screen.queryByText("確認できました")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "次へ" }));
    expect(
      screen.getByText(/すべて回答してから進んでください。未回答は1問です/),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "答えを確認" }));
    await screen.findByText("確認できました");
    await user.click(screen.getByRole("button", { name: "次へ" }));
    expect(
      await screen.findByRole("heading", { name: "まとめ", level: 2 }),
    ).toBeInTheDocument();
    expect(recordAttempt).toHaveBeenCalledTimes(2);
    expect(recordAttempt.mock.calls[1]?.[0].attempt.id).toBe(
      recordAttempt.mock.calls[0]?.[0].attempt.id,
    );
  });

  it("自己想起のnull採点も保存後は回答済みとして扱う", async () => {
    const recallExercise = selfRecallExercise();
    const { store, recordAttempt } = progressStore(progress("inProgress", 1));
    render(
      <LessonRenderer
        lessonId="lesson-a"
        content={contentWithExercise(recallExercise)}
        progressStore={store}
        clock={clock}
      />,
    );
    await screen.findByText("hello の意味を思い出してください。");
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "回答例を確認" }));
    await screen.findByText("回答例を確認しましょう");

    const savedAttempt = recordAttempt.mock.calls[0]?.[0].attempt;
    expect(savedAttempt?.exerciseId).toBe("exercise-recall");
    expect(savedAttempt?.correct).toBeNull();
    expect(savedAttempt?.response).toBe("");
    await user.click(screen.getByRole("button", { name: "次へ" }));
    expect(
      await screen.findByRole("heading", { name: "まとめ", level: 2 }),
    ).toBeInTheDocument();
  });

  it("学習済みスキップを保存して親処理へ通知する", async () => {
    const onSkip = vi.fn();
    const { store, commitTerminal } = progressStore();
    render(
      <LessonRenderer
        lessonId="lesson-a"
        content={content()}
        progressStore={store}
        clock={clock}
        onSkip={onSkip}
      />,
    );
    await screen.findByRole("heading", {
      name: "今日できるようになること",
    });

    await userEvent.setup().click(
      screen.getByRole("button", {
        name: "このレッスンを学習済みにする",
      }),
    );

    await waitFor(() => {
      expect(commitTerminal).toHaveBeenCalledWith({
        lesson: lesson(),
        progress: {
          lessonId: "lesson-a",
          status: "skipped",
          currentSectionIndex: 0,
          updatedAt: NOW.toISOString(),
        },
        session: {
          id: "lesson-session:lesson-a:2026-07-27T00:00:00.000Z",
          startedAt: "2026-07-27T00:00:00.000Z",
          studyDate: "2026-07-27",
        },
      });
      expect(onSkip).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByText(/学習済みとして記録しました/)).toBeInTheDocument();
  });

  it("中断位置を保存してから戻るcallbackを呼ぶ", async () => {
    const onExit = vi.fn();
    const { store, save } = progressStore(progress("inProgress", 1));
    render(
      <LessonRenderer
        lessonId="lesson-a"
        content={content()}
        progressStore={store}
        clock={clock}
        onExit={onExit}
      />,
    );
    await screen.findByRole("heading", { name: "確認", level: 2 });

    await userEvent.setup().click(screen.getByRole("button", { name: "中断して戻る" }));
    await waitFor(() => {
      expect(save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "inProgress",
          currentSectionIndex: 1,
        }),
      );
      expect(onExit).toHaveBeenCalledTimes(1);
    });
  });

  it("完了済みlessonをplan復習として再出題し、途中進捗を戻さず終端だけ確定する", async () => {
    const completed: LessonProgress = {
      ...progress("completed", 2),
      completedAt: "2026-07-26T00:00:00.000Z",
    };
    const { store, save, recordAttempt, saveReviewCheckpoint, commitTerminal } =
      progressStore(completed);
    const planContext = {
      planDate: "2026-07-26",
      blockId: "lesson-review-block",
      itemKey: "lesson:lesson-a",
    };
    render(
      <LessonRenderer
        lessonId="lesson-a"
        content={content()}
        progressStore={store}
        clock={clock}
        studyDayResolver={() => ({
          studyDate: "2026-07-26",
          studyDayStartMs: Date.parse("2026-07-26T19:00:00.000Z"),
        })}
        planContext={planContext}
      />,
    );

    await screen.findByRole("heading", {
      name: "今日できるようになること",
    });
    expect(
      screen.queryByRole("button", {
        name: "このレッスンを学習済みにする",
      }),
    ).not.toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "次へ" }));
    await screen.findByRole("heading", { name: "確認", level: 2 });
    expect(save).not.toHaveBeenCalled();
    expect(saveReviewCheckpoint).toHaveBeenCalledWith(
      expect.objectContaining({ currentSectionIndex: 1 }),
    );

    await user.click(screen.getByLabelText("こんにちは"));
    await user.click(screen.getByRole("button", { name: "答えを確認" }));
    await screen.findByText("確認できました");
    expect(recordAttempt.mock.calls[0]?.[0].attempt.studyDate).toBe("2026-07-26");
    await user.click(screen.getByRole("button", { name: "次へ" }));
    await screen.findByRole("heading", { name: "まとめ", level: 2 });
    expect(save).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "復習を完了" }));
    await waitFor(() =>
      expect(commitTerminal).toHaveBeenCalledWith({
        lesson: lesson(),
        progress: {
          lessonId: "lesson-a",
          status: "completed",
          currentSectionIndex: 2,
          updatedAt: NOW.toISOString(),
          completedAt: "2026-07-26T00:00:00.000Z",
        },
        session: {
          id: "lesson-session:lesson-a:2026-07-27T00:00:00.000Z",
          startedAt: "2026-07-27T00:00:00.000Z",
          studyDate: "2026-07-26",
        },
        planContext,
      }),
    );
  });

  it("plan復習の中断は元のcompleted進捗を保ちplan終端を確定しない", async () => {
    const onExit = vi.fn();
    const { store, save, saveReviewCheckpoint, commitTerminal } = progressStore({
      ...progress("completed", 2),
      completedAt: "2026-07-26T00:00:00.000Z",
    });
    render(
      <LessonRenderer
        lessonId="lesson-a"
        content={content()}
        progressStore={store}
        clock={clock}
        planContext={{
          planDate: "2026-07-27",
          blockId: "lesson-review-block",
          itemKey: "lesson:lesson-a",
        }}
        onExit={onExit}
      />,
    );

    await screen.findByRole("heading", {
      name: "今日できるようになること",
    });
    await userEvent.setup().click(screen.getByRole("button", { name: "中断して戻る" }));
    expect(save).not.toHaveBeenCalled();
    expect(commitTerminal).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(saveReviewCheckpoint).toHaveBeenCalledWith(
        expect.objectContaining({ currentSectionIndex: 0 }),
      );
      expect(onExit).toHaveBeenCalledTimes(1);
    });
  });

  it("plan復習のセクション位置と回答済み問題を再読込後に復元する", async () => {
    const planContext = {
      planDate: "2026-07-27",
      blockId: "lesson-review-block",
      itemKey: "lesson:lesson-a",
    };
    const { store, saveReviewCheckpoint } = progressStore({
      ...progress("completed", 2),
      completedAt: "2026-07-26T00:00:00.000Z",
      reviewCheckpoint: {
        planDate: planContext.planDate,
        blockId: planContext.blockId,
        currentSectionIndex: 1,
        answeredExerciseIds: ["exercise-a"],
        updatedAt: "2026-07-27T00:00:00.000Z",
      },
    });
    render(
      <LessonRenderer
        lessonId="lesson-a"
        content={content()}
        progressStore={store}
        clock={clock}
        planContext={planContext}
      />,
    );

    await screen.findByRole("heading", { name: "確認", level: 2 });
    await userEvent.setup().click(screen.getByRole("button", { name: "次へ" }));

    expect(
      await screen.findByRole("heading", { name: "まとめ", level: 2 }),
    ).toBeInTheDocument();
    expect(saveReviewCheckpoint).toHaveBeenCalledWith(
      expect.objectContaining({
        currentSectionIndex: 2,
        answeredExerciseIds: ["exercise-a"],
      }),
    );
  });

  it("最終セクションで完了時刻を保存して復習登録を委譲する", async () => {
    const onComplete = vi.fn();
    const onExit = vi.fn();
    const { store, commitTerminal } = progressStore(progress("inProgress", 2));
    render(
      <LessonRenderer
        lessonId="lesson-a"
        content={content()}
        progressStore={store}
        clock={clock}
        onComplete={onComplete}
        onExit={onExit}
      />,
    );
    await screen.findByRole("heading", { name: "まとめ", level: 2 });

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "レッスンを完了" }));
    await waitFor(() => {
      expect(commitTerminal).toHaveBeenCalledWith({
        lesson: lesson(),
        progress: {
          lessonId: "lesson-a",
          status: "completed",
          currentSectionIndex: 2,
          updatedAt: NOW.toISOString(),
          completedAt: NOW.toISOString(),
        },
        session: {
          id: "lesson-session:lesson-a:2026-07-27T00:00:00.000Z",
          startedAt: "2026-07-27T00:00:00.000Z",
          studyDate: "2026-07-27",
        },
      });
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByText(/レッスンを完了しました/)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "レッスンを完了" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: "このレッスンを学習済みにする",
      }),
    ).not.toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "コースへ戻る" }));
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it("保存失敗時は移動せず日本語エラーを表示する", async () => {
    const store: LessonLearningStore = {
      get: () => Promise.resolve(undefined),
      save: () => Promise.reject(new Error("端末へ保存できません")),
      recordAttempt: () => Promise.resolve(),
      saveReviewCheckpoint: (input) => Promise.resolve(input.progress),
      commitTerminal: () => Promise.resolve(),
    };
    render(
      <LessonRenderer
        lessonId="lesson-a"
        content={content()}
        progressStore={store}
        clock={clock}
      />,
    );
    await screen.findByRole("heading", {
      name: "今日できるようになること",
    });
    await userEvent.setup().click(screen.getByRole("button", { name: "次へ" }));

    expect(await screen.findByText("端末へ保存できません")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "今日できるようになること",
      }),
    ).toBeInTheDocument();
  });
});
