import { IDBKeyRange, indexedDB } from "fake-indexeddb";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockPracticeSets } from "../../content/pilot/practiceMock";
import type { Attempt, DailyPlan, StudySession } from "../../domain/models";
import { AppDb } from "../../infrastructure/db/appDb";
import { createDexieMockStore } from "./dexieStore";
import { MockPracticePage } from "./MockPracticePage";
import { parseMockPracticeSet } from "./schema";
import type { MockPracticeStore } from "./types";

const NOW = new Date("2026-07-27T03:00:00.000Z");
let db: AppDb;
let sequence = 0;

function dailyPlan(itemKey: string): DailyPlan {
  return {
    date: "2026-07-27",
    generatedAt: NOW.toISOString(),
    targetMinutes: 15,
    mode: "standard",
    blocks: [
      {
        blockId: "mock-block",
        itemId: itemKey,
        category: "skillPractice",
        estimatedSeconds: 600,
        status: "pending",
        skill: "reading",
      },
    ],
    completedBlockIds: [],
    sourceSnapshot: { dueCount: 0, overdueCount: 0, newLimit: 0 },
    capacity: {
      requestedMinutes: 15,
      effectiveMinutes: 15,
      budgetSeconds: 900,
      estimatedReviewItemCapacity: 30,
    },
    plannedSeconds: 600,
    remainingBudgetSeconds: 300,
  };
}

function completionInput(itemKey: string) {
  const attempt: Attempt = {
    id: "mock-attempt",
    itemKey,
    exerciseId: "mock-language-1",
    sessionId: "mock-session",
    createdAt: NOW.toISOString(),
    studyDate: "2026-07-27",
    mode: "mock:vocabulary",
    response: 0,
    correct: true,
    score: 1,
    responseTimeMs: 1_000,
    hintCount: 0,
  };
  const session: StudySession = {
    id: "mock-session",
    type: "mock",
    startedAt: NOW.toISOString(),
    endedAt: NOW.toISOString(),
    studyDate: "2026-07-27",
    itemKeys: [itemKey],
    completedItemKeys: [itemKey],
    interrupted: false,
  };
  return { attempts: [attempt], session };
}

beforeEach(() => {
  sequence += 1;
  db = new AppDb(`mock-practice-${sequence}`, {
    indexedDB,
    IDBKeyRange,
  });
});

afterEach(async () => {
  db.close();
  await db.delete();
});

describe("短縮模試教材", () => {
  it("正答番号を含む厳密なpayloadを検証する", () => {
    const parsed = parseMockPracticeSet(mockPracticeSets[0]!);
    expect(parsed.payload.sections).toHaveLength(3);
    expect(
      parsed.payload.sections.flatMap((section) => section.questions),
    ).toHaveLength(6);

    expect(() =>
      parseMockPracticeSet({
        ...mockPracticeSets[0]!,
        payload: {
          noticeJa: "テスト",
          sections: [
            {
              id: "one",
              titleJa: "テスト",
              skill: "reading",
              timeLimitSeconds: 60,
              instructionsJa: "選択",
              questions: [
                {
                  id: "bad",
                  prompt: "Question",
                  choices: ["A", "B"],
                  correctChoiceIndex: 4,
                  explanationJa: "説明",
                  reviewPath: "/practice/reading",
                },
              ],
            },
            {
              id: "two",
              titleJa: "テスト2",
              skill: "listening",
              timeLimitSeconds: 60,
              instructionsJa: "選択",
              questions: [
                {
                  id: "ok",
                  prompt: "Question",
                  choices: ["A", "B"],
                  correctChoiceIndex: 0,
                  explanationJa: "説明",
                  reviewPath: "/practice/listening",
                },
              ],
            },
          ],
        },
      }),
    ).toThrow("正答番号");
  });
});

