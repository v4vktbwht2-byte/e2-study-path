import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { AppSettings, Attempt, UserProfile } from "../../domain/models";
import {
  buildDailyPlan,
  completeDailyPlanBlock,
  type DailyPlan,
} from "../../domain/planning";
import { createNewReviewState, type ReviewState } from "../../domain/review";
import type { VocabularyItem } from "../../infrastructure/content/schemas";
import {
  countPendingUpdateWrites,
  flushPendingUpdateWrites,
} from "../../infrastructure/pwa";
import { TodayPage } from "./TodayPage";
import type { TodayDataPort, TodayDataSnapshot, TodayPageProps } from "./types";

const NOW = new Date("2026-07-27T03:00:00.000Z");
const clock = {
  now: () => NOW,
  timeZone: () => "Asia/Tokyo",
};

function profile(): UserProfile {
  return {
    id: "local-user",
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
    goals: ["grade2"],
    dailyMinutes: 15,
    recommendedStage: 1,
    selectedStage: 1,
    onboardingCompleted: true,
  };
}

function settings(): AppSettings {
  return {
    id: "settings",
    theme: "system",
    fontScale: 1,
    reducedMotion: false,
    dailyNewVocabularyLimit: 5,
    reviewIntensity: "standard",
    speechRate: 1,
    autoPlayAudio: false,
    showKanaPronunciationGuide: false,
    speedAdjustmentEnabled: true,
    studyDayStartHour: 4,
  };
}

function vocabulary(index: number): VocabularyItem {
  return {
    id: `word-${index}`,
    schemaVersion: "1.0.0",
    contentRevision: 1,
    stage: 1,
    headword: `word${index}`,
    lemma: `word${index}`,
    partOfSpeech: "noun",
    meanings: [{ id: "main", ja: `意味${index}` }],
    exampleSentences: [
      {
        id: "example",
        en: `Word ${index} is useful.`,
        ja: `単語${index}の例文です。`,
        stage: 1,
      },
    ],
    collocations: [],
    synonyms: [],
    antonyms: [],
    confusionGroupIds: [],
    tags: ["test"],
    source: { type: "original", author: "テスト" },
  };
}

function review(itemKey: string, dueAt: string): ReviewState {
  return {
    ...createNewReviewState(itemKey, NOW),
    status: "review",
    dueAt,
    intervalDays: 2,
    reviewCount: 2,
  };
}

function snapshot(overrides: Partial<TodayDataSnapshot> = {}): TodayDataSnapshot {
  return {
    profile: profile(),
    settings: settings(),
    reviewStates: [],
    masteryProfiles: [],
    attempts: [],
    vocabularyUserStates: [],
    vocabulary: [],
    exercises: [],
    lessons: [],
    lessonProgress: [],
    practiceSets: [],
    dailyPlans: [],
    ...overrides,
  };
}

function createPort(value: TodayDataSnapshot) {
  const savePlan = vi.fn<TodayDataPort["savePlan"]>((plan) => Promise.resolve(plan));
  return {
    port: {
      loadSnapshot: vi.fn(() => Promise.resolve(value)),
      savePlan,
    } satisfies TodayDataPort,
    savePlan,
  };
}

