import type { Attempt, StudySession } from "../../domain/models";
import {
  countWritingWords,
  EMPTY_OPINION_OUTLINE,
  EMPTY_WRITING_RUBRIC,
  evaluateWritingWordCount,
  hasOpinionOutlineContent,
  normalizeWritingRubric,
  type WritingRubricChecks,
} from "../../domain/writing";
import type {
  WritingCommitInput,
  WritingEditorSnapshot,
  WritingPlanContext,
  WritingPrompt,
  WritingSubmissionRecord,
} from "./types";

export function createWritingEditorSnapshot(input: {
  prompt: WritingPrompt;
  now: Date;
  submissionId: string;
}): WritingEditorSnapshot {
  const timestamp = input.now.toISOString();
  return {
    submissionId: input.submissionId,
    promptId: input.prompt.id,
    type: input.prompt.type,
    draft: "",
    summaryMemo: "",
    opinionOutline: { ...EMPTY_OPINION_OUTLINE },
    rubric: { ...EMPTY_WRITING_RUBRIC },
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function restoreWritingEditorSnapshot(
  submission: WritingSubmissionRecord,
): WritingEditorSnapshot {
  return {
    submissionId: submission.id,
    promptId: submission.promptId,
    type: submission.type,
    draft: submission.draft,
    summaryMemo: submission.summaryMemo,
    opinionOutline: { ...submission.opinionOutline },
    rubric: normalizeWritingRubric(submission.checklist),
    createdAt: submission.createdAt,
    updatedAt: submission.updatedAt,
  };
}

export function toWritingSubmissionRecord(
  snapshot: WritingEditorSnapshot,
  updatedAt: Date,
): WritingSubmissionRecord {
  return {
    id: snapshot.submissionId,
    promptId: snapshot.promptId,
    type: snapshot.type,
    draft: snapshot.draft,
    wordCount: countWritingWords(snapshot.draft),
    checklist: { ...snapshot.rubric },
    summaryMemo: snapshot.summaryMemo,
    opinionOutline: { ...snapshot.opinionOutline },
    createdAt: snapshot.createdAt,
    updatedAt: updatedAt.toISOString(),
  };
}

export function hasWritingDraftContent(snapshot: WritingEditorSnapshot): boolean {
  return (
    snapshot.draft.trim().length > 0 ||
    snapshot.summaryMemo.trim().length > 0 ||
    hasOpinionOutlineContent(snapshot.opinionOutline) ||
    Object.values(snapshot.rubric).some(Boolean)
  );
}

export function describeWritingWordCount(prompt: WritingPrompt, draft: string): string {
  const guide = evaluateWritingWordCount(prompt.type, draft);
  if (guide.status === "short") {
    return `現在${guide.count}語。目安の${guide.range.min}〜${guide.range.max}語まで、あと${guide.difference}語です。`;
  }
  if (guide.status === "long") {
    return `現在${guide.count}語。目安の${guide.range.min}〜${guide.range.max}語より${guide.difference}語多いです。`;
  }
  return `現在${guide.count}語。目安の${guide.range.min}〜${guide.range.max}語に入っています。`;
}

function responsePayload(input: {
  submission: WritingSubmissionRecord;
  rubric: WritingRubricChecks;
}) {
  return {
    draft: input.submission.draft,
    wordCount: input.submission.wordCount,
    rubric: input.rubric,
    summaryMemo: input.submission.summaryMemo,
    opinionOutline: input.submission.opinionOutline,
  };
}

export function createWritingCommit(input: {
  prompt: WritingPrompt;
  snapshot: WritingEditorSnapshot;
  sessionId: string;
  sessionStartedAt: Date;
  submittedAt: Date;
  studyDate: string;
  planContext?: WritingPlanContext;
}): WritingCommitInput {
  const itemKey = `practice:${input.prompt.id}`;
  if (input.planContext !== undefined && input.planContext.itemKey !== itemKey) {
    throw new Error("日次プランの項目と作文課題が一致しません。");
  }

  const saved = toWritingSubmissionRecord(input.snapshot, input.submittedAt);
  const submission = {
    ...saved,
    submittedAt: input.submittedAt.toISOString(),
  };
  const responseTimeMs = Math.max(
    0,
    input.submittedAt.getTime() - input.sessionStartedAt.getTime(),
  );
  const attempt: Attempt & { correct: null } = {
    id: `${submission.id}:attempt`,
    itemKey,
    sessionId: input.sessionId,
    createdAt: input.submittedAt.toISOString(),
    studyDate: input.studyDate,
    mode: `writing-${input.prompt.type}`,
    response: responsePayload({
      submission,
      rubric: input.snapshot.rubric,
    }),
    correct: null,
    score: 0,
    responseTimeMs,
    hintCount: 0,
  };
  const session: StudySession & { type: "practice"; endedAt: string } = {
    id: input.sessionId,
    type: "practice",
    startedAt: input.sessionStartedAt.toISOString(),
    endedAt: input.submittedAt.toISOString(),
    studyDate: input.studyDate,
    itemKeys: [itemKey],
    completedItemKeys: [itemKey],
    interrupted: false,
  };

  return {
    submission,
    attempt,
    session,
    ...(input.planContext === undefined ? {} : { planContext: input.planContext }),
  };
}
