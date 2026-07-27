import { IDBKeyRange, indexedDB } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { pilotExercises, pilotLessons, pilotVocabulary } from "../../content/pilot";
import type { Attempt, StudySession, UserProfile } from "../../domain/models";
import { AppDb } from "../../infrastructure/db/appDb";
import { DEFAULT_SETTINGS } from "../../infrastructure/db/repositories";
import { createDexieProgressPort } from "./dexieProgressPort";

let db: AppDb;
let sequence = 0;

const NOW = new Date("2026-07-27T18:00:00.000Z");
const profile: UserProfile = {
  id: "local-user",
  createdAt: NOW.toISOString(),
  updatedAt: NOW.toISOString(),
  goals: ["relearn"],
  dailyMinutes: 15,
  recommendedStage: 0,
  selectedStage: 0,
  onboardingCompleted: true,
};

beforeEach(() => {
  sequence += 1;
  db = new AppDb(`progress-port-${sequence}`, {
    indexedDB,
    IDBKeyRange,
  });
});

afterEach(async () => {
  db.close();
  await db.delete();
});

describe("Dexie進捗ポート", () => {
  it("端末内の学習履歴・教材・学習日境界から進捗を読み出す", async () => {
    const vocabulary = pilotVocabulary[0]!;
    const lesson = pilotLessons[0]!;
    const exercise = pilotExercises.find(
      (candidate) => candidate.lessonId === lesson.id,
    )!;
    const itemKey = `vocab:${vocabulary.id}`;
    const currentAttempt: Attempt = {
      id: "attempt-current",
      itemKey,
      exerciseId: exercise.id,
      sessionId: "vocabulary-session",
      createdAt: "2026-07-27T18:00:00.000Z",
      studyDate: "2026-07-27",
      mode: "recognitionChoice",
      response: 0,
      correct: false,
      score: 0,
      responseTimeMs: 10_000,
      hintCount: 0,
    };
    const previousAttempt: Attempt = {
      ...currentAttempt,
      id: "attempt-previous",
      sessionId: "previous-session",
      createdAt: "2026-07-20T12:00:00.000Z",
      studyDate: "2026-07-20",
      correct: true,
      score: 1,
    };
    const sessions: StudySession[] = [
      {
        id: "vocabulary-session",
        type: "vocabulary",
        startedAt: "2026-07-27T17:40:00.000Z",
        endedAt: "2026-07-27T17:50:00.000Z",
        studyDate: "2026-07-27",
        itemKeys: [itemKey],
        completedItemKeys: [itemKey],
        interrupted: false,
      },
      {
        id: `lesson-session:${lesson.id}:2026-07-27T17:50:00.000Z`,
        type: "lesson",
        startedAt: "2026-07-27T17:50:00.000Z",
        endedAt: "2026-07-27T17:55:00.000Z",
        studyDate: "2026-07-27",
        itemKeys: [`lesson:${lesson.id}`],
        completedItemKeys: [`lesson:${lesson.id}`],
        interrupted: false,
      },
    ];

    await Promise.all([
      db.profiles.put(profile),
      db.settings.put(DEFAULT_SETTINGS),
      db.vocabulary.put(vocabulary),
      db.lessons.put(lesson),
      db.exercises.put(exercise),
      db.attempts.bulkPut([previousAttempt, currentAttempt]),
      db.sessions.bulkPut(sessions),
      db.reviewStates.put({
        itemKey,
        status: "relearning",
        learningStep: 1,
        intervalDays: 1,
        easeBias: 0,
        dueAt: "2026-07-25T00:00:00.000Z",
        lastReviewedAt: NOW.toISOString(),
        firstLearnedAt: "2026-07-20T12:00:00.000Z",
        reviewCount: 2,
        lapseCount: 1,
        consecutiveSuccesses: 0,
        updatedAt: NOW.toISOString(),
      }),
      db.mastery.put({
        itemKey,
        recognition: 80,
        recall: 40,
        listening: 30,
        spelling: 30,
        context: 35,
        lastUpdatedAt: NOW.toISOString(),
      }),
      db.lessonProgress.put({
        lessonId: lesson.id,
        status: "completed",
        currentSectionIndex: lesson.sections.length - 1,
        completedAt: "2026-07-27T17:55:00.000Z",
        updatedAt: "2026-07-27T17:55:00.000Z",
      }),
    ]);

    const port = createDexieProgressPort(db, {
      now: () => NOW,
      timeZone: () => "Asia/Tokyo",
    });
    const snapshot = await port.load(7);

    expect(snapshot.period.endStudyDate).toBe("2026-07-27");
    expect(snapshot.daily.at(-1)).toEqual(
      expect.objectContaining({
        studyMinutes: 15,
        reviewCount: 1,
        newCount: 0,
        completedLessonCount: 1,
      }),
    );
    expect(snapshot.skills.find(({ skill }) => skill === "vocabulary")).toEqual(
      expect.objectContaining({ score: 0, previousScore: 100 }),
    );
    expect(snapshot.weakness.weakItems[0]).toEqual(
      expect.objectContaining({
        label: vocabulary.headword,
        path: `/vocabulary/${vocabulary.id}`,
      }),
    );
    expect(snapshot.weakness.recognitionRecallGaps[0]?.gap).toBe(40);
    expect(snapshot.stages[0]).toEqual(
      expect.objectContaining({
        completedLessonCount: 1,
        totalLessonCount: 1,
        completionRate: 100,
        isCurrentStage: true,
      }),
    );
  });
});
