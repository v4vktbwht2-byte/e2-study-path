import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createMasteryProfile } from "../../domain/mastery";
import type {
  Attempt,
  CommitAnswerInput,
  StudySession,
  VocabularyUserState,
} from "../../domain/models";
import { createNewReviewState } from "../../domain/review";
import type { VocabularyItem } from "../../infrastructure/content/schemas";
import { DEFAULT_SETTINGS } from "../../infrastructure/db/repositories";
import { ReviewPage } from "../review";
import { VocabularyHubPage } from "./VocabularyHubPage";
import { VocabularyListPage } from "./VocabularyListPage";
import { VocabularySessionPage } from "./VocabularySessionPage";
import { WordDetailPage } from "./WordDetailPage";
import { vocabularyItemKey } from "./model";
import type {
  VocabularyContentPort,
  VocabularyStudySnapshot,
  VocabularyStudyStore,
} from "./types";

const NOW = new Date("2026-07-27T00:00:00.000Z");
const clock = { now: () => NOW };

afterEach(() => {
  vi.unstubAllGlobals();
});

function item(index: number): VocabularyItem {
  const headwords = ["hello", "book", "water", "school", "music"];
  const meanings = ["こんにちは", "本", "水", "学校", "音楽"];
  const headword = headwords[index] ?? `word${index}`;
  const meaning = meanings[index] ?? `意味${index}`;
  return {
    id: `word-${index}`,
    schemaVersion: "1.0.0",
    contentRevision: 1,
    stage: index % 2,
    headword,
    lemma: headword,
    partOfSpeech: index === 0 ? "phrase" : "noun",
    meanings: [{ id: "main", ja: meaning }],
    exampleSentences: [
      {
        id: "example",
        en: `I use ${headword} every day.`,
        ja: `${meaning}を使う例文です。`,
        stage: index % 2,
      },
    ],
    collocations: [`daily ${headword}`],
    synonyms: [],
    antonyms: [],
    confusionGroupIds: index < 2 ? ["group-a"] : [],
    tags: ["test"],
    source: { type: "original", author: "テスト" },
  };
}

const ITEMS = [0, 1, 2, 3, 4].map(item);

function content(items: readonly VocabularyItem[] = ITEMS): VocabularyContentPort {
  return {
    listVocabulary: () => Promise.resolve(items),
    getVocabulary: (id) =>
      Promise.resolve(items.find((candidate) => candidate.id === id)),
  };
}

function emptySnapshot(): VocabularyStudySnapshot {
  return {
    reviewStates: [],
    masteryProfiles: [],
    userStates: [],
    attempts: [],
    sessions: [],
    settings: { ...DEFAULT_SETTINGS, studyDayStartHour: 0 },
  };
}

function dueSnapshot(target = ITEMS[0]): VocabularyStudySnapshot {
  if (target === undefined) return emptySnapshot();
  const itemKey = vocabularyItemKey(target);
  return {
    ...emptySnapshot(),
    reviewStates: [
      {
        ...createNewReviewState(itemKey, NOW),
        status: "learning",
        dueAt: "2026-07-26T00:00:00.000Z",
      },
    ],
    masteryProfiles: [createMasteryProfile(itemKey, NOW)],
  };
}

function createStore(initial = emptySnapshot()) {
  let currentSession = initial.sessions.find(
    (session) => session.endedAt === undefined,
  );
  const loadSnapshot = vi.fn(() => Promise.resolve(initial));
  const saveWordState = vi.fn<VocabularyStudyStore["saveWordState"]>(() =>
    Promise.resolve(),
  );
  const startSession = vi.fn<VocabularyStudyStore["startSession"]>((session) => {
    currentSession = session;
    return Promise.resolve();
  });
  const commitAnswer = vi.fn<VocabularyStudyStore["commitAnswer"]>(
    (input: CommitAnswerInput) => {
      if (currentSession === undefined) {
        return Promise.reject(new Error("セッションがありません"));
      }
      currentSession = {
        ...currentSession,
        completedItemKeys: [
          ...new Set([...currentSession.completedItemKeys, input.attempt.itemKey]),
        ],
      };
      return Promise.resolve({
        attempt: input.attempt,
        reviewState: input.reviewState,
        mastery: input.mastery,
        session: currentSession,
      });
    },
  );
  const finishSession = vi.fn<VocabularyStudyStore["finishSession"]>(
    (sessionId, endedAt) => {
      if (currentSession === undefined || currentSession.id !== sessionId) {
        return Promise.reject(new Error("セッションがありません"));
      }
      currentSession = { ...currentSession, endedAt, interrupted: false };
      return Promise.resolve(currentSession);
    },
  );
  const store: VocabularyStudyStore = {
    loadSnapshot,
    saveWordState,
    startSession,
    commitAnswer,
    finishSession,
  };
  return {
    store,
    loadSnapshot,
    saveWordState,
    startSession,
    commitAnswer,
    finishSession,
    getCurrentSession: () => currentSession,
  };
}

