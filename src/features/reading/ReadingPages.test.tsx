import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { pilotReadingPracticeSets } from "../../content/pilot/practiceReading";
import { ReadingHubPage } from "./ReadingHubPage";
import { ReadingPracticePage } from "./ReadingPracticePage";
import { parseReadingPracticeSet } from "./schema";
import type {
  CompleteReadingInput,
  ReadingClock,
  ReadingContentPort,
  ReadingLearningStore,
} from "./types";

const readingSet = parseReadingPracticeSet(pilotReadingPracticeSets[0]);

function content(set = readingSet): ReadingContentPort {
  return {
    listReadingSets: vi.fn(() => Promise.resolve([set])),
    getReadingSet: vi.fn((id) => Promise.resolve(id === set.id ? set : undefined)),
  };
}

function learningStore() {
  const completePractice = vi.fn((input: CompleteReadingInput) =>
    Promise.resolve({
      attempts: [...input.attempts],
      session: {
        ...input.session,
        endedAt: input.completedAt,
        completedItemKeys: [`practice:${input.setId}`],
        interrupted: false,
      },
    }),
  );
  const addVocabularyFavorite = vi.fn(() => Promise.resolve());
  const store: ReadingLearningStore = {
    completePractice,
    addVocabularyFavorite,
    getVocabularyUserState: vi.fn(() => Promise.resolve(undefined)),
    loadHistory: vi.fn(() => Promise.resolve({ sessions: [], attempts: [] })),
  };
  return { store, completePractice, addVocabularyFavorite };
}

function mutableClock(initial: string) {
  let nowMs = new Date(initial).getTime();
  const clock: ReadingClock = {
    now: () => new Date(nowMs),
  };
  return {
    clock,
    advance(milliseconds: number) {
      nowMs += milliseconds;
    },
  };
}

async function answerQuestion(input: {
  choiceName: RegExp;
  evidenceName: RegExp;
  user: ReturnType<typeof userEvent.setup>;
}) {
  await input.user.click(screen.getByLabelText(input.choiceName));
  await input.user.click(screen.getByRole("button", { name: "回答を確定" }));
  expect(screen.queryByText("正解です")).not.toBeInTheDocument();
  await input.user.click(screen.getByLabelText(input.evidenceName));
  await input.user.click(screen.getByRole("button", { name: "根拠を確認" }));
}

