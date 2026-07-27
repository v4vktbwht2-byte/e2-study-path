import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type {
  DailyProgress,
  ProgressPeriodDays,
  ProgressSnapshot,
} from "../../domain/progress";
import { ProgressPage } from "./ProgressPage";
import type { ProgressDataPort } from "./types";

function daily(days: ProgressPeriodDays, active: boolean): DailyProgress[] {
  return Array.from({ length: days }, (_, index) => {
    const day = String(28 - days + index).padStart(2, "0");
    const isLast = index === days - 1 && active;
    return {
      studyDate: `2026-07-${day}`,
      studyMinutes: isLast ? 15 : 0,
      reviewCount: isLast ? 3 : 0,
      newCount: isLast ? 2 : 0,
      completedLessonCount: isLast ? 1 : 0,
      active: isLast,
    };
  });
}

function snapshot(
  days: ProgressPeriodDays,
  options: { active?: boolean } = {},
): ProgressSnapshot {
  const active = options.active ?? true;
  const records = daily(days, active);
  return {
    period: {
      days,
      startStudyDate: records[0]!.studyDate,
      endStudyDate: "2026-07-27",
    },
    daily: records,
    totals: {
      studyMinutes: active ? 15 : 0,
      reviewCount: active ? 3 : 0,
      newCount: active ? 2 : 0,
      completedLessonCount: active ? 1 : 0,
      activeDays: active ? 1 : 0,
    },
    skills: [
      {
        skill: "vocabulary",
        score: active ? 80 : null,
        previousScore: active ? 70 : null,
        delta: active ? 10 : null,
        attemptCount: active ? 5 : 0,
        direction: active ? "improving" : "noData",
        summary: active
          ? "語彙は前の期間より10ポイント伸びています。"
          : "語彙は、まだ採点できる記録がありません。",
      },
      ...(["grammar", "reading", "listening", "writing", "speaking"] as const).map(
        (skill) => ({
          skill,
          score: null,
          previousScore: null,
          delta: null,
          attemptCount: 0,
          direction: "noData" as const,
          summary: "まだ採点できる記録がありません。",
        }),
      ),
    ],
    weakness: active
      ? {
          weakItems: [
            {
              itemKey: "vocab:remember",
              label: "remember",
              path: "/vocabulary/word-remember",
              score: 80,
              errorRate: 50,
              averageResponseTimeMs: 9_000,
              lapseCount: 2,
              overdueDays: 1,
              reasons: ["誤答率50%", "平均9秒", "再学習2回"],
            },
          ],
          recognitionRecallGaps: [
            {
              itemKey: "vocab:remember",
              label: "remember",
              path: "/vocabulary/word-remember",
              recognition: 80,
              recall: 50,
              gap: 30,
            },
          ],
          lapses: [
            {
              itemKey: "vocab:remember",
              label: "remember",
              path: "/vocabulary/word-remember",
              lapseCount: 2,
            },
          ],
          slowResponses: [
            {
              itemKey: "vocab:remember",
              label: "remember",
              path: "/vocabulary/word-remember",
              averageResponseTimeMs: 9_000,
              attemptCount: 2,
            },
          ],
        }
      : {
          weakItems: [],
          recognitionRecallGaps: [],
          lapses: [],
          slowResponses: [],
        },
    stages: Array.from({ length: 7 }, (_, stage) => ({
      stage,
      completedLessonCount: stage === 0 && active ? 1 : 0,
      totalLessonCount: stage === 0 ? 2 : 1,
      completionRate: stage === 0 && active ? 50 : 0,
      isCurrentStage: stage === 0,
    })),
    continuity: {
      currentStreak: active ? 1 : 0,
      longestStreak: active ? 3 : 0,
      totalActiveDays: active ? 4 : 0,
      restartCount: active ? 1 : 0,
      isRestartDay: active,
      ...(active ? { latestStudyDate: "2026-07-27" } : {}),
      message: active
        ? "今日また学習を再開できました。戻ってきた一歩を大切にしましょう。"
        : "最初の記録はこれからです。1問や1分から始められます。",
    },
    textSummary: active
      ? `${days}日間で1日、合計15分学習しました。復習3項目、新規2項目、完了レッスン1件です。`
      : `${days}日間の学習記録はまだありません。`,
    hasActivity: active,
  };
}

