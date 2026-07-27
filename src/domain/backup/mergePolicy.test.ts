import { describe, expect, it } from "vitest";
import type { DailyPlan, StudySession } from "../models";
import { chooseNewer, mergeDailyPlan, mergeStudySession } from "./mergePolicy";

function session(overrides: Partial<StudySession> = {}): StudySession {
  return {
    id: "session-1",
    type: "practice",
    startedAt: "2026-07-27T23:00:00+09:00",
    studyDate: "2026-07-27",
    itemKeys: ["practice:reading-1"],
    completedItemKeys: [],
    interrupted: true,
    ...overrides,
  };
}

function dailyPlan(generatedAt: string, completed: boolean): DailyPlan {
  return {
    date: "2026-07-27",
    generatedAt,
    targetMinutes: 5,
    mode: "light",
    blocks: [
      {
        blockId: "block-1",
        itemId: "practice:reading-1",
        category: "skillPractice",
        estimatedSeconds: 60,
        status: completed ? "completed" : "pending",
        skill: "reading",
      },
    ],
    completedBlockIds: completed ? ["block-1"] : [],
    sourceSnapshot: { dueCount: 0, overdueCount: 0, newLimit: 0 },
    capacity: {
      requestedMinutes: 5,
      effectiveMinutes: 5,
      budgetSeconds: 300,
      estimatedReviewItemCapacity: 20,
    },
    plannedSeconds: 60,
    remainingBudgetSeconds: 240,
  };
}

describe("バックアップの日時マージ", () => {
  it("UTC offset表記ではなく実時刻で新しいrecordを選ぶ", () => {
    const current = {
      id: "profile",
      updatedAt: "2026-07-27T23:00:00+09:00",
      value: "current",
    };
    const incoming = {
      id: "profile",
      updatedAt: "2026-07-27T15:00:00.000Z",
      value: "incoming",
    };

    expect(chooseNewer(current, incoming, (record) => record.updatedAt)).toBe(incoming);
  });

  it("同じ実時刻を異なるoffsetで表したsessionを同一として統合する", () => {
    const current = session({
      endedAt: "2026-07-28T00:30:00+09:00",
      completedItemKeys: ["practice:reading-1"],
    });
    const incoming = session({
      startedAt: "2026-07-27T14:00:00.000Z",
      endedAt: "2026-07-27T16:00:00.000Z",
      itemKeys: ["practice:reading-2"],
      completedItemKeys: ["practice:reading-2"],
    });

    expect(mergeStudySession(current, incoming)).toMatchObject({
      endedAt: "2026-07-27T16:00:00.000Z",
      itemKeys: ["practice:reading-1", "practice:reading-2"],
      completedItemKeys: ["practice:reading-1", "practice:reading-2"],
      interrupted: false,
    });
  });

  it("DailyPlanの新旧を実時刻で決め、古い側の完了状態も保持する", () => {
    const current = dailyPlan("2026-07-27T23:00:00+09:00", true);
    const incoming = dailyPlan("2026-07-27T15:00:00.000Z", false);

    const merged = mergeDailyPlan(current, incoming);

    expect(merged.generatedAt).toBe("2026-07-27T15:00:00.000Z");
    expect(merged.completedBlockIds).toEqual(["block-1"]);
    expect(merged.blocks[0]?.status).toBe("completed");
  });
});
