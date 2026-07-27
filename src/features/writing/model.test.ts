import { describe, expect, it } from "vitest";
import { pilotWritingPracticeSets } from "../../content/pilot/practiceWriting";
import {
  createWritingCommit,
  createWritingEditorSnapshot,
  describeWritingWordCount,
  restoreWritingEditorSnapshot,
  toWritingSubmissionRecord,
} from "./model";
import { parseWritingPracticeSet } from "./schemas";

const NOW = new Date("2026-07-27T01:00:00.000Z");

function prompt(type: "summary" | "opinion") {
  const set = pilotWritingPracticeSets.find((candidate) => candidate.type === type);
  if (set === undefined) {
    throw new Error(`${type}課題がありません。`);
  }
  return parseWritingPracticeSet(set);
}

describe("ライティングmodel", () => {
  it("下書きrecordとeditor状態を情報欠落なく往復する", () => {
    const source = createWritingEditorSnapshot({
      prompt: prompt("opinion"),
      now: NOW,
      submissionId: "submission-1",
    });
    const edited = {
      ...source,
      draft: "I support this idea because it helps our community.",
      opinionOutline: {
        ...source.opinionOutline,
        opinion: "I support it.",
        reason1: "It helps people.",
      },
      rubric: { ...source.rubric, content: true },
    };
    const record = toWritingSubmissionRecord(
      edited,
      new Date("2026-07-27T01:01:00.000Z"),
    );

    expect(restoreWritingEditorSnapshot(record)).toEqual({
      ...edited,
      updatedAt: "2026-07-27T01:01:00.000Z",
    });
  });

  it("語数の不足・目安内・超過を日本語で示す", () => {
    const summary = prompt("summary");
    expect(describeWritingWordCount(summary, "")).toContain("あと45語");
    expect(
      describeWritingWordCount(
        summary,
        Array.from({ length: 50 }, () => "word").join(" "),
      ),
    ).toContain("目安の45〜55語に入っています");
    expect(
      describeWritingWordCount(
        summary,
        Array.from({ length: 56 }, () => "word").join(" "),
      ),
    ).toContain("1語多い");
  });

  it("提出記録は自動正誤なし・score 0で構築する", () => {
    const writingPrompt = prompt("summary");
    const snapshot = {
      ...createWritingEditorSnapshot({
        prompt: writingPrompt,
        now: NOW,
        submissionId: "submission-1",
      }),
      draft: "The project reduces waste and helps local families.",
    };
    const commit = createWritingCommit({
      prompt: writingPrompt,
      snapshot,
      sessionId: "session-1",
      sessionStartedAt: NOW,
      submittedAt: new Date("2026-07-27T01:03:00.000Z"),
      studyDate: "2026-07-27",
    });

    expect(commit.attempt).toMatchObject({
      itemKey: `practice:${writingPrompt.id}`,
      mode: "writing-summary",
      correct: null,
      score: 0,
      responseTimeMs: 180_000,
    });
    expect(commit.session).toMatchObject({
      type: "practice",
      completedItemKeys: [`practice:${writingPrompt.id}`],
      interrupted: false,
    });
  });

  it("別課題のplan contextでは提出recordを作らない", () => {
    const writingPrompt = prompt("summary");
    const snapshot = createWritingEditorSnapshot({
      prompt: writingPrompt,
      now: NOW,
      submissionId: "submission-1",
    });
    expect(() =>
      createWritingCommit({
        prompt: writingPrompt,
        snapshot,
        sessionId: "session-1",
        sessionStartedAt: NOW,
        submittedAt: NOW,
        studyDate: "2026-07-27",
        planContext: {
          planDate: "2026-07-27",
          blockId: "practice:wrong",
          itemKey: "practice:wrong",
        },
      }),
    ).toThrow("日次プランの項目と作文課題が一致しません。");
  });
});
