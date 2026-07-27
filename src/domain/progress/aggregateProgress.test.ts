import { describe, expect, it } from "vitest";
import type { Attempt, LessonProgress, MasteryProfile, StudySession } from "../models";
import type { ReviewState } from "../review";
import {
  aggregateProgress,
  buildStudyDateRange,
  shiftStudyDate,
} from "./aggregateProgress";
import type { ProgressAggregateInput } from "./types";

const NOW = new Date("2026-07-27T12:00:00.000Z");

function attempt(
  id: string,
  itemKey: string,
  studyDate: string,
  options: Partial<Attempt> = {},
): Attempt {
  return {
    id,
    itemKey,
    sessionId: `session:${id}`,
    createdAt: `${studyDate}T10:00:00.000Z`,
    studyDate,
    mode: "recognitionChoice",
    response: 0,
    correct: true,
    score: 1,
    responseTimeMs: 2_000,
    hintCount: 0,
    ...options,
  };
}

function session(id: string, studyDate: string, minutes: number): StudySession {
  const startedAt = new Date(`${studyDate}T09:00:00.000Z`);
  return {
    id,
    type: "vocabulary",
    startedAt: startedAt.toISOString(),
    endedAt: new Date(startedAt.getTime() + minutes * 60_000).toISOString(),
    studyDate,
    itemKeys: [],
    completedItemKeys: [],
    interrupted: false,
  };
}

function reviewState(itemKey: string, options: Partial<ReviewState> = {}): ReviewState {
  return {
    itemKey,
    status: "review",
    learningStep: 0,
    intervalDays: 2,
    easeBias: 0,
    dueAt: "2026-07-24T00:00:00.000Z",
    reviewCount: 3,
    lapseCount: 0,
    consecutiveSuccesses: 1,
    updatedAt: "2026-07-25T00:00:00.000Z",
    ...options,
  };
}

function mastery(
  itemKey: string,
  options: Partial<MasteryProfile> = {},
): MasteryProfile {
  return {
    itemKey,
    recognition: 50,
    recall: 50,
    listening: 50,
    spelling: 50,
    context: 50,
    lastUpdatedAt: NOW.toISOString(),
    ...options,
  };
}

function lessonProgress(
  lessonId: string,
  status: LessonProgress["status"],
): LessonProgress {
  return {
    lessonId,
    status,
    currentSectionIndex: 1,
    updatedAt: NOW.toISOString(),
    ...(status === "completed" ? { completedAt: NOW.toISOString() } : {}),
  };
}

function input(
  overrides: Partial<ProgressAggregateInput> = {},
): ProgressAggregateInput {
  return {
    endStudyDate: "2026-07-27",
    periodDays: 7,
    now: NOW,
    currentStage: 0,
    attempts: [],
    sessions: [],
    reviewStates: [],
    masteryProfiles: [],
    lessonProgress: [],
    items: [],
    exercises: [],
    lessons: [],
    lessonCompletions: [],
    ...overrides,
  };
}

describe("進捗の日付範囲", () => {
  it("末尾を含む7日・30日の連続した学習日を作る", () => {
    expect(buildStudyDateRange("2026-03-01", 7)).toEqual([
      "2026-02-23",
      "2026-02-24",
      "2026-02-25",
      "2026-02-26",
      "2026-02-27",
      "2026-02-28",
      "2026-03-01",
    ]);
    expect(buildStudyDateRange("2026-07-27", 30)).toHaveLength(30);
    expect(shiftStudyDate("2024-02-28", 1)).toBe("2024-02-29");
  });

  it("存在しない学習日は明示的に拒否する", () => {
    expect(() => buildStudyDateRange("2026-02-30", 7)).toThrow("存在しない日付");
  });
});