describe("短縮模試のDexie保存", () => {
  it("結果・session・今日のblock完了を1 transactionで保存する", async () => {
    const set = mockPracticeSets[0]!;
    const itemKey = `practice:${set.id}`;
    await Promise.all([
      db.practiceSets.put(set),
      db.dailyPlans.put(dailyPlan(itemKey)),
    ]);
    const store = createDexieMockStore(db);

    const loaded = await store.load();
    expect(loaded.sets).toHaveLength(1);

    await store.complete({
      ...completionInput(itemKey),
      planContext: {
        planDate: "2026-07-27",
        blockId: "mock-block",
        itemKey,
      },
    });

    expect(await db.attempts.count()).toBe(1);
    expect(await db.sessions.count()).toBe(1);
    expect((await db.dailyPlans.get("2026-07-27"))?.completedBlockIds).toEqual([
      "mock-block",
    ]);
  });

  it("planの対応が不正なら結果とsessionも残さない", async () => {
    const itemKey = `practice:${mockPracticeSets[0]!.id}`;
    await db.dailyPlans.put(dailyPlan(itemKey));
    const store = createDexieMockStore(db);

    await expect(
      store.complete({
        ...completionInput(itemKey),
        planContext: {
          planDate: "2026-07-27",
          blockId: "wrong-block",
          itemKey,
        },
      }),
    ).rejects.toThrow("一致しません");

    expect(await db.attempts.count()).toBe(0);
    expect(await db.sessions.count()).toBe(0);
  });
});

describe("短縮模試画面", () => {
  it("全問を完了し、公式スコアではない結果と復習導線を表示する", async () => {
    const content = parseMockPracticeSet(mockPracticeSets[0]!);
    const complete = vi.fn<MockPracticeStore["complete"]>().mockResolvedValue();
    const store: MockPracticeStore = {
      load: vi.fn().mockResolvedValue({
        sets: [content],
        studyDayStartHour: 4,
      }),
      complete,
    };
    const user = userEvent.setup();

    render(
      <MockPracticePage
        store={store}
        setId={content.set.id}
        clock={{ now: () => NOW }}
        timeZone="Asia/Tokyo"
        onOpenReview={vi.fn()}
      />,
    );

    await user.click(await screen.findByRole("button", { name: "短縮模試を始める" }));
    const answers = [
      "provide",
      "would become",
      "The town needed a less expensive way to add shade.",
      "Ask passengers for their opinions",
      "Saturday morning",
      "Remove her personal data",
    ];
    for (const [index, answer] of answers.entries()) {
      if (index === 4) {
        await user.click(screen.getByRole("button", { name: "スクリプトを開く" }));
      }
      await user.click(screen.getByRole("radio", { name: answer }));
      await user.click(
        screen.getByRole("button", {
          name: index === answers.length - 1 ? "採点して保存" : "次の問題へ",
        }),
      );
    }

    expect(
      await screen.findByRole("heading", { name: "短縮模試を終えました" }),
    ).toBeInTheDocument();
    expect(screen.getByText("公式スコアではありません")).toBeInTheDocument();
    expect(complete).toHaveBeenCalledOnce();
    const saved = complete.mock.calls[0]?.[0];
    expect(saved?.attempts).toHaveLength(6);
    expect(saved?.attempts.every((attempt) => attempt.correct)).toBe(true);
  });

  it("演習中に離れる操作を中断警告で取り消せる", async () => {
    const content = parseMockPracticeSet(mockPracticeSets[0]!);
    const onExit = vi.fn();
    const confirmExit = vi.fn(() => false);
    const user = userEvent.setup();
    render(
      <MockPracticePage
        store={{
          load: vi.fn().mockResolvedValue({
            sets: [content],
            studyDayStartHour: 4,
          }),
          complete: vi.fn(),
        }}
        setId={content.set.id}
        confirmExit={confirmExit}
        onExit={onExit}
      />,
    );

    await user.click(await screen.findByRole("button", { name: "短縮模試を始める" }));
    await user.click(screen.getByRole("button", { name: "途中で終了" }));

    await waitFor(() => expect(confirmExit).toHaveBeenCalledOnce());
    expect(onExit).not.toHaveBeenCalled();
  });
});
