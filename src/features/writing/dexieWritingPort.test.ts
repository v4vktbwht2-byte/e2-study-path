import { IDBKeyRange, indexedDB } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { pilotWritingPracticeSets } from "../../content/pilot/practiceWriting";
import { buildDailyPlan } from "../../domain/planning";
import { AppDb } from "../../infrastructure/db/appDb";
import {
  createWritingCommit,
  createWritingEditorSnapshot,
  toWritingSubmissionRecord,
} from "./model";
import { parseWritingPracticeSet } from "./schemas";
import {
  createDexieWritingLearningPort,
  WritingPersistenceError,
} from "./dexieWritingPort";

const STARTED_AT = new Date("2026-07-27T01:00:00.000Z");
const SUBMITTED_AT = new Date("2026-07-27T01:10:00.000Z");
let sequence = 0;
let dbName = "";
let db: AppDb;

function summaryPrompt() {
  const prompt = pilotWritingPracticeSets.find(
    (candidate) => candidate.type === "summary",
  );
  if (prompt === undefined) {
    throw new Error("要約課題がありません。");
  }
  return parseWritingPracticeSet(prompt);
}

function commitInput() {
  const prompt = summaryPrompt();
  const snapshot = {
    ...createWritingEditorSnapshot({
      prompt,
      now: STARTED_AT,
      submissionId: "writing-submission-1",
    }),
    draft: "Local shops share safe food, and volunteers manage it for residents.",
    rubric: {
      content: true,
      organization: true,
      vocabulary: false,
      grammar: true,
    },
  };
  return createWritingCommit({
    prompt,
    snapshot,
    sessionId: "writing-session-1",
    sessionStartedAt: STARTED_AT,
    submittedAt: SUBMITTED_AT,
    studyDate: "2026-07-27",
  });
}

beforeEach(() => {
  sequence += 1;
  dbName = `writing-port-${sequence}`;
  db = new AppDb(dbName, { indexedDB, IDBKeyRange });
});

afterEach(async () => {
  db.close();
  await db.delete();
});

describe("ライティングDexie port", () => {
  it("下書きをDB再接続後にも復元する", async () => {
    const prompt = summaryPrompt();
    const snapshot = {
      ...createWritingEditorSnapshot({
        prompt,
        now: STARTED_AT,
        submissionId: "draft-reload",
      }),
      draft: "This draft remains offline.",
      summaryMemo: "中心内容",
    };
    const draft = toWritingSubmissionRecord(snapshot, SUBMITTED_AT);
    await createDexieWritingLearningPort(db).saveDraft(draft);

    db.close();
    db = new AppDb(dbName, { indexedDB, IDBKeyRange });
    await expect(
      createDexieWritingLearningPort(db).listSubmissions(prompt.id),
    ).resolves.toEqual([draft]);
  });

  it("提出時に作文・未採点Attempt・完了Session・plan blockを一括保存する", async () => {
    const baseInput = commitInput();
    const itemKey = baseInput.attempt.itemKey;
    const plan = buildDailyPlan({
      studyDate: "2026-07-27",
      nowMs: STARTED_AT.getTime(),
      studyDayStartMs: new Date("2026-07-26T19:00:00.000Z").getTime(),
      targetMinutes: 15,
      mode: "standard",
      configuredNewItemLimit: 5,
      currentStage: 6,
      candidates: [
        {
          id: itemKey,
          kind: "skillPractice",
          skill: "writing",
          estimatedSeconds: 600,
        },
      ],
    });
    await db.dailyPlans.put(plan);
    const input = {
      ...baseInput,
      planContext: {
        planDate: plan.date,
        blockId: itemKey,
        itemKey,
      },
    };

    const result = await createDexieWritingLearningPort(db).commitSubmission(input);

    expect(result.attempt.correct).toBeNull();
    expect(result.dailyPlan?.completedBlockIds).toEqual([itemKey]);
    await expect(db.writingSubmissions.get(input.submission.id)).resolves.toEqual(
      input.submission,
    );
    await expect(db.attempts.get(input.attempt.id)).resolves.toEqual(input.attempt);
    await expect(db.sessions.get(input.session.id)).resolves.toEqual(input.session);
    expect((await db.dailyPlans.get(plan.date))?.blocks[0]?.status).toBe("completed");
  });

  it("plan不一致なら提出に必要な全更新をロールバックする", async () => {
    const input = commitInput();
    const draft = {
      ...input.submission,
      submittedAt: undefined,
      updatedAt: STARTED_AT.toISOString(),
    };
    await db.writingSubmissions.put(draft);
    const wrongItemKey = "practice:another-writing-prompt";
    const plan = buildDailyPlan({
      studyDate: "2026-07-27",
      nowMs: STARTED_AT.getTime(),
      studyDayStartMs: new Date("2026-07-26T19:00:00.000Z").getTime(),
      targetMinutes: 15,
      mode: "standard",
      configuredNewItemLimit: 5,
      currentStage: 6,
      candidates: [
        {
          id: wrongItemKey,
          kind: "skillPractice",
          skill: "writing",
          estimatedSeconds: 600,
        },
      ],
    });
    await db.dailyPlans.put(plan);

    await expect(
      createDexieWritingLearningPort(db).commitSubmission({
        ...input,
        planContext: {
          planDate: plan.date,
          blockId: wrongItemKey,
          itemKey: input.attempt.itemKey,
        },
      }),
    ).rejects.toMatchObject({
      code: "DAILY_PLAN_ITEM_MISMATCH",
    } satisfies Partial<WritingPersistenceError>);

    expect(await db.writingSubmissions.get(input.submission.id)).toEqual(draft);
    expect(await db.attempts.count()).toBe(0);
    expect(await db.sessions.count()).toBe(0);
    expect((await db.dailyPlans.get(plan.date))?.completedBlockIds).toEqual([]);
  });

  it("自由作文を正誤付きAttemptとして保存しない", async () => {
    const input = commitInput();
    const invalid = {
      ...input,
      attempt: {
        ...input.attempt,
        correct: true,
        score: 1,
      },
    } as unknown as typeof input;

    await expect(
      createDexieWritingLearningPort(db).commitSubmission(invalid),
    ).rejects.toMatchObject({
      code: "INVALID_ATTEMPT",
    } satisfies Partial<WritingPersistenceError>);
    expect(await db.writingSubmissions.count()).toBe(0);
  });

  it("提出済みレコードを遅れて完了したautosaveで上書きしない", async () => {
    const input = commitInput();
    const port = createDexieWritingLearningPort(db);
    await port.commitSubmission(input);

    await expect(
      port.saveDraft({
        ...input.submission,
        submittedAt: undefined,
        draft: "stale draft",
      }),
    ).rejects.toMatchObject({
      code: "DRAFT_ALREADY_SUBMITTED",
    } satisfies Partial<WritingPersistenceError>);
    expect((await db.writingSubmissions.get(input.submission.id))?.draft).toBe(
      input.submission.draft,
    );
  });
});