describe("進捗集計", () => {
  it("実データから日別時間・復習・新規・レッスン完了と要約を作る", () => {
    const snapshot = aggregateProgress(
      input({
        attempts: [
          attempt("old-a", "vocab:a", "2026-07-20", { correct: false, score: 0 }),
          attempt("review-a", "vocab:a", "2026-07-25"),
          attempt("new-b", "vocab:b", "2026-07-27"),
          attempt("new-grammar", "grammar:be", "2026-07-27", {
            exerciseId: "exercise:be",
            mode: "multipleChoice",
          }),
        ],
        sessions: [
          session("session:25", "2026-07-25", 10),
          session("session:27", "2026-07-27", 5),
        ],
        lessonCompletions: [{ lessonId: "lesson:a", studyDate: "2026-07-27" }],
        items: [
          {
            itemKey: "vocab:a",
            label: "apple",
            skills: ["vocabulary"],
          },
          {
            itemKey: "vocab:b",
            label: "book",
            skills: ["vocabulary"],
          },
        ],
        exercises: [{ exerciseId: "exercise:be", skills: ["grammar"] }],
      }),
    );

    expect(snapshot.period).toEqual({
      days: 7,
      startStudyDate: "2026-07-21",
      endStudyDate: "2026-07-27",
    });
    expect(snapshot.daily).toHaveLength(7);
    expect(snapshot.daily.find(({ studyDate }) => studyDate === "2026-07-25")).toEqual({
      studyDate: "2026-07-25",
      studyMinutes: 10,
      reviewCount: 1,
      newCount: 0,
      completedLessonCount: 0,
      active: true,
    });
    expect(snapshot.daily.at(-1)).toEqual({
      studyDate: "2026-07-27",
      studyMinutes: 5,
      reviewCount: 0,
      newCount: 2,
      completedLessonCount: 1,
      active: true,
    });
    expect(snapshot.totals).toEqual({
      studyMinutes: 15,
      reviewCount: 1,
      newCount: 2,
      completedLessonCount: 1,
      activeDays: 2,
    });
    expect(snapshot.textSummary).toContain("合計15分");
    expect(snapshot.textSummary).toContain("復習1項目");
    expect(snapshot.hasActivity).toBe(true);
  });

  it("6技能を現在期間と直前期間で比較し、自己評価も点数化する", () => {
    const attempts = [
      attempt("previous-vocab", "vocab:a", "2026-07-18", {
        correct: false,
        score: 0,
      }),
      attempt("current-vocab", "vocab:a", "2026-07-27"),
      attempt("grammar", "grammar:a", "2026-07-27", {
        exerciseId: "exercise:grammar",
      }),
      attempt("reading", "practice:reading", "2026-07-27", {
        mode: "readingQuestion",
      }),
      attempt("listening", "practice:listening", "2026-07-27", {
        mode: "listening:exam",
      }),
      attempt("writing", "practice:writing", "2026-07-27", {
        mode: "writing-summary",
        correct: null,
        score: 0,
        response: {
          rubric: { structure: true, grammar: true, vocabulary: false },
        },
      }),
      attempt("speaking", "practice:speaking", "2026-07-27", {
        mode: "speakingPractice",
        correct: null,
        score: 0.75,
      }),
    ];
    const snapshot = aggregateProgress(
      input({
        attempts,
        items: [
          { itemKey: "vocab:a", label: "apple", skills: ["vocabulary"] },
          {
            itemKey: "practice:listening",
            label: "聞き取り",
            skills: ["listening"],
          },
        ],
        exercises: [
          {
            exerciseId: "exercise:grammar",
            skills: ["grammar"],
          },
        ],
      }),
    );

    expect(snapshot.skills.map(({ skill }) => skill)).toEqual([
      "vocabulary",
      "grammar",
      "reading",
      "listening",
      "writing",
      "speaking",
    ]);
    expect(snapshot.skills.find(({ skill }) => skill === "vocabulary")).toEqual(
      expect.objectContaining({
        score: 100,
        previousScore: 0,
        delta: 100,
        direction: "improving",
      }),
    );
    expect(snapshot.skills.find(({ skill }) => skill === "writing")).toEqual(
      expect.objectContaining({ score: 67, attemptCount: 1, direction: "new" }),
    );
    expect(snapshot.skills.find(({ skill }) => skill === "speaking")).toEqual(
      expect.objectContaining({ score: 75, attemptCount: 1 }),
    );
  });

  it("誤答・遅い回答・再学習・期限超過、認識と想起の差を別々に示す", () => {
    const snapshot = aggregateProgress(
      input({
        attempts: [
          attempt("weak-1", "vocab:weak", "2026-07-26", {
            correct: false,
            score: 0,
            responseTimeMs: 12_000,
          }),
          attempt("weak-2", "vocab:weak", "2026-07-27", {
            correct: false,
            score: 0,
            responseTimeMs: 10_000,
          }),
        ],
        reviewStates: [
          reviewState("vocab:weak", {
            lapseCount: 2,
            lastReviewedAt: "2026-07-27T10:00:00.000Z",
          }),
          reviewState("vocab:overdue-only", {
            lapseCount: 0,
            dueAt: "2026-07-26T00:00:00.000Z",
          }),
        ],
        masteryProfiles: [mastery("vocab:weak", { recognition: 85, recall: 40 })],
        items: [
          {
            itemKey: "vocab:weak",
            label: "remember",
            path: "/vocabulary/word-remember",
            skills: ["vocabulary"],
          },
          {
            itemKey: "vocab:overdue-only",
            label: "overdue",
            skills: ["vocabulary"],
          },
        ],
      }),
    );

    expect(snapshot.weakness.weakItems[0]).toEqual(
      expect.objectContaining({
        itemKey: "vocab:weak",
        label: "remember",
        errorRate: 100,
        averageResponseTimeMs: 11_000,
        lapseCount: 2,
      }),
    );
    expect(snapshot.weakness.weakItems[0]?.reasons).toEqual(
      expect.arrayContaining(["誤答率100%", "平均11秒", "再学習2回", "3日期限超過"]),
    );
    expect(snapshot.weakness.recognitionRecallGaps[0]).toEqual(
      expect.objectContaining({ gap: 45, recognition: 85, recall: 40 }),
    );
    expect(snapshot.weakness.lapses[0]?.lapseCount).toBe(2);
    expect(snapshot.weakness.slowResponses[0]?.averageResponseTimeMs).toBe(11_000);
    expect(snapshot.weakness.weakItems).toContainEqual(
      expect.objectContaining({
        itemKey: "vocab:overdue-only",
        errorRate: 0,
        overdueDays: 1,
        reasons: ["1日期限超過"],
      }),
    );
  });

  it("ステージ進行と、再開を肯定する継続表示を作る", () => {
    const snapshot = aggregateProgress(
      input({
        currentStage: 0,
        attempts: [
          attempt("past", "vocab:past", "2026-07-24"),
          attempt("today", "vocab:today", "2026-07-27"),
        ],
        lessons: [
          { lessonId: "lesson:1", stage: 0, title: "レッスン1" },
          { lessonId: "lesson:2", stage: 0, title: "レッスン2" },
          { lessonId: "lesson:3", stage: 1, title: "レッスン3" },
        ],
        lessonProgress: [
          lessonProgress("lesson:1", "completed"),
          lessonProgress("lesson:2", "inProgress"),
        ],
      }),
    );

    expect(snapshot.stages[0]).toEqual({
      stage: 0,
      completedLessonCount: 1,
      totalLessonCount: 2,
      completionRate: 50,
      isCurrentStage: true,
    });
    expect(snapshot.stages[1]).toEqual(
      expect.objectContaining({
        completedLessonCount: 0,
        totalLessonCount: 1,
        isCurrentStage: false,
      }),
    );
    expect(snapshot.continuity).toEqual(
      expect.objectContaining({
        currentStreak: 1,
        longestStreak: 1,
        totalActiveDays: 2,
        restartCount: 1,
        isRestartDay: true,
      }),
    );
    expect(snapshot.continuity.message).toContain("再開できました");
    expect(snapshot.continuity.message).not.toContain("失敗");
  });

  it("記録がない期間にもゼロの日を揃え、始めやすい空状態文を返す", () => {
    const snapshot = aggregateProgress(input({ periodDays: 30 }));

    expect(snapshot.daily).toHaveLength(30);
    expect(snapshot.hasActivity).toBe(false);
    expect(snapshot.totals.activeDays).toBe(0);
    expect(snapshot.textSummary).toContain("短い学習");
    expect(snapshot.continuity.message).toContain("1問や1分");
    expect(snapshot.skills.every(({ direction }) => direction === "noData")).toBe(true);
  });
});
