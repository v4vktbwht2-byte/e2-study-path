import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { pilotListeningPracticeSets } from "../../content/pilot/practiceListening";
import type { AudioPlaybackRequest, AudioService } from "../../infrastructure/audio";
import { ListeningPage } from "./ListeningPage";
import { createStaticListeningContentPort } from "./staticListeningContentPort";
import type { ListeningCompletionCommitInput, ListeningStudyStore } from "./types";

const NOW = new Date("2026-07-27T03:00:00.000Z");
const firstSet = pilotListeningPracticeSets[0]!;

function createStore() {
  const commitCompletion = vi.fn((input: ListeningCompletionCommitInput) =>
    Promise.resolve({
      attempt: input.attempt,
      session: input.session,
    }),
  );
  return {
    store: {
      loadHistory: vi.fn(() => Promise.resolve({ attempts: [], sessions: [] })),
      commitCompletion,
    } satisfies ListeningStudyStore,
    commitCompletion,
  };
}

function createAudio(available = true) {
  const play = vi.fn((request: AudioPlaybackRequest) => {
    void request;
    return Promise.resolve();
  });
  const stop = vi.fn();
  return {
    audio: {
      availability: () => ({
        available,
        strategy: available ? ("webSpeech" as const) : ("unsupported" as const),
        messageJa: available
          ? "Web Speechを利用できます。"
          : "このブラウザーでは音声を使えません。",
      }),
      play,
      stop,
    } satisfies AudioService,
    play,
    stop,
  };
}

function baseProps() {
  const { store, commitCompletion } = createStore();
  const { audio, play } = createAudio();
  return {
    props: {
      content: createStaticListeningContentPort(pilotListeningPracticeSets),
      store,
      audio,
      clock: { now: () => NOW },
      studyDayResolver: () => ({
        studyDate: "2026-07-27",
        studyDayStartMs: NOW.getTime(),
      }),
      idFactory: (prefix: "attempt" | "session") => `test-${prefix}`,
    },
    commitCompletion,
    play,
  };
}