describe("読解画面", () => {
  it("hubでloading後にセットを表示し、キーボードで選択できる", async () => {
    const onSelectSet = vi.fn();
    render(<ReadingHubPage content={content()} onSelectSet={onSelectSet} />);

    expect(screen.getByRole("status")).toHaveTextContent("読解教材を読み込んでいます");
    const button = await screen.findByRole("button", {
      name: `${readingSet.titleJa}を始める`,
    });
    button.focus();
    await userEvent.setup().keyboard("{Enter}");

    expect(onSelectSet).toHaveBeenCalledWith(readingSet);
  });

  it("hubの空・error・再試行状態を説明する", async () => {
    const failingContent: ReadingContentPort = {
      listReadingSets: vi
        .fn<ReadingContentPort["listReadingSets"]>()
        .mockRejectedValueOnce(new Error("端末の教材を読めません"))
        .mockResolvedValueOnce([]),
      getReadingSet: vi.fn(() => Promise.resolve(undefined)),
    };
    render(<ReadingHubPage content={failingContent} onSelectSet={vi.fn()} />);

    expect(
      await screen.findByRole("heading", {
        name: "読解教材を開けませんでした",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("端末の教材を読めません")).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "もう一度試す" }));
    expect(
      await screen.findByRole("heading", { name: "読解教材はまだありません" }),
    ).toBeInTheDocument();
  });

  it("練習ページを置き換える未検出・エラー状態を主見出しとして伝える", async () => {
    const { store } = learningStore();
    const missing = render(
      <ReadingPracticePage
        setId="missing"
        content={{
          listReadingSets: vi.fn(() => Promise.resolve([])),
          getReadingSet: vi.fn(() => Promise.resolve(undefined)),
        }}
        store={store}
      />,
    );
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "読解教材を準備しています",
      }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "指定された読解教材が見つかりません",
      }),
    ).toBeInTheDocument();
    missing.unmount();

    render(
      <ReadingPracticePage
        setId="broken"
        content={{
          listReadingSets: vi.fn(() => Promise.resolve([])),
          getReadingSet: vi.fn(() => Promise.reject(new Error("教材を読めません"))),
        }}
        store={store}
      />,
    );
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "読解教材を開けませんでした",
      }),
    ).toBeInTheDocument();
  });

  it("本文・根拠選択・解説・お気に入り・結果保存を一続きで完了する", async () => {
    const { store, completePractice, addVocabularyFavorite } = learningStore();
    const time = mutableClock("2026-07-27T00:00:00.000Z");
    const onComplete = vi.fn();
    render(
      <ReadingPracticePage
        setId={readingSet.id}
        content={content()}
        store={store}
        clock={time.clock}
        studyDayResolver={() => ({
          studyDate: "2026-07-27",
          studyDayStartMs: new Date("2026-07-27T00:00:00.000Z").getTime(),
        })}
        onComplete={onComplete}
      />,
    );
    const user = userEvent.setup();

    expect(
      await screen.findByRole("heading", { name: readingSet.titleJa, level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("段落1")).toBeInTheDocument();
    expect(screen.getByText("100%")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "本文の文字を大きくする" }));
    expect(screen.getByText("115%")).toBeInTheDocument();

    time.advance(5_000);
    await user.click(screen.getByRole("button", { name: "設問へ進む" }));
    expect(
      await screen.findByRole("heading", {
        name: readingSet.payload.questions[0]!.promptJa,
      }),
    ).toBeInTheDocument();

    time.advance(4_000);
    await answerQuestion({
      user,
      choiceName: /働いたあとに来られない人が多かったから/,
      evidenceName: /It closed at five/,
    });
    expect(screen.getByText("正解です")).toBeInTheDocument();
    expect(screen.getByText("正答と根拠")).toBeInTheDocument();
    expect(screen.getByText("段落の要点")).toBeInTheDocument();
    expect(screen.getByText("重要語句")).toBeInTheDocument();
    expect(screen.getByText(/5時に閉まるため/)).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: "bookをお気に入りに追加",
      }),
    );
    await waitFor(() =>
      expect(addVocabularyFavorite).toHaveBeenCalledWith(
        "vocab-s0-book",
        expect.any(String),
      ),
    );
    expect(
      screen.getByRole("button", {
        name: "bookはお気に入りに追加済み",
      }),
    ).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "次の設問へ" }));
    time.advance(3_000);
    await answerQuestion({
      user,
      choiceName: /学生は地域の人との交流を楽しんだ/,
      evidenceName: /The students also said/,
    });
    await user.click(screen.getByRole("button", { name: "結果を見る" }));

    expect(
      await screen.findByRole("heading", {
        name: "読解セットを完了しました",
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("2 / 2問")).toHaveLength(2);
    expect(screen.getByText("00:05")).toBeInTheDocument();
    expect(completePractice).toHaveBeenCalledTimes(1);
    const input = completePractice.mock.calls[0]?.[0];
    expect(input?.attempts).toHaveLength(2);
    expect(input?.attempts[0]).toMatchObject({
      mode: "readingQuestion",
      responseTimeMs: 4000,
      correct: true,
      response: {
        evidenceCorrect: true,
      },
    });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("完了保存失敗時は同じAttempt IDで再試行できる", async () => {
    const { store, completePractice } = learningStore();
    completePractice.mockRejectedValueOnce(new Error("端末へ保存できません"));
    const oneQuestionSet = parseReadingPracticeSet({
      ...readingSet,
      id: "practice-reading-one-question",
      payload: {
        ...readingSet.payload,
        questions: [readingSet.payload.questions[0]],
      },
    });
    const time = mutableClock("2026-07-27T00:00:00.000Z");
    render(
      <ReadingPracticePage
        setId={oneQuestionSet.id}
        content={content(oneQuestionSet)}
        store={store}
        clock={time.clock}
      />,
    );
    const user = userEvent.setup();

    await screen.findByRole("heading", { name: oneQuestionSet.titleJa, level: 1 });
    await user.click(screen.getByRole("button", { name: "設問へ進む" }));
    await answerQuestion({
      user,
      choiceName: /働いたあとに来られない人が多かったから/,
      evidenceName: /It closed at five/,
    });
    await user.click(screen.getByRole("button", { name: "結果を見る" }));
    expect(await screen.findByText("端末へ保存できません")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "結果を見る" }));
    await screen.findByRole("heading", {
      name: "読解セットを完了しました",
    });

    expect(completePractice).toHaveBeenCalledTimes(2);
    expect(completePractice.mock.calls[1]?.[0].attempts[0]?.id).toBe(
      completePractice.mock.calls[0]?.[0].attempts[0]?.id,
    );
  });
});
