import { describe, expect, it } from "vitest";
import type { LessonProgress } from "../../domain/models";
import type { Lesson } from "../../infrastructure/content/schemas";
import { CURRICULUM_STAGES } from "./catalog";
import { buildCourseMap, loadCourseMap } from "./courseModel";

function lesson(
  id: string,
  stage: number,
  order: number,
  prerequisites: string[] = [],
): Lesson {
  return {
    id,
    schemaVersion: "1.0.0",
    contentRevision: 1,
    stage,
    unitId: `S${stage}-U1`,
    order,
    titleJa: `${id}のレッスン`,
    objectivesJa: ["目標"],
    prerequisites,
    sections: [
      {
        id: "summary",
        type: "summary",
        titleJa: "まとめ",
        bodyJa: "まとめです。",
        estimatedMinutes: 1,
      },
    ],
    estimatedMinutes: 5,
    reviewItemKeys: [],
    source: { type: "original", author: "テスト" },
  };
}

function progress(lessonId: string, status: LessonProgress["status"]): LessonProgress {
  return {
    lessonId,
    status,
    currentSectionIndex: 0,
    updatedAt: "2026-07-27T00:00:00.000Z",
  };
}

describe("コースマップモデル", () => {
  it("ステージ0〜6を仕様順で定義する", () => {
    expect(CURRICULUM_STAGES.map(({ stage }) => stage)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(CURRICULUM_STAGES.map(({ titleJa }) => titleJa)).toEqual([
      "はじめての英語",
      "1文を作る",
      "日常を説明する",
      "中学英語を完成する",
      "高校英語の基礎",
      "2級への橋渡し",
      "英検2級対策",
    ]);
  });

  it("完了と学習済みを進行上の完了として完了率を計算する", () => {
    const lessons = [lesson("lesson-a", 1, 1), lesson("lesson-b", 1, 2)];
    const snapshot = buildCourseMap({
      lessons,
      progressByLessonId: new Map([
        ["lesson-a", progress("lesson-a", "completed")],
        ["lesson-b", progress("lesson-b", "skipped")],
      ]),
      currentStage: 1,
      recommendedStage: 1,
    });
    const stage = snapshot.stages[1];

    expect(stage).toMatchObject({
      status: "completed",
      completionRate: 100,
      completedLessonCount: 2,
      totalLessonCount: 2,
      isCurrentStage: true,
      isRecommendedStage: true,
    });
  });

  it("現在ステージ以降から前提を満たす次レッスンを推奨する", () => {
    const lessons = [
      lesson("lesson-s0", 0, 1),
      lesson("lesson-s2-a", 2, 1),
      lesson("lesson-s2-b", 2, 2, ["lesson-s2-a"]),
    ];
    const snapshot = buildCourseMap({
      lessons,
      progressByLessonId: new Map(),
      currentStage: 2,
      recommendedStage: 2,
    });

    expect(snapshot.recommendedNextLesson?.lesson.id).toBe("lesson-s2-a");
    expect(
      snapshot.stages[2]?.lessons.find(({ lesson: item }) => item.id === "lesson-s2-b"),
    ).toMatchObject({
      prerequisitesMet: false,
      unmetPrerequisiteIds: ["lesson-s2-a"],
    });
  });

  it("前提未完了でもレッスンを一覧から除外しない", () => {
    const snapshot = buildCourseMap({
      lessons: [lesson("lesson-a", 1, 1), lesson("lesson-b", 1, 2, ["lesson-a"])],
      progressByLessonId: new Map(),
      currentStage: 1,
      recommendedStage: 1,
    });

    expect(snapshot.stages[1]?.lessons).toHaveLength(2);
    expect(snapshot.stages[1]?.lessons[1]?.prerequisitesMet).toBe(false);
  });

  it("注入したcontentとprogressからスナップショットを読み込む", async () => {
    const lessons = [lesson("lesson-a", 1, 1)];
    const snapshot = await loadCourseMap(
      { listLessons: () => Promise.resolve(lessons) },
      {
        get: (lessonId) => Promise.resolve(progress(lessonId, "inProgress")),
      },
      1,
      1,
    );

    expect(snapshot.stages[1]).toMatchObject({
      status: "inProgress",
      completionRate: 0,
    });
  });
});