function renderPage(port: ProgressDataPort) {
  return render(
    <MemoryRouter initialEntries={["/progress"]}>
      <ProgressPage port={port} />
    </MemoryRouter>,
  );
}

describe("学習記録画面", () => {
  it("h1を保った読込状態から、実績・文章要約・6技能・弱点を表示する", async () => {
    let resolveLoad: ((value: ProgressSnapshot) => void) | undefined;
    const load = vi.fn<ProgressDataPort["load"]>(
      () =>
        new Promise((resolve) => {
          resolveLoad = resolve;
        }),
    );
    const { container } = renderPage({ load });

    const heading = screen.getByRole("heading", { name: "学習記録", level: 1 });
    expect(heading).toHaveFocus();
    expect(
      screen.getByRole("heading", { name: "学習記録を読み込んでいます" }),
    ).toBeInTheDocument();

    act(() => {
      resolveLoad?.(snapshot(7));
    });

    expect(
      await screen.findByRole("heading", { name: "期間のまとめ" }),
    ).toBeInTheDocument();
    expect(screen.getByText("15分")).toBeInTheDocument();
    expect(
      screen.getByText("7日間の合計は15分です。最も多い日は7/27の15分です。"),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "6技能の傾向" })).toBeInTheDocument();
    expect(screen.getByText("伸びています")).toBeInTheDocument();
    expect(
      screen.getByText("語彙は前の期間より10ポイント伸びています。"),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "remember" })).toHaveLength(4);
    expect(
      container.querySelectorAll('[aria-hidden="true"]').length,
    ).toBeGreaterThanOrEqual(8);
    expect(load).toHaveBeenCalledWith(7);
  });

  it("fieldset内のradioで7日・30日を切り替え、同じ期間の文章へ更新する", async () => {
    const load = vi
      .fn<ProgressDataPort["load"]>()
      .mockResolvedValueOnce(snapshot(7))
      .mockResolvedValueOnce(snapshot(30));
    renderPage({ load });

    expect(await screen.findByText(/7日間で1日/)).toBeInTheDocument();
    const sevenDays = screen.getByRole("radio", { name: "過去7日" });
    const thirtyDays = screen.getByRole("radio", { name: "過去30日" });
    expect(sevenDays).toBeChecked();

    await userEvent.setup().click(thirtyDays);

    expect(await screen.findByText(/30日間で1日/)).toBeInTheDocument();
    expect(thirtyDays).toBeChecked();
    expect(load).toHaveBeenNthCalledWith(1, 7);
    expect(load).toHaveBeenNthCalledWith(2, 30);
  });

  it("記録がない期間は始めやすい空状態とステージ進行を表示する", async () => {
    const load = vi
      .fn<ProgressDataPort["load"]>()
      .mockResolvedValue(snapshot(7, { active: false }));
    renderPage({ load });

    expect(
      await screen.findByRole("heading", {
        name: "この期間の学習記録はまだありません",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/1問や1分の学習でも/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "今日の学習を開く" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByRole("heading", { name: "ステージ進行" })).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "6技能の傾向" }),
    ).not.toBeInTheDocument();
  });

  it("読込エラーを本文に残し、再試行で記録へ復帰する", async () => {
    const load = vi
      .fn<ProgressDataPort["load"]>()
      .mockRejectedValueOnce(new Error("IndexedDBを開けませんでした。"))
      .mockResolvedValueOnce(snapshot(7));
    renderPage({ load });

    expect(
      await screen.findByRole("heading", {
        name: "学習記録を読み込めませんでした",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "IndexedDBを開けませんでした。",
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "学習データは削除されていません",
    );

    await userEvent.setup().click(screen.getByRole("button", { name: "もう一度試す" }));

    expect(
      await screen.findByRole("heading", { name: "期間のまとめ" }),
    ).toBeInTheDocument();
    await waitFor(() => expect(load).toHaveBeenCalledTimes(2));
  });
});