function unfinishedSession(
  mode: "new" | "due" | "quickSort",
  itemKeys: readonly string[],
): StudySession {
  return {
    id: `vocabulary-session:${mode}:${NOW.toISOString()}`,
    type: mode === "due" ? "review" : "vocabulary",
    startedAt: NOW.toISOString(),
    studyDate: "2026-07-27",
    itemKeys: [...itemKeys],
    completedItemKeys: [],
    interrupted: false,
  };
}

function savedAttempt(
  session: StudySession,
  target: VocabularyItem,
  rating: "again" | "good" = "good",
): Attempt {
  const correct = rating !== "again";
  return {
    id: `${session.id}:attempt:1`,
    itemKey: vocabularyItemKey(target),
    exerciseId: `vocabulary-question:${target.id}:level-1`,
    sessionId: session.id,
    createdAt: NOW.toISOString(),
    studyDate: session.studyDate,
    mode: "recognitionChoice",
    response: 0,
    correct,
    score: correct ? 1 : 0,
    responseTimeMs: 2_000,
    hintCount: 0,
    confidence: "medium",
    suggestedRating: rating,
    finalRating: rating,
  };
}

describe("単語ページ", () => {
  it("HubでNew 5/10/15とLevel 1〜7を画面から指定する", async () => {
    const onStart = vi.fn();
    const first = ITEMS[0];
    expect(first).toBeDefined();
    const itemKey = vocabularyItemKey(first!);
    const snapshot: VocabularyStudySnapshot = {
      ...dueSnapshot(first),
      reviewStates: [
        {
          ...dueSnapshot(first).reviewStates[0]!,
          lapseCount: 3,
        },
      ],
      masteryProfiles: [createMasteryProfile(itemKey, NOW)],
    };
    const { store } = createStore(snapshot);
    render(
      <VocabularyHubPage
        content={content()}
        store={store}
        clock={clock}
        onStart={onStart}
      />,
    );

    await screen.findByRole("heading", { name: "今日の単語メニュー" });
    expect(screen.getByText("今日の復習").parentElement).toHaveTextContent("1語");
    expect(screen.getByRole("button", { name: "5語" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "10語" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "15語" })).toBeInTheDocument();

    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText("出題レベル"), "7");
    await user.click(screen.getByRole("button", { name: "5語" }));
    expect(onStart).toHaveBeenCalledWith("new", { limit: 5, level: 7 });
  });

  it("一覧を検索・状態・お気に入りで絞り込む", async () => {
    const first = ITEMS[0];
    expect(first).toBeDefined();
    const itemKey = vocabularyItemKey(first!);
    const favorite: VocabularyUserState = {
      itemKey,
      favorite: true,
      note: "朝のあいさつ",
      suspended: false,
      updatedAt: NOW.toISOString(),
    };
    const { store } = createStore({
      ...emptySnapshot(),
      userStates: [favorite],
    });
    render(<VocabularyListPage content={content()} store={store} />);
    await screen.findByRole("heading", { name: "単語一覧" });
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("単語・意味・メモを検索"), "朝のあいさつ");
    expect(screen.getByRole("heading", { name: "hello" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "book" })).not.toBeInTheDocument();

    await user.clear(screen.getByLabelText("単語・意味・メモを検索"));
    await user.click(screen.getByLabelText("お気に入りだけ"));
    expect(screen.getByRole("heading", { name: "hello" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "water" })).not.toBeInTheDocument();
  });

  it("単語詳細で5軸・履歴・混同語を表示しメモと停止状態を保存する", async () => {
    const first = ITEMS[0];
    expect(first).toBeDefined();
    const itemKey = vocabularyItemKey(first!);
    const snapshot: VocabularyStudySnapshot = {
      ...dueSnapshot(first),
      userStates: [
        {
          itemKey,
          favorite: false,
          note: "",
          suspended: false,
          updatedAt: NOW.toISOString(),
        },
      ],
      attempts: [
        {
          id: "attempt-1",
          itemKey,
          sessionId: "session-1",
          createdAt: NOW.toISOString(),
          studyDate: "2026-07-27",
          mode: "recognitionChoice",
          response: 0,
          correct: true,
          score: 1,
          responseTimeMs: 2000,
          hintCount: 0,
          finalRating: "good",
        },
      ],
    };
    const { store, saveWordState } = createStore(snapshot);
    render(
      <WordDetailPage
        wordId={first!.id}
        content={content()}
        store={store}
        clock={clock}
      />,
    );
    await screen.findByRole("heading", { name: "hello", level: 1 });
    expect(screen.getAllByRole("progressbar")).toHaveLength(5);
    expect(screen.getByText(/book/)).toBeInTheDocument();
    expect(screen.getByText(/評価 good/)).toBeInTheDocument();

    const user = userEvent.setup();
    await user.type(
      screen.getByLabelText("自分のメモ（プレーンテキスト）"),
      "覚え方メモ",
    );
    await user.click(screen.getByLabelText("お気に入りにする"));
    await user.click(screen.getByRole("button", { name: "メモを保存" }));
    await waitFor(() => expect(saveWordState).toHaveBeenCalledTimes(1));
    expect(saveWordState.mock.calls[0]?.[0].userState.favorite).toBe(true);
    expect(saveWordState.mock.calls[0]?.[0].userState.note).toBe("覚え方メモ");

    await user.click(screen.getByRole("button", { name: "復習を一時停止" }));
    await waitFor(() => expect(saveWordState).toHaveBeenCalledTimes(2));
    expect(saveWordState.mock.calls[1]?.[0].userState.suspended).toBe(true);
    expect(saveWordState.mock.calls[1]?.[0].reviewState?.status).toBe("suspended");
  });

  it("新規セッションは閲覧と想起を分け、4評価の変更後に原子的commitへ渡す", async () => {
    const { store, commitAnswer } = createStore();
    render(
      <VocabularySessionPage
        mode="new"
        content={content()}
        store={store}
        clock={clock}
        limit={5}
      />,
    );
    await screen.findByText("閲覧カード・まだ採点しません");
    expect(screen.getByRole("article")).toHaveTextContent("熟語・こんにちは");

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "答えを隠して想起問題へ" }));
    expect(screen.getByText(/想起問題 Level 1/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "hello", level: 2 })).toHaveAttribute(
      "lang",
      "en",
    );
    await user.selectOptions(screen.getByLabelText("今の自信度"), "high");
    await user.click(screen.getByLabelText("こんにちは"));
    await user.click(screen.getByRole("button", { name: "答えを確認" }));
    expect(screen.getByText("こんにちは", { selector: "strong" })).not.toHaveAttribute(
      "lang",
    );
    expect(screen.getByText(/推奨評価:/)).toHaveTextContent("Easy");
    await user.click(screen.getByRole("button", { name: /^Good(?:、推奨)?$/ }));

    await waitFor(() => expect(commitAnswer).toHaveBeenCalledTimes(1));
    const committed = commitAnswer.mock.calls[0]?.[0];
    expect(committed?.attempt.suggestedRating).toBe("easy");
    expect(committed?.attempt.finalRating).toBe("good");
    expect(committed?.attempt.confidence).toBe("high");
    expect(committed?.mastery.spelling).toBe(0);
    expect(await screen.findByText("閲覧カード・まだ採点しません")).toBeVisible();
  });

  it("明示itemだけを出題し、設定した学習日境界とplan完了情報を使う", async () => {
    const target = ITEMS[1]!;
    const snapshot = {
      ...emptySnapshot(),
      settings: {
        ...DEFAULT_SETTINGS,
        studyDayStartHour: 10,
      },
    };
    const { store, startSession, commitAnswer } = createStore(snapshot);
    render(
      <VocabularySessionPage
        mode="new"
        content={content()}
        store={store}
        clock={clock}
        limit={5}
        explicitItemKey={vocabularyItemKey(target)}
        planContext={{
          planDate: "2026-07-26",
          blockId: "new-word-block",
          itemKey: vocabularyItemKey(target),
        }}
        timeZone="Asia/Tokyo"
        onBack={() => {}}
      />,
    );

    await screen.findByRole("heading", { name: "book", level: 2 });
    expect(startSession).toHaveBeenCalledWith(
      expect.objectContaining({
        studyDate: "2026-07-26",
        itemKeys: [vocabularyItemKey(target)],
      }),
    );
    expect(screen.queryByRole("heading", { name: "hello", level: 2 })).toBeNull();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "答えを隠して想起問題へ" }));
    await user.click(screen.getByLabelText("本"));
    await user.click(screen.getByRole("button", { name: "答えを確認" }));
    await user.click(screen.getByRole("button", { name: /^Good(?:、推奨)?$/ }));
    await waitFor(() => expect(commitAnswer).toHaveBeenCalledTimes(1));
    expect(commitAnswer.mock.calls[0]?.[0].dailyPlanDate).toBeUndefined();

    await user.click(
      await screen.findByRole("button", {
        name: "思い出してから答えを表示",
      }),
    );
    await user.click(screen.getByRole("button", { name: "思い出せた" }));
    await user.click(screen.getByRole("button", { name: /^Good(?:、推奨)?$/ }));
    await screen.findByRole("heading", { name: "セッションを終えました" });
    expect(commitAnswer.mock.calls[1]?.[0]).toMatchObject({
      dailyPlanDate: "2026-07-26",
      completedPlanBlockId: "new-word-block",
    });
    expect(
      screen.getByRole("button", { name: "今日の学習へ戻る" }),
    ).toBeInTheDocument();
  });

  it("未終了の新規sessionを再利用し、回答済み地点から順序とLevel 2確認を復元する", async () => {
    const session = unfinishedSession(
      "new",
      ITEMS.map((target) => vocabularyItemKey(target)),
    );
    const first = ITEMS[0]!;
    const snapshot = {
      ...dueSnapshot(first),
      sessions: [session],
      attempts: [savedAttempt(session, first)],
    };
    const { store, startSession, commitAnswer } = createStore(snapshot);
    render(
      <VocabularySessionPage
        mode="new"
        content={content()}
        store={store}
        clock={clock}
        limit={5}
      />,
    );

    expect(
      await screen.findByRole("heading", { name: "book", level: 2 }),
    ).toBeVisible();
    expect(startSession).not.toHaveBeenCalled();
    const user = userEvent.setup();
    for (const target of ITEMS.slice(1)) {
      await screen.findByText("閲覧カード・まだ採点しません");
      await user.click(screen.getByRole("button", { name: "答えを隠して想起問題へ" }));
      await user.click(screen.getByLabelText(target.meanings[0]!.ja));
      await user.click(screen.getByRole("button", { name: "答えを確認" }));
      await user.click(screen.getByRole("button", { name: /^Good(?:、推奨)?$/ }));
    }

    expect(await screen.findByText(/想起問題 Level 2・再確認/)).toBeVisible();
    expect(screen.getByRole("heading", { name: "hello", level: 2 })).toBeVisible();
    expect(commitAnswer.mock.calls[0]?.[0].attempt.id).toBe(`${session.id}:attempt:2`);
  });

  it("Again確定後の未終了sessionを再利用し、再確認とattempt連番を復元する", async () => {
    const first = ITEMS[0]!;
    const session = unfinishedSession("due", [vocabularyItemKey(first)]);
    const snapshot = {
      ...dueSnapshot(first),
      sessions: [session],
      attempts: [savedAttempt(session, first, "again")],
    };
    const { store, startSession, commitAnswer } = createStore(snapshot);
    render(
      <VocabularySessionPage
        mode="due"
        content={content()}
        store={store}
        clock={clock}
        limit={1}
      />,
    );

    expect(await screen.findByText(/想起問題 Level 1・再確認/)).toBeVisible();
    expect(startSession).not.toHaveBeenCalled();
    const user = userEvent.setup();
    await user.click(screen.getByLabelText("こんにちは"));
    await user.click(screen.getByRole("button", { name: "答えを確認" }));
    await user.click(screen.getByRole("button", { name: /^Good(?:、推奨)?$/ }));
    await waitFor(() => expect(commitAnswer).toHaveBeenCalledTimes(1));
    expect(commitAnswer.mock.calls[0]?.[0].attempt.id).toBe(`${session.id}:attempt:2`);
  });

  it("新規5語のGood後は3問以上あけたLevel 2確認を行い翌日dueにする", async () => {
    const { store, commitAnswer, getCurrentSession } = createStore();
    render(
      <VocabularySessionPage
        mode="new"
        content={content()}
        store={store}
        clock={clock}
        limit={5}
      />,
    );
    const user = userEvent.setup();

    for (const record of ITEMS) {
      await screen.findByText("閲覧カード・まだ採点しません");
      expect(
        screen.getByRole("heading", { name: record.headword, level: 2 }),
      ).toBeVisible();
      await user.click(screen.getByRole("button", { name: "答えを隠して想起問題へ" }));
      await user.click(screen.getByLabelText(record.meanings[0]!.ja));
      await user.click(screen.getByRole("button", { name: "答えを確認" }));
      await user.click(screen.getByRole("button", { name: /^Good(?:、推奨)?$/ }));
    }

    expect(commitAnswer).toHaveBeenCalledTimes(5);
    for (const record of ITEMS) {
      await screen.findByText(/想起問題 Level 2・再確認/);
      expect(
        screen.getByRole("heading", { name: record.headword, level: 2 }),
      ).toBeVisible();
      await user.click(
        screen.getByRole("button", { name: "思い出してから答えを表示" }),
      );
      await user.click(screen.getByRole("button", { name: "思い出せた" }));
      await user.click(screen.getByRole("button", { name: /^Good(?:、推奨)?$/ }));
    }

    await screen.findByRole("heading", { name: "セッションを終えました" });
    expect(commitAnswer).toHaveBeenCalledTimes(10);
    expect(screen.getByText("学習語数").parentElement).toHaveTextContent("5語");
    expect(screen.getByText("回答数").parentElement).toHaveTextContent("10回");
    expect(screen.getByText("翌日以降").parentElement).toHaveTextContent("5語");
    expect(getCurrentSession()?.completedItemKeys).toHaveLength(5);
    expect(new Set(getCurrentSession()?.completedItemKeys).size).toBe(5);
    for (const call of commitAnswer.mock.calls.slice(5)) {
      expect(call[0].reviewState).toMatchObject({
        status: "learning",
        learningStep: 1,
        dueAt: "2026-07-28T00:00:00.000Z",
      });
    }
  });

  it("新規語をEasy評価した場合はLevel 2確認へ再挿入しない", async () => {
    const { store, commitAnswer } = createStore();
    render(
      <VocabularySessionPage
        mode="new"
        content={content()}
        store={store}
        clock={clock}
        limit={1}
      />,
    );
    await screen.findByText("閲覧カード・まだ採点しません");
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "答えを隠して想起問題へ" }));
    await user.click(screen.getByLabelText("こんにちは"));
    await user.click(screen.getByRole("button", { name: "答えを確認" }));
    await user.click(screen.getByRole("button", { name: /^Easy(?:、推奨)?$/ }));

    await screen.findByRole("heading", { name: "セッションを終えました" });
    expect(commitAnswer).toHaveBeenCalledTimes(1);
    expect(commitAnswer.mock.calls[0]?.[0].reviewState.status).toBe("review");
    expect(screen.getByText("回答数").parentElement).toHaveTextContent("1回");
  });

  it("Quick Sortは全件を未保存で分類しunknown→unsure→known順に実確認する", async () => {
    const { store, commitAnswer } = createStore();
    render(
      <VocabularySessionPage
        mode="quickSort"
        content={content(ITEMS.slice(0, 3))}
        store={store}
        clock={clock}
        limit={3}
      />,
    );
    await screen.findByRole("button", { name: "知っている" });
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "知っている" }));

    expect(commitAnswer).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "book", level: 2 })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "知らない" }));
    expect(commitAnswer).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "water", level: 2 })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "あやしい" }));
    expect(commitAnswer).not.toHaveBeenCalled();
    expect(screen.getByText(/想起問題 Level 1/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "book", level: 2 })).toBeVisible();
    expect(screen.getByText(/自己申告だけでは習得扱いにしません/)).toBeInTheDocument();

    await user.click(screen.getByLabelText("本"));
    await user.click(screen.getByRole("button", { name: "答えを確認" }));
    await user.click(screen.getByRole("button", { name: /^Good(?:、推奨)?$/ }));
    await waitFor(() => expect(commitAnswer).toHaveBeenCalledTimes(1));
    expect(screen.getByText(/想起問題 Level 2/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "water", level: 2 })).toBeVisible();
  });

  it("復習対象が1語でも全語から四択を作り、誤答時に混同語を比較する", async () => {
    const first = ITEMS[0];
    expect(first).toBeDefined();
    const { store, commitAnswer } = createStore(dueSnapshot(first));
    render(
      <VocabularySessionPage
        mode="due"
        content={content()}
        store={store}
        clock={clock}
        limit={1}
      />,
    );
    await screen.findByText(/想起問題 Level 1/);
    expect(screen.getAllByRole("radio")).toHaveLength(4);

    const user = userEvent.setup();
    await user.click(screen.getByLabelText("本"));
    await user.click(screen.getByRole("button", { name: "答えを確認" }));

    const comparison = screen.getByRole("region", { name: "混同語を比べる" });
    expect(within(comparison).getByText("book")).toBeInTheDocument();
    expect(within(comparison).getByText("本")).toBeInTheDocument();
    expect(within(comparison).getByText("I use book every day.")).toBeInTheDocument();
    expect(within(comparison).getByText("今回選んだ語")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^Again(?:、推奨)?$/ }));
    await waitFor(() => expect(commitAnswer).toHaveBeenCalledTimes(1));
    expect(commitAnswer.mock.calls[0]?.[0].attempt.confusedWithItemKey).toBe(
      vocabularyItemKey(ITEMS[1]!),
    );
  });

  it("日本語の問題文にはlangを付けず、英語の正答だけlang=enにする", async () => {
    const first = ITEMS[0];
    expect(first).toBeDefined();
    const { store } = createStore(dueSnapshot(first));
    render(
      <VocabularySessionPage
        mode="due"
        content={content()}
        store={store}
        clock={clock}
        limit={1}
        level={3}
      />,
    );
    await screen.findByText(/想起問題 Level 3/);
    expect(
      screen.getByRole("heading", { name: "こんにちは", level: 2 }),
    ).not.toHaveAttribute("lang");
    expect(screen.getByText("hello", { selector: "span" })).toHaveAttribute(
      "lang",
      "en",
    );

    const user = userEvent.setup();
    await user.click(screen.getByLabelText("hello"));
    await user.click(screen.getByRole("button", { name: "答えを確認" }));
    expect(screen.getByText("hello", { selector: "strong" })).toHaveAttribute(
      "lang",
      "en",
    );
  });

  it("Web Speech非対応のLevel 7は正答を見せずLevel 5へ切り替える", async () => {
    vi.stubGlobal("speechSynthesis", undefined);
    vi.stubGlobal("SpeechSynthesisUtterance", undefined);
    const first = ITEMS[0];
    expect(first).toBeDefined();
    const { store, commitAnswer } = createStore(dueSnapshot(first));
    render(
      <VocabularySessionPage
        mode="due"
        content={content()}
        store={store}
        clock={clock}
        limit={1}
        level={7}
      />,
    );

    await screen.findByText("音声を使えないためスペル練習へ切り替えました");
    expect(screen.getByText(/想起問題 Level 5/)).toBeInTheDocument();
    expect(screen.queryByText("hello")).not.toBeInTheDocument();
    expect(screen.getByLabelText("英語で回答")).toHaveAttribute("lang", "en");

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("英語で回答"), "hello");
    await user.click(screen.getByRole("button", { name: "答えを確認" }));
    await user.click(screen.getByRole("button", { name: /^Good(?:、推奨)?$/ }));
    await waitFor(() => expect(commitAnswer).toHaveBeenCalledTimes(1));
    expect(commitAnswer.mock.calls[0]?.[0].mastery.listening).toBe(0);
    expect(commitAnswer.mock.calls[0]?.[0].mastery.spelling).toBeGreaterThan(0);
  });

  it("期限復習を完了するとセッションsummaryを表示する", async () => {
    const first = ITEMS[0];
    expect(first).toBeDefined();
    const { store, finishSession } = createStore(dueSnapshot(first));
    render(
      <ReviewPage content={content([first!])} store={store} clock={clock} limit={1} />,
    );
    await screen.findByText(/想起問題 Level 1/);
    const user = userEvent.setup();
    await user.click(screen.getByLabelText("こんにちは"));
    await user.click(screen.getByRole("button", { name: "答えを確認" }));
    await user.click(screen.getByRole("button", { name: /^Good(?:、推奨)?$/ }));

    expect(
      await screen.findByRole("heading", { name: "セッションを終えました" }),
    ).toBeInTheDocument();
    expect(screen.getByText("学習語数").parentElement).toHaveTextContent("1語");
    expect(finishSession).toHaveBeenCalledTimes(1);
  });

  it("回答commit後の終了失敗は回答を重複保存せず終了処理だけ再試行する", async () => {
    const first = ITEMS[0];
    expect(first).toBeDefined();
    const { store, commitAnswer, finishSession } = createStore(dueSnapshot(first));
    finishSession.mockRejectedValueOnce(new Error("終了状態を保存できません"));
    render(
      <VocabularySessionPage
        mode="due"
        content={content()}
        store={store}
        clock={clock}
        limit={1}
      />,
    );
    await screen.findByText(/想起問題 Level 1/);
    const user = userEvent.setup();
    await user.click(screen.getByLabelText("こんにちは"));
    await user.click(screen.getByRole("button", { name: "答えを確認" }));
    await user.click(screen.getByRole("button", { name: /^Good(?:、推奨)?$/ }));

    expect(
      await screen.findByText("終了処理を完了できませんでした"),
    ).toBeInTheDocument();
    expect(commitAnswer).toHaveBeenCalledTimes(1);
    expect(finishSession).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "終了処理だけ再試行" }));
    await screen.findByRole("heading", { name: "セッションを終えました" });
    expect(commitAnswer).toHaveBeenCalledTimes(1);
    expect(finishSession).toHaveBeenCalledTimes(2);
  });

  it("回答保存失敗時は同じ評価画面で再試行できる", async () => {
    const { store, commitAnswer } = createStore(dueSnapshot());
    commitAnswer.mockRejectedValueOnce(new Error("端末へ保存できません"));
    render(
      <VocabularySessionPage
        mode="due"
        content={content([ITEMS[0]!])}
        store={store}
        clock={clock}
        limit={1}
      />,
    );
    await screen.findByText(/想起問題 Level 1/);
    const user = userEvent.setup();
    await user.click(screen.getByLabelText("こんにちは"));
    await user.click(screen.getByRole("button", { name: "答えを確認" }));
    await user.click(screen.getByRole("button", { name: /^Good(?:、推奨)?$/ }));
    expect(await screen.findByText("端末へ保存できません")).toBeInTheDocument();
    expect(screen.getByLabelText("最終評価を選択")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^Good(?:、推奨)?$/ }));
    await screen.findByRole("heading", { name: "セッションを終えました" });
    expect(commitAnswer).toHaveBeenCalledTimes(2);
    expect(commitAnswer.mock.calls[1]?.[0].attempt.id).toBe(
      commitAnswer.mock.calls[0]?.[0].attempt.id,
    );
  });
});
