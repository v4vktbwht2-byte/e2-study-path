import type {
  AppSettings,
  Attempt,
  DailyPlan,
  StudySession,
  WritingSubmission,
} from "../models";
import { mergeDailyPlanCompletions } from "../planning";
import { BackupError } from "./errors";

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stableValue);
  }
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, stableValue(child)]),
    );
  }
  return value;
}

export function recordsEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(stableValue(left)) === JSON.stringify(stableValue(right));
}

function compareDateTimes(left: string, right: string): number {
  const leftTime = Date.parse(left);
  const rightTime = Date.parse(right);
  if (!Number.isFinite(leftTime) || !Number.isFinite(rightTime)) {
    throw new BackupError("INVALID_SCHEMA", "バックアップ内の日時を比較できません。");
  }
  return leftTime - rightTime;
}

export function chooseNewer<T>(
  current: T | undefined,
  incoming: T,
  timestamp: (record: T) => string,
): T {
  if (current === undefined) {
    return incoming;
  }
  return compareDateTimes(timestamp(incoming), timestamp(current)) >= 0
    ? incoming
    : current;
}

export function mergeSettings(
  _current: AppSettings | undefined,
  incoming: AppSettings,
): AppSettings {
  return incoming;
}

export function assertAttemptCompatible(
  current: Attempt | undefined,
  incoming: Attempt,
): Attempt {
  if (current !== undefined && !recordsEqual(current, incoming)) {
    throw new BackupError(
      "ATTEMPT_CONFLICT",
      `回答履歴「${incoming.id}」は端末内データと内容が異なります。`,
    );
  }
  return current ?? incoming;
}

function appendUnique(
  values: readonly string[],
  additions: readonly string[],
): string[] {
  return [...new Set([...values, ...additions])];
}

export function mergeStudySession(
  current: StudySession | undefined,
  incoming: StudySession,
): StudySession {
  if (current === undefined) {
    return incoming;
  }
  if (
    current.type !== incoming.type ||
    current.studyDate !== incoming.studyDate ||
    compareDateTimes(current.startedAt, incoming.startedAt) !== 0
  ) {
    throw new BackupError(
      "INVALID_SCHEMA",
      `学習セッション「${incoming.id}」の識別情報が一致しません。`,
    );
  }
  const endedAt =
    current.endedAt === undefined
      ? incoming.endedAt
      : incoming.endedAt === undefined
        ? current.endedAt
        : compareDateTimes(current.endedAt, incoming.endedAt) >= 0
          ? current.endedAt
          : incoming.endedAt;
  return {
    ...current,
    ...incoming,
    ...(endedAt === undefined ? {} : { endedAt }),
    itemKeys: appendUnique(current.itemKeys, incoming.itemKeys),
    completedItemKeys: appendUnique(
      current.completedItemKeys,
      incoming.completedItemKeys,
    ),
    interrupted:
      endedAt === undefined ? current.interrupted && incoming.interrupted : false,
  };
}

export function mergeDailyPlan(
  current: DailyPlan | undefined,
  incoming: DailyPlan,
): DailyPlan {
  if (current === undefined) {
    return incoming;
  }
  return compareDateTimes(incoming.generatedAt, current.generatedAt) >= 0
    ? mergeDailyPlanCompletions(current, incoming)
    : mergeDailyPlanCompletions(incoming, current);
}

export function mergeWritingSubmission(
  current: WritingSubmission | undefined,
  incoming: WritingSubmission,
): WritingSubmission {
  if (current === undefined) {
    return incoming;
  }
  if (current.submittedAt !== undefined && incoming.submittedAt === undefined) {
    return current;
  }
  if (incoming.submittedAt !== undefined && current.submittedAt === undefined) {
    return incoming;
  }
  return chooseNewer(current, incoming, (record) => record.updatedAt);
}
