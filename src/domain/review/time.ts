import {
  DEFAULT_STUDY_DAY_BOUNDARY,
  MILLISECONDS_PER_DAY,
  MILLISECONDS_PER_MINUTE,
  type ReviewStep,
} from "./constants";
import { ReviewDomainError } from "./errors";
import type { StudyDayBoundary } from "./types";

type DateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function assertValidDate(date: Date, label: string): void {
  if (!Number.isFinite(date.getTime())) {
    throw new ReviewDomainError(
      "INVALID_DATE",
      `${label}には有効な日時を指定してください。`,
    );
  }
}

export function parseIsoDate(value: string, label: string): Date {
  const parsed = new Date(value);
  assertValidDate(parsed, label);
  return parsed;
}

export function assertNow(now: Date): void {
  assertValidDate(now, "現在時刻");
}

function validateBoundary(boundary: StudyDayBoundary): Required<StudyDayBoundary> {
  const minute = boundary.minute ?? 0;
  if (
    !Number.isInteger(boundary.hour) ||
    boundary.hour < 0 ||
    boundary.hour > 23 ||
    !Number.isInteger(minute) ||
    minute < 0 ||
    minute > 59
  ) {
    throw new ReviewDomainError(
      "INVALID_NUMBER",
      "学習日の開始時刻は0〜23時、0〜59分で指定してください。",
    );
  }

  try {
    new Intl.DateTimeFormat("en-US", {
      timeZone: boundary.timeZone,
    }).format(new Date(0));
  } catch {
    throw new ReviewDomainError(
      "INVALID_TIME_ZONE",
      `タイムゾーン「${boundary.timeZone}」を解決できません。`,
    );
  }

  return {
    timeZone: boundary.timeZone,
    hour: boundary.hour,
    minute,
  };
}

function getZonedParts(date: Date, timeZone: string): DateParts {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = formatter.formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter(({ type }) => type !== "literal")
      .map(({ type, value }) => [type, Number(value)]),
  ) as Partial<DateParts>;

  if (
    values.year === undefined ||
    values.month === undefined ||
    values.day === undefined ||
    values.hour === undefined ||
    values.minute === undefined ||
    values.second === undefined
  ) {
    throw new ReviewDomainError(
      "INVALID_DATE",
      "タイムゾーンを考慮した日時の計算に失敗しました。",
    );
  }

  return values as DateParts;
}

/**
 * IANAタイムゾーン上の壁時計をUTC instantへ変換する。
 * オフセットを反復補正するため、夏時間をまたぐ日付にも対応する。
 */
function zonedDateTimeToUtc(parts: Omit<DateParts, "second">, timeZone: string): Date {
  const targetWallClock = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    0,
    0,
  );
  let candidate = targetWallClock;

  for (let iteration = 0; iteration < 4; iteration += 1) {
    const actual = getZonedParts(new Date(candidate), timeZone);
    const actualWallClock = Date.UTC(
      actual.year,
      actual.month - 1,
      actual.day,
      actual.hour,
      actual.minute,
      actual.second,
      0,
    );
    const correction = targetWallClock - actualWallClock;
    if (correction === 0) {
      break;
    }
    candidate += correction;
  }

  const result = new Date(candidate);
  assertValidDate(result, "復習予定時刻");
  return result;
}

/**
 * 現在日のローカル暦へ日数を足し、指定した学習日開始時刻へそろえる。
 * UTCミリ秒の単純加算ではないため、うるう日・月跨ぎ・夏時間を保てる。
 */
export function addCalendarStudyDays(
  now: Date,
  days: number,
  boundary: StudyDayBoundary = DEFAULT_STUDY_DAY_BOUNDARY,
): Date {
  assertNow(now);
  if (!Number.isFinite(days) || days < 0) {
    throw new ReviewDomainError(
      "INVALID_NUMBER",
      "復習間隔の日数には0以上の有限値を指定してください。",
    );
  }

  const validBoundary = validateBoundary(boundary);
  const current = getZonedParts(now, validBoundary.timeZone);
  const targetDate = new Date(
    Date.UTC(current.year, current.month - 1, current.day + Math.round(days)),
  );

  return zonedDateTimeToUtc(
    {
      year: targetDate.getUTCFullYear(),
      month: targetDate.getUTCMonth() + 1,
      day: targetDate.getUTCDate(),
      hour: validBoundary.hour,
      minute: validBoundary.minute,
    },
    validBoundary.timeZone,
  );
}

export function addStepDelay(now: Date, step: ReviewStep, multiplier = 1): Date {
  assertNow(now);
  const unitMilliseconds =
    step.kind === "minutes" ? MILLISECONDS_PER_MINUTE : MILLISECONDS_PER_DAY;
  return new Date(now.getTime() + step.value * multiplier * unitMilliseconds);
}

export function elapsedDaysSince(then: Date, now: Date): number {
  assertNow(then);
  assertNow(now);
  return Math.max(0, (now.getTime() - then.getTime()) / MILLISECONDS_PER_DAY);
}