describe("今日画面", () => {
  it("初回プラン保存を更新前の待機対象として追跡する", async () => {
    let resolveSnapshot: ((value: TodayDataSnapshot) => void) | undefined;
    const savePlan = vi.fn<TodayDataPort["savePlan"]>((plan) => Promise.resolve(plan));
    const port: TodayDataPort = {
      loadSnapshot: vi.fn(
        () =>
          new Promise<TodayDataSnapshot>((resolve) => {
            resolveSnapshot = resolve;
          }),
      ),
      savePlan,
    };

    render(<TodayPage port={port} clock={clock} />);
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "今日の学習を準備しています",
      }),
    ).toBeInTheDocument();
    await waitFor(() => expect(countPendingUpdateWrites()).toBe(1));

    resolveSnapshot?.(snapshot());
    await screen.findByRole("heading", { name: "今日の学習" });
    await expect(flushPendingUpdateWrites()).resolves.toBeUndefined();
    expect(savePlan).toHaveBeenCalledTimes(1);
  });

  it("84件の滞留で4コースを表示し、軽め15件を保存して対象blockへ進む", async () => {
    const items = Array.from({ length: 85 }, (_, index) => vocabulary(index));
    const value = snapshot({
      vocabulary: items,
      reviewStates: items
        .slice(0, 84)
        .map((item) => review(`vocab:${item.id}`, "2026-07-20T00:00:00.000Z")),
    });
    const { port, savePlan } = createPort(value);
    const onOpenVocabulary = vi.fn<NonNullable<TodayPageProps["onOpenVocabulary"]>>();
    render(<TodayPage port={port} clock={clock} onOpenVocabulary={onOpenVocabulary} />);

    await screen.findByRole("heading", { name: "今日の学習" });
    expect(screen.getByText("復習がたまっています")).toBeInTheDocument();
    expect(screen.getByText(/復習待ちが84件/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "軽めで再計算" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "標準で再計算" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "しっかりで再計算" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "すべてで再計算" })).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "軽めで再計算" }));
    await waitFor(() => expect(savePlan).toHaveBeenCalledTimes(2));
    const saved = savePlan.mock.calls.at(-1)?.[0];
    expect(saved?.mode).toBe("light");
    expect(saved?.blocks.filter((block) => block.status === "pending")).toHaveLength(
      15,
    );
    expect(saved?.sourceSnapshot.newLimit).toBe(0);

    await user.click(screen.getByRole("button", { name: "今日の学習を始める" }));
    expect(onOpenVocabulary).toHaveBeenCalledTimes(1);
    const navigation = onOpenVocabulary.mock.calls[0]?.[2];
    expect(navigation?.planDate).toBe("2026-07-27");
    expect(navigation?.blockId).toMatch(/^vocab:/u);
    expect(navigation?.itemKey).toMatch(/^vocab:/u);
  });

  it("5/15/30/45分とカスタム時間を選び、完了済みを保って再計算する", async () => {
    const item = vocabulary(0);
    const initial = buildDailyPlan({
      studyDate: "2026-07-27",
      nowMs: NOW.getTime(),
      studyDayStartMs: new Date("2026-07-26T19:00:00.000Z").getTime(),
      targetMinutes: 15,
      mode: "standard",
      configuredNewItemLimit: 5,
      currentStage: 1,
      candidates: [
        {
          id: `vocab:${item.id}`,
          kind: "review",
          dueAtMs: new Date("2026-07-20T00:00:00.000Z").getTime(),
          estimatedSeconds: 20,
        },
      ],
    });
    const complete = completeDailyPlanBlock(initial, initial.blocks[0]!.blockId);
    const { port, savePlan } = createPort(
      snapshot({
        vocabulary: [item, vocabulary(1)],
        reviewStates: [review(`vocab:${item.id}`, "2026-07-20T00:00:00.000Z")],
        dailyPlans: [
          {
            ...complete,
            blocks: [
              ...complete.blocks,
              {
                blockId: "vocab:word-1",
                itemId: "vocab:word-1",
                category: "newVocabulary",
                estimatedSeconds: 40,
                status: "pending",
                skill: "vocabulary",
              },
            ],
            plannedSeconds: 60,
          },
        ],
      }),
    );
    render(<TodayPage port={port} clock={clock} />);
    await screen.findByRole("heading", { name: "今日の学習" });

    for (const minutes of [5, 15, 30, 45]) {
      expect(screen.getByRole("button", { name: `${minutes}分` })).toBeInTheDocument();
    }
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "カスタム" }));
    const custom = screen.getByRole("spinbutton", {
      name: "カスタム時間（1〜180分）",
    });
    await user.clear(custom);
    await user.type(custom, "22");
    await user.click(screen.getByRole("button", { name: "プランを再計算" }));
    await waitFor(() => expect(savePlan).toHaveBeenCalledTimes(1));

    const saved = savePlan.mock.calls[0]?.[0];
    expect(saved?.targetMinutes).toBe(22);
    expect(saved?.completedBlockIds).toContain(`vocab:${item.id}`);
  });

  it("全block完了時に目安時間・復習・新規・曖昧項目・次回予定を表示する", async () => {
    const item = vocabulary(0);
    const nextItem = vocabulary(1);
    let completePlan: DailyPlan = buildDailyPlan({
      studyDate: "2026-07-27",
      nowMs: NOW.getTime(),
      studyDayStartMs: new Date("2026-07-26T19:00:00.000Z").getTime(),
      targetMinutes: 15,
      mode: "all",
      configuredNewItemLimit: 5,
      currentStage: 1,
      candidates: [
        {
          id: `vocab:${item.id}`,
          kind: "review",
          dueAtMs: new Date("2026-07-20T00:00:00.000Z").getTime(),
          estimatedSeconds: 20,
        },
        {
          id: `vocab:${nextItem.id}`,
          kind: "newVocabulary",
          estimatedSeconds: 40,
        },
      ],
    });
    for (const block of completePlan.blocks) {
      completePlan = completeDailyPlanBlock(completePlan, block.blockId);
    }
    const uncertainAttempt: Attempt = {
      id: "attempt-uncertain",
      itemKey: `vocab:${item.id}`,
      sessionId: "session-1",
      createdAt: NOW.toISOString(),
      studyDate: "2026-07-27",
      mode: "recognitionChoice",
      response: 0,
      correct: true,
      score: 1,
      responseTimeMs: 2_000,
      hintCount: 0,
      confidence: "low",
      finalRating: "hard",
    };
    const { port } = createPort(
      snapshot({
        vocabulary: [item, nextItem],
        attempts: [uncertainAttempt],
        reviewStates: [review(`vocab:${item.id}`, "2026-07-28T03:00:00.000Z")],
        dailyPlans: [completePlan],
      }),
    );
    render(<TodayPage port={port} clock={clock} />);

    const heading = await screen.findByRole("heading", {
      name: "今日のプランを終えました",
    });
    const card = heading.closest("section");
    expect(card).not.toBeNull();
    expect(within(card!).getByText("学習時間").parentElement).toHaveTextContent(
      "目安 1分",
    );
    expect(within(card!).getByText("復習").parentElement).toHaveTextContent("1件");
    expect(within(card!).getByText("新しい単語").parentElement).toHaveTextContent(
      "1件",
    );
    expect(within(card!).getByText("曖昧項目").parentElement).toHaveTextContent("1件");
    expect(within(card!).getByText(/次回予定:/).parentElement).toHaveTextContent(
      "7/28",
    );
  });

  it("空・読み込み失敗を説明し、practiceSet 0件では技能ボタンを出さない", async () => {
    const { port } = createPort(snapshot());
    const { rerender } = render(<TodayPage port={port} clock={clock} />);
    expect(
      await screen.findByRole("heading", {
        name: "今日の追加メニューはありません",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "技能練習を開く" }),
    ).not.toBeInTheDocument();

    const failingPort: TodayDataPort = {
      loadSnapshot: () => Promise.reject(new Error("端末の保存領域を読めません")),
      savePlan: (plan) => Promise.resolve(plan),
    };
    rerender(<TodayPage port={failingPort} clock={clock} />);
    expect(await screen.findByText("端末の保存領域を読めません")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "もう一度試す" })).toBeInTheDocument();
  });
});