describe("リスニング画面", () => {
  it("loading・empty・errorを説明し、再試行できる", async () => {
    let resolveSets: ((sets: readonly unknown[]) => void) | undefined;
    const loadingContent = {
      listListeningSets: () =>
        new Promise<readonly unknown[]>((resolve) => {
          resolveSets = resolve;
        }),
    };
    const { store } = createStore();
    const { audio } = createAudio();
    const { rerender } = render(
      <ListeningPage content={loadingContent} store={store} audio={audio} />,
    );
    expect(
      screen.getByRole("heading", {
        name: "リスニング教材を準備しています",
      }),
    ).toBeInTheDocument();

    resolveSets?.([]);
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "利用できるリスニング教材はまだありません",
      }),
    ).toBeInTheDocument();

    const failingContent = {
      listListeningSets: () => Promise.reject(new Error("教材DBを読めません")),
    };
    rerender(<ListeningPage content={failingContent} store={store} audio={audio} />);
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "リスニング教材を開けませんでした",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("教材DBを読めません")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "もう一度試す" })).toBeInTheDocument();
  });

  it("6教材を表示し、キーボードで教材とモードを選べる", async () => {
    const { props } = baseProps();
    const user = userEvent.setup();
    render(<ListeningPage {...props} />);

    expect(
      await screen.findByRole("heading", { name: "リスニング練習" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /を開く$/u })).toHaveLength(6);
    expect(screen.getByText(/公式問題・公式音声ではありません/u)).toBeInTheDocument();

    await user.tab();
    expect(
      screen.getByRole("button", { name: /図書館の閉館時間.*を開く/u }),
    ).toHaveFocus();
    await user.keyboard("{Enter}");
    const examButton = await screen.findByRole("button", {
      name: "本番風で始める",
    });
    examButton.focus();
    await user.keyboard("{Enter}");
    expect(
      await screen.findByRole("heading", { name: "再生前の確認" }),
    ).toBeInTheDocument();
  });

  it("本番風は事前確認・1回再生・1.0倍固定・script非表示で完了する", async () => {
    const { props, play, commitCompletion } = baseProps();
    const user = userEvent.setup();
    render(<ListeningPage {...props} initialSetId={firstSet.id} />);

    await user.click(await screen.findByRole("button", { name: "本番風で始める" }));
    const firstSentence = (
      firstSet.payload.script as {
        sentences: readonly { text: string }[];
      }
    ).sentences[0]!.text;
    expect(screen.queryByText(firstSentence)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "0.75倍" })).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "準備できました（1回だけ再生）" }),
    );
    await waitFor(() => expect(play).toHaveBeenCalledOnce());
    expect(play.mock.calls[0]?.[0].rate).toBe(1);
    expect(screen.getByRole("button", { name: "音声は再生済みです" })).toBeDisabled();
    expect(screen.queryByText(firstSentence)).not.toBeInTheDocument();

    await user.click(
      screen.getByLabelText(
        (
          firstSet.payload.question as {
            choices: readonly { id: string; text: string }[];
            correctChoiceId: string;
          }
        ).choices.find(
          (choice) =>
            choice.id ===
            (
              firstSet.payload.question as {
                correctChoiceId: string;
              }
            ).correctChoiceId,
        )!.text,
      ),
    );
    await user.click(screen.getByRole("button", { name: "回答を確定" }));

    expect(
      await screen.findByRole("heading", {
        name: "リスニング練習を記録しました",
      }),
    ).toBeInTheDocument();
    expect(commitCompletion).toHaveBeenCalledOnce();
    const committed = commitCompletion.mock.calls[0]?.[0];
    expect(committed?.attempt.correct).toBe(true);
    expect(committed?.attempt.mode).toBe("listening:exam");
    expect(committed?.session.type).toBe("practice");
    expect(committed?.session.completedItemKeys).toEqual([`practice:${firstSet.id}`]);
  });

  it("復習では速度変更・繰返し・一文再生・script・dictationを使える", async () => {
    const { props, play, commitCompletion } = baseProps();
    const user = userEvent.setup();
    render(<ListeningPage {...props} initialSetId={firstSet.id} />);

    await user.click(await screen.findByRole("button", { name: "復習で始める" }));
    const payload = firstSet.payload as {
      script: { sentences: readonly { id: string; text: string }[] };
      question: {
        choices: readonly { id: string; text: string }[];
        correctChoiceId: string;
      };
      dictationSentenceId: string;
    };
    expect(screen.getByText(payload.script.sentences[0]!.text)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "0.75倍" }));
    await user.click(screen.getByRole("button", { name: "全体を繰り返し再生" }));
    expect(play.mock.calls.at(-1)?.[0].rate).toBe(0.75);
    await user.click(screen.getByRole("button", { name: "文1を再生" }));
    expect(play.mock.calls.at(-1)?.[0].text).toBe(payload.script.sentences[0]!.text);

    const dictationTarget = payload.script.sentences.find(
      (sentence) => sentence.id === payload.dictationSentenceId,
    )!.text;
    await user.type(screen.getByLabelText("聞こえた英文"), dictationTarget);
    await user.click(screen.getByRole("button", { name: "ディクテーションを確認" }));
    expect(screen.getByText("語順とつづりを確認できました。")).toBeInTheDocument();

    const answer = payload.question.choices.find(
      (choice) => choice.id === payload.question.correctChoiceId,
    )!;
    await user.click(screen.getByLabelText(answer.text));
    await user.click(screen.getByRole("button", { name: "回答を確定" }));
    await waitFor(() => expect(commitCompletion).toHaveBeenCalledOnce());
    expect(commitCompletion.mock.calls[0]?.[0].attempt.mode).toBe("listening:review");
  });

  it("音声非対応でもscript自己練習を自動採点せず完了できる", async () => {
    const { store, commitCompletion } = createStore();
    const { audio, play } = createAudio(false);
    const user = userEvent.setup();
    render(
      <ListeningPage
        content={createStaticListeningContentPort(pilotListeningPracticeSets)}
        store={store}
        audio={audio}
        initialSetId={firstSet.id}
        clock={{ now: () => NOW }}
        studyDayResolver={() => ({
          studyDate: "2026-07-27",
          studyDayStartMs: NOW.getTime(),
        })}
      />,
    );

    await user.click(await screen.findByRole("button", { name: "本番風で始める" }));
    expect(screen.getByRole("heading", { name: "スクリプト" })).toBeInTheDocument();
    expect(screen.getByText(/音声を使わずに続けられます/u)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "スクリプト自己練習を完了" }));

    await waitFor(() => expect(commitCompletion).toHaveBeenCalledOnce());
    expect(play).not.toHaveBeenCalled();
    expect(commitCompletion.mock.calls[0]?.[0].attempt.correct).toBeNull();
    expect(
      await screen.findByText("音声を使わない自己練習として完了しました。"),
    ).toBeInTheDocument();
  });
});
