import { IDBKeyRange, indexedDB } from "fake-indexeddb";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { speakingPracticeSets } from "../../content/pilot/practiceSpeaking";
import type { DailyPlan, StudySession } from "../../domain/models";
import { AppDb } from "../../infrastructure/db/appDb";
import { createDexieSpeakingStore } from "./dexieStore";
import { parseSpeakingPracticeSet } from "./schema";
import { SpeakingPracticePage } from "./SpeakingPracticePage";
import type { SpeakingPracticeStore, SpeakingRecorder } from "./types";

const NOW = new Date("2026-07-27T03:00:00.000Z");
let db: AppDb;
let sequence = 0;

function plan(itemKey: string): DailyPlan {
  return {
    date: "2026-07-27",
    generatedAt: NOW.toISOString(),
    targetMinutes: 15,
    mode: "standard",
    blocks: [
      {
        blockId: "speaking-block",
        itemId: itemKey,
        category: "skillPractice",
        estimatedSeconds: 480,
        status: "pending",
        skill: "speaking",
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
    plannedSeconds: 480,
    remainingBudgetSeconds: 420,
  };
}

beforeEach(() => {
  sequence += 1;
  db = new AppDb(`speaking-practice-${sequence}`, {
    indexedDB,
    IDBKeyRange,
  });
});

afterEach(async () => {
  db.close();
  await db.delete();
});

describe("スピーキング教材と保存", () => {
  it("4セットの3場面payloadを検証する", () => {
    expect(speakingPracticeSets).toHaveLength(4);
    for (const set of speakingPracticeSets) {
      expect(parseSpeakingPracticeSet(set).payload.scenes).toHaveLength(3);
    }
  });

  it("回答・session・今日のblock完了を原子的に保存する", async () => {
    const set = speakingPracticeSets[0]!;
    const itemKey = `practice:${set.id}`;
    await Promise.all([db.practiceSets.put(set), db.dailyPlans.put(plan(itemKey))]);
    const store = createDexieSpeakingStore(db);
    const attempt = {
      id: "speaking-attempt",
      itemKey,
      exerciseId: set.id,
      sessionId: "speaking-session",
      createdAt: NOW.toISOString(),
      studyDate: "2026-07-27",
      mode: "speakingPractice",
      response: {},
      correct: null,
      score: 0.5,
      responseTimeMs: 10_000,
      hintCount: 0,
    } as const;
    const session: StudySession = {
      id: "speaking-session",
      type: "practice",
      startedAt: NOW.toISOString(),
      endedAt: NOW.toISOString(),
      studyDate: "2026-07-27",
      itemKeys: [itemKey],
      completedItemKeys: [itemKey],
      interrupted: false,
    };

    await store.complete({
      attempt,
      session,
      planContext: {
        planDate: "2026-07-27",
        blockId: "speaking-block",
        itemKey,
      },
    });

    expect((await db.attempts.get(attempt.id))?.correct).toBeNull();
    expect(await db.sessions.get(session.id)).toBeDefined();
    expect((await db.dailyPlans.get("2026-07-27"))?.completedBlockIds).toEqual([
      "speaking-block",
    ]);
  });

  it("planとの対応が不正なら回答とsessionを残さない", async () => {
    const set = speakingPracticeSets[0]!;
    const itemKey = `practice:${set.id}`;
    await db.dailyPlans.put(plan(itemKey));
    const store = createDexieSpeakingStore(db);

    await expect(
      store.complete({
        attempt: {
          id: "rollback-attempt",
          itemKey,
          exerciseId: set.id,
          sessionId: "rollback-session",
          createdAt: NOW.toISOString(),
          studyDate: "2026-07-27",
          mode: "speakingPractice",
          response: {},
          correct: null,
          score: 0.5,
          responseTimeMs: 1,
          hintCount: 0,
        },
        session: {
          id: "rollback-session",
          type: "practice",
          startedAt: NOW.toISOString(),
          endedAt: NOW.toISOString(),
          studyDate: "2026-07-27",
          itemKeys: [itemKey],
          completedItemKeys: [itemKey],
          interrupted: false,
        },
        planContext: {
          planDate: "2026-07-27",
          blockId: "wrong",
          itemKey,
        },
      }),
    ).rejects.toThrow("一致しません");
    expect(await db.attempts.count()).toBe(0);
    expect(await db.sessions.count()).toBe(0);
  });
});

describe("スピーキング画面", () => {
  it("ページを置き換える空・エラー状態を主見出しとして伝える", async () => {
    const recorder: SpeakingRecorder = {
      isSupported: () => false,
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn(),
      dispose: vi.fn(),
    };
    const baseStore = {
      saveRecording: vi.fn().mockResolvedValue(undefined),
      deleteRecording: vi.fn().mockResolvedValue(undefined),
      complete: vi.fn().mockResolvedValue(undefined),
    };
    const empty = render(
      <SpeakingPracticePage
        store={{
          ...baseStore,
          load: vi.fn().mockResolvedValue({ sets: [], studyDayStartHour: 4 }),
        }}
        recorder={recorder}
      />,
    );
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "スピーキング練習を準備しています",
      }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "スピーキング教材がありません",
      }),
    ).toBeInTheDocument();
    empty.unmount();

    render(
      <SpeakingPracticePage
        store={{
          ...baseStore,
          load: vi.fn().mockRejectedValue(new Error("教材を読めません")),
        }}
        recorder={recorder}
      />,
    );
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "スピーキングを開けませんでした",
      }),
    ).toBeInTheDocument();
  });

  it("保存した録音は確認ダイアログを通してから削除する", async () => {
    const content = parseSpeakingPracticeSet(speakingPracticeSets[0]!);
    const deleteRecording = vi
      .fn<SpeakingPracticeStore["deleteRecording"]>()
      .mockResolvedValue();
    const recorder: SpeakingRecorder = {
      isSupported: () => true,
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn().mockResolvedValue({
        blob: new Blob(["recording"], { type: "audio/webm" }),
        durationMs: 1_000,
        mimeType: "audio/webm",
      }),
      dispose: vi.fn(),
    };
    const user = userEvent.setup();
    render(
      <SpeakingPracticePage
        store={{
          load: vi.fn().mockResolvedValue({
            sets: [content],
            studyDayStartHour: 4,
          }),
          saveRecording: vi.fn().mockResolvedValue(undefined),
          deleteRecording,
          complete: vi.fn(),
        }}
        recorder={recorder}
        clock={{ now: () => NOW }}
        setId={content.set.id}
      />,
    );

    await user.click(await screen.findByRole("button", { name: "練習を始める" }));
    await user.click(screen.getByRole("button", { name: "マイクを確認して録音開始" }));
    await user.click(await screen.findByRole("button", { name: "録音を停止して保存" }));
    await user.click(await screen.findByRole("button", { name: "録音を削除" }));

    const dialog = screen.getByRole("dialog", { name: "録音を削除しますか" });
    expect(dialog).toHaveTextContent("元に戻せません");
    expect(deleteRecording).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole("button", { name: "録音を削除" }));

    await waitFor(() => expect(deleteRecording).toHaveBeenCalledOnce());
    expect(screen.getByText("録音を端末から削除しました。")).toBeInTheDocument();
  });

  it("録音非対応でもテキストと自己評価で完了できる", async () => {
    const content = parseSpeakingPracticeSet(speakingPracticeSets[0]!);
    const complete = vi.fn<SpeakingPracticeStore["complete"]>().mockResolvedValue();
    const recorder: SpeakingRecorder = {
      isSupported: () => false,
      start: vi.fn(),
      stop: vi.fn(),
      dispose: vi.fn(),
    };
    const user = userEvent.setup();
    render(
      <SpeakingPracticePage
        store={{
          load: vi.fn().mockResolvedValue({
            sets: [content],
            studyDayStartHour: 4,
          }),
          saveRecording: vi.fn(),
          deleteRecording: vi.fn(),
          complete,
        }}
        recorder={recorder}
        clock={{ now: () => NOW }}
        timeZone="Asia/Tokyo"
        setId={content.set.id}
      />,
    );

    await user.click(await screen.findByRole("button", { name: "練習を始める" }));
    expect(screen.getByText(/この環境は録音に対応していません/u)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "黙読できたので次へ" }));
    await user.click(screen.getByRole("button", { name: "音読を終えた" }));
    await user.type(
      screen.getByLabelText("テキスト回答（録音する場合は要点だけでも可）"),
      "They learn how vegetables grow.",
    );
    await user.click(screen.getByRole("button", { name: "この回答で次へ" }));
    await user.click(screen.getByRole("button", { name: "説明を始める" }));
    await user.type(
      screen.getByLabelText("説明のメモまたはテキスト回答"),
      "First, a student notices a problem.",
    );
    await user.click(screen.getByRole("button", { name: "説明を終えた" }));
    await user.click(screen.getByRole("button", { name: "この回答で次へ" }));
    await user.click(screen.getByRole("button", { name: "この回答で次へ" }));
    await user.click(screen.getByRole("button", { name: "自己評価を保存して完了" }));

    expect(
      await screen.findByRole("heading", {
        name: "スピーキング練習を完了しました",
      }),
    ).toBeInTheDocument();
    expect(complete).toHaveBeenCalledOnce();
    expect(complete.mock.calls[0]?.[0].attempt.correct).toBeNull();
  });

  it("マイク拒否時に権限エラーを示し、テキスト練習を継続できる", async () => {
    const content = parseSpeakingPracticeSet(speakingPracticeSets[0]!);
    const recorder: SpeakingRecorder = {
      isSupported: () => true,
      start: vi.fn().mockRejectedValue(new Error("権限が拒否されました。")),
      stop: vi.fn(),
      dispose: vi.fn(),
    };
    const user = userEvent.setup();
    render(
      <SpeakingPracticePage
        store={{
          load: vi.fn().mockResolvedValue({
            sets: [content],
            studyDayStartHour: 4,
          }),
          saveRecording: vi.fn(),
          deleteRecording: vi.fn(),
          complete: vi.fn(),
        }}
        recorder={recorder}
        setId={content.set.id}
      />,
    );

    await user.click(await screen.findByRole("button", { name: "練習を始める" }));
    await user.click(screen.getByRole("button", { name: "マイクを確認して録音開始" }));

    expect(await screen.findByText(/権限が拒否されました/u)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "黙読できたので次へ" })).toBeEnabled();
  });
});
