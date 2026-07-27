import type { Attempt, MasteryProfile } from "../models";
import type { ReviewState } from "../review";
import {
  PROGRESS_SKILLS,
  type DailyProgress,
  type LearningContinuity,
  type ProgressAggregateInput,
  type ProgressItemDescriptor,
  type ProgressPeriodDays,
  type ProgressSkill,
  type ProgressSnapshot,
  type SkillTrend,
  type SkillTrendDirection,
  type StageProgress,
  type WeaknessSummary,
} from "./types";

const DAY_MS = 24 * 60 * 60 * 1_000;
const SLOW_RESPONSE_THRESHOLD_MS = 8_000;
const RECOGNITION_RECALL_GAP_THRESHOLD = 15;
const MAX_WEAKNESS_ITEMS = 5;

const SKILL_LABELS: Readonly<Record<ProgressSkill, string>> = {
  vocabulary: "語彙",
  grammar: "文法",
  reading: "読解",
  listening: "聞き取り",
  writing: "作文",
  speaking: "会話",
};

interface ItemAttemptStats {
  readonly itemKey: string;
  readonly attempts: readonly Attempt[];
  readonly assessedAttempts: readonly Attempt[];
  readonly errorRate: number;
  readonly averageResponseTimeMs: number;
}

function parseStudyDate(studyDate: string): number {
  const matched = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(studyDate);
  if (matched === null) {
    throw new Error(`学習日 ${studyDate} の形式が正しくありません。`);
  }
  const year = Number(matched[1]);
  const month = Number(matched[2]);
  const day = Number(matched[3]);
  const time = Date.UTC(year, month - 1, day);
  const normalized = new Date(time).toISOString().slice(0, 10);
  if (normalized !== studyDate) {
    throw new Error(`学習日 ${studyDate} は存在しない日付です。`);
  }
  return time;
}

export function shiftStudyDate(studyDate: string, days: number): string {
  return new Date(parseStudyDate(studyDate) + days * DAY_MS).toISOString().slice(0, 10);
}

export function buildStudyDateRange(
  endStudyDate: string,
  days: ProgressPeriodDays,
): string[] {
  return Array.from({ length: days }, (_, index) =>
    shiftStudyDate(endStudyDate, index - days + 1),
  );
}

function average(values: readonly number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function clampScore(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function rubricScore(response: unknown): number | undefined {
  if (typeof response !== "object" || response === null || Array.isArray(response)) {
    return undefined;
  }
  const rubric = (response as Record<string, unknown>).rubric;
  if (typeof rubric !== "object" || rubric === null || Array.isArray(rubric)) {
    return undefined;
  }
  const checks = Object.values(rubric).filter(
    (value): value is boolean => typeof value === "boolean",
  );
  if (checks.length === 0) {
    return undefined;
  }
  return checks.filter(Boolean).length / checks.length;
}

function attemptScore(attempt: Attempt): number | undefined {
  if (attempt.mode.startsWith("writing-")) {
    const score = rubricScore(attempt.response);
    return score === undefined ? undefined : clampScore(score);
  }
  if (attempt.correct === null && attempt.mode.startsWith("listening:")) {
    return undefined;
  }
  if (!Number.isFinite(attempt.score)) {
    return undefined;
  }
  return clampScore(attempt.score);
}

function directModeSkills(mode: string): ProgressSkill[] {
  if (mode.startsWith("mock:")) {
    const skill = mode.slice("mock:".length);
    return skill === "vocabulary" ||
      skill === "grammar" ||
      skill === "reading" ||
      skill === "listening" ||
      skill === "writing" ||
      skill === "speaking"
      ? [skill]
      : [];
  }
  if (mode === "readingQuestion") {
    return ["reading"];
  }
  if (mode.startsWith("listening:")) {
    return ["listening"];
  }
  if (mode.startsWith("writing-")) {
    return ["writing"];
  }
  if (mode === "speakingPractice") {
    return ["speaking"];
  }
  return [];
}

function resolveAttemptSkills(
  attempt: Attempt,
  exerciseSkills: ReadonlyMap<string, readonly ProgressSkill[]>,
  itemSkills: ReadonlyMap<string, readonly ProgressSkill[]>,
): readonly ProgressSkill[] {
  const fromMode = directModeSkills(attempt.mode);
  if (fromMode.length > 0 && attempt.mode.startsWith("mock:")) {
    return fromMode;
  }
  const fromExercise =
    attempt.exerciseId === undefined
      ? undefined
      : exerciseSkills.get(attempt.exerciseId);
  if (fromExercise !== undefined && fromExercise.length > 0) {
    return fromExercise;
  }
  const fromItem = itemSkills.get(attempt.itemKey);
  if (fromItem !== undefined && fromItem.length > 0) {
    return fromItem;
  }
  return fromMode;
}

function scoreForSkill(
  skill: ProgressSkill,
  attempts: readonly Attempt[],
  exerciseSkills: ReadonlyMap<string, readonly ProgressSkill[]>,
  itemSkills: ReadonlyMap<string, readonly ProgressSkill[]>,
): { score: number | null; attemptCount: number } {
  const scores = attempts.flatMap((attempt) => {
    if (!resolveAttemptSkills(attempt, exerciseSkills, itemSkills).includes(skill)) {
      return [];
    }
    const score = attemptScore(attempt);
    return score === undefined ? [] : [score];
  });
  const mean = average(scores);
  return {
    score: mean === null ? null : Math.round(mean * 100),
    attemptCount: scores.length,
  };
}

function trendDirection(
  score: number | null,
  previousScore: number | null,
): SkillTrendDirection {
  if (score === null) {
    return "noData";
  }
  if (previousScore === null) {
    return "new";
  }
  const delta = score - previousScore;
  if (delta >= 5) {
    return "improving";
  }
  if (delta <= -5) {
    return "needsPractice";
  }
  return "steady";
}

function skillSummary(
  skill: ProgressSkill,
  score: number | null,
  previousScore: number | null,
  direction: SkillTrendDirection,
  attemptCount: number,
): string {
  const label = SKILL_LABELS[skill];
  if (score === null) {
    return `${label}は、まだ採点できる記録がありません。`;
  }
  if (previousScore === null) {
    return `${label}は${attemptCount}問の記録があり、今回の目安は${score}%です。`;
  }
  const delta = score - previousScore;
  if (direction === "improving") {
    return `${label}は前の期間より${delta}ポイント伸びています。`;
  }
  if (direction === "needsPractice") {
    return `${label}は前の期間より${Math.abs(delta)}ポイント低めです。短い復習から整えられます。`;
  }
  return `${label}は前の期間とほぼ同じ${score}%です。`;
}

function buildSkillTrends(
  input: ProgressAggregateInput,
  startStudyDate: string,
  previousStartStudyDate: string,
  previousEndStudyDate: string,
): SkillTrend[] {
  const exerciseSkills = new Map(
    input.exercises.map(({ exerciseId, skills }) => [exerciseId, skills] as const),
  );
  const itemSkills = new Map(
    input.items.map(({ itemKey, skills }) => [itemKey, skills] as const),
  );
  const currentAttempts = input.attempts.filter(
    ({ studyDate }) => studyDate >= startStudyDate && studyDate <= input.endStudyDate,
  );
  const previousAttempts = input.attempts.filter(
    ({ studyDate }) =>
      studyDate >= previousStartStudyDate && studyDate <= previousEndStudyDate,
  );

  return PROGRESS_SKILLS.map((skill) => {
    const current = scoreForSkill(skill, currentAttempts, exerciseSkills, itemSkills);
    const previous = scoreForSkill(skill, previousAttempts, exerciseSkills, itemSkills);
    const direction = trendDirection(current.score, previous.score);
    return {
      skill,
      score: current.score,
      previousScore: previous.score,
      delta:
        current.score === null || previous.score === null
          ? null
          : current.score - previous.score,
      attemptCount: current.attemptCount,
      direction,
      summary: skillSummary(
        skill,
        current.score,
        previous.score,
        direction,
        current.attemptCount,
      ),
    };
  });
}

function durationMs(startedAt: string, endedAt: string | undefined): number {
  if (endedAt === undefined) {
    return 0;
  }
  const start = Date.parse(startedAt);
  const end = Date.parse(endedAt);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return 0;
  }
  // ブラウザーを閉じ忘れたsessionで記録全体が極端にならないよう、1sessionを4時間までにする。
  return Math.min(end - start, 4 * 60 * 60 * 1_000);
}

function firstStudyDateByItem(attempts: readonly Attempt[]): Map<string, string> {
  const result = new Map<string, string>();
  for (const attempt of attempts) {
    const current = result.get(attempt.itemKey);
    if (current === undefined || attempt.studyDate < current) {
      result.set(attempt.itemKey, attempt.studyDate);
    }
  }
  return result;
}

function buildDailyProgress(
  input: ProgressAggregateInput,
  dates: readonly string[],
): DailyProgress[] {
  const firstStudyDates = firstStudyDateByItem(input.attempts);
  const attemptsByDate = new Map<string, Attempt[]>();
  for (const attempt of input.attempts) {
    const values = attemptsByDate.get(attempt.studyDate) ?? [];
    values.push(attempt);
    attemptsByDate.set(attempt.studyDate, values);
  }
  const sessionsByDate = new Map<string, typeof input.sessions>();
  for (const session of input.sessions) {
    const values = sessionsByDate.get(session.studyDate) ?? [];
    sessionsByDate.set(session.studyDate, [...values, session]);
  }
  const lessonCompletionsByDate = new Map<string, Set<string>>();
  for (const completion of input.lessonCompletions) {
    const lessonIds =
      lessonCompletionsByDate.get(completion.studyDate) ?? new Set<string>();
    lessonIds.add(completion.lessonId);
    lessonCompletionsByDate.set(completion.studyDate, lessonIds);
  }

  return dates.map((studyDate) => {
    const dayAttempts = attemptsByDate.get(studyDate) ?? [];
    const itemKeys = new Set(dayAttempts.map(({ itemKey }) => itemKey));
    const newItemKeys = new Set<string>();
    const reviewItemKeys = new Set<string>();
    for (const itemKey of itemKeys) {
      if (firstStudyDates.get(itemKey) === studyDate) {
        newItemKeys.add(itemKey);
      } else {
        reviewItemKeys.add(itemKey);
      }
    }
    const studyMilliseconds = (sessionsByDate.get(studyDate) ?? []).reduce(
      (total, session) => total + durationMs(session.startedAt, session.endedAt),
      0,
    );
    const completedLessonCount = lessonCompletionsByDate.get(studyDate)?.size ?? 0;
    const studyMinutes = Math.round(studyMilliseconds / 60_000);
    return {
      studyDate,
      studyMinutes,
      reviewCount: reviewItemKeys.size,
      newCount: newItemKeys.size,
      completedLessonCount,
      active: studyMinutes > 0 || dayAttempts.length > 0 || completedLessonCount > 0,
    };
  });
}

function itemStats(attempts: readonly Attempt[]): ItemAttemptStats[] {
  const attemptsByItem = new Map<string, Attempt[]>();
  for (const attempt of attempts) {
    const values = attemptsByItem.get(attempt.itemKey) ?? [];
    values.push(attempt);
    attemptsByItem.set(attempt.itemKey, values);
  }
  return [...attemptsByItem].map(([itemKey, values]) => {
    const assessedAttempts = values.filter(
      (attempt): attempt is Attempt & { correct: boolean } => attempt.correct !== null,
    );
    const incorrectCount = assessedAttempts.filter(({ correct }) => !correct).length;
    return {
      itemKey,
      attempts: values,
      assessedAttempts,
      errorRate:
        assessedAttempts.length === 0 ? 0 : incorrectCount / assessedAttempts.length,
      averageResponseTimeMs:
        assessedAttempts.length === 0
          ? 0
          : Math.round(
              assessedAttempts.reduce(
                (total, { responseTimeMs }) => total + Math.max(0, responseTimeMs),
                0,
              ) / assessedAttempts.length,
            ),
    };
  });
}

function itemPresentation(
  itemKey: string,
  descriptors: ReadonlyMap<string, ProgressItemDescriptor>,
): { label: string; path?: string } {
  const item = descriptors.get(itemKey);
  if (item === undefined) {
    return { label: `学習項目（${itemKey}）` };
  }
  return {
    label: item.label,
    ...(item.path === undefined ? {} : { path: item.path }),
  };
}

function overdueDays(state: ReviewState | undefined, now: Date): number {
  if (state === undefined || state.status === "new" || state.status === "suspended") {
    return 0;
  }
  const dueAt = Date.parse(state.dueAt);
  if (!Number.isFinite(dueAt) || dueAt >= now.getTime()) {
    return 0;
  }
  return Math.max(1, Math.floor((now.getTime() - dueAt) / DAY_MS));
}

function recognitionRecallGaps(
  profiles: readonly MasteryProfile[],
  descriptors: ReadonlyMap<string, ProgressItemDescriptor>,
) {
  return profiles
    .map((profile) => ({
      profile,
      gap: Math.round(profile.recognition - profile.recall),
    }))
    .filter(({ gap }) => gap >= RECOGNITION_RECALL_GAP_THRESHOLD)
    .sort(
      (left, right) =>
        right.gap - left.gap ||
        left.profile.itemKey.localeCompare(right.profile.itemKey),
    )
    .slice(0, MAX_WEAKNESS_ITEMS)
    .map(({ profile, gap }) => ({
      itemKey: profile.itemKey,
      ...itemPresentation(profile.itemKey, descriptors),
      recognition: Math.round(profile.recognition),
      recall: Math.round(profile.recall),
      gap,
    }));
}

function buildWeaknessSummary(
  input: ProgressAggregateInput,
  startStudyDate: string,
): WeaknessSummary {
  const descriptors = new Map(input.items.map((item) => [item.itemKey, item] as const));
  const reviewByItem = new Map(
    input.reviewStates.map((state) => [state.itemKey, state] as const),
  );
  const recentAttempts = input.attempts.filter(
    ({ studyDate }) => studyDate >= startStudyDate && studyDate <= input.endStudyDate,
  );
  const stats = itemStats(recentAttempts);
  const statsByItem = new Map(stats.map((stat) => [stat.itemKey, stat] as const));
  const weakCandidateItemKeys = new Set([
    ...statsByItem.keys(),
    ...input.reviewStates
      .filter((state) => state.lapseCount > 0 || overdueDays(state, input.now) > 0)
      .map(({ itemKey }) => itemKey),
  ]);

  const weakItems = [...weakCandidateItemKeys]
    .map((itemKey) => {
      const stat = statsByItem.get(itemKey);
      const errorRate = stat?.errorRate ?? 0;
      const averageResponseTimeMs = stat?.averageResponseTimeMs ?? 0;
      const review = reviewByItem.get(itemKey);
      const lapseCount = review?.lapseCount ?? 0;
      const itemOverdueDays = overdueDays(review, input.now);
      const reasons: string[] = [];
      if (errorRate >= 0.3) {
        reasons.push(`誤答率${Math.round(errorRate * 100)}%`);
      }
      if (averageResponseTimeMs >= SLOW_RESPONSE_THRESHOLD_MS) {
        reasons.push(`平均${Math.round(averageResponseTimeMs / 1_000)}秒`);
      }
      if (lapseCount > 0) {
        reasons.push(`再学習${lapseCount}回`);
      }
      if (itemOverdueDays > 0) {
        reasons.push(`${itemOverdueDays}日期限超過`);
      }
      const score = Math.round(
        errorRate * 45 +
          Math.min(averageResponseTimeMs / 15_000, 1) * 15 +
          Math.min(lapseCount / 3, 1) * 25 +
          (itemOverdueDays > 0 ? 15 : 0),
      );
      return {
        itemKey,
        ...itemPresentation(itemKey, descriptors),
        score,
        errorRate: Math.round(errorRate * 100),
        averageResponseTimeMs,
        lapseCount,
        overdueDays: itemOverdueDays,
        reasons,
      };
    })
    .filter(({ score, reasons }) => score > 0 && reasons.length > 0)
    .sort(
      (left, right) =>
        right.score - left.score || left.itemKey.localeCompare(right.itemKey),
    )
    .slice(0, MAX_WEAKNESS_ITEMS);

  const lapses = input.reviewStates
    .filter(({ lapseCount }) => lapseCount > 0)
    .sort(
      (left, right) =>
        right.lapseCount - left.lapseCount || left.itemKey.localeCompare(right.itemKey),
    )
    .slice(0, MAX_WEAKNESS_ITEMS)
    .map((state) => ({
      itemKey: state.itemKey,
      ...itemPresentation(state.itemKey, descriptors),
      lapseCount: state.lapseCount,
      ...(state.lastReviewedAt === undefined
        ? {}
        : { lastReviewedAt: state.lastReviewedAt }),
    }));

  const slowResponses = stats
    .filter(
      ({ assessedAttempts, averageResponseTimeMs }) =>
        assessedAttempts.length > 0 &&
        averageResponseTimeMs >= SLOW_RESPONSE_THRESHOLD_MS,
    )
    .sort(
      (left, right) =>
        right.averageResponseTimeMs - left.averageResponseTimeMs ||
        left.itemKey.localeCompare(right.itemKey),
    )
    .slice(0, MAX_WEAKNESS_ITEMS)
    .map((stat) => ({
      itemKey: stat.itemKey,
      ...itemPresentation(stat.itemKey, descriptors),
      averageResponseTimeMs: stat.averageResponseTimeMs,
      attemptCount: stat.assessedAttempts.length,
    }));

  return {
    weakItems,
    recognitionRecallGaps: recognitionRecallGaps(input.masteryProfiles, descriptors),
    lapses,
    slowResponses,
  };
}

function buildStageProgress(input: ProgressAggregateInput): StageProgress[] {
  const progressByLesson = new Map(
    input.lessonProgress.map((progress) => [progress.lessonId, progress] as const),
  );
  return Array.from({ length: 7 }, (_, stage) => {
    const stageLessons = input.lessons.filter((lesson) => lesson.stage === stage);
    const completedLessonCount = stageLessons.filter((lesson) => {
      const status = progressByLesson.get(lesson.lessonId)?.status;
      return status === "completed" || status === "skipped";
    }).length;
    const totalLessonCount = stageLessons.length;
    return {
      stage,
      completedLessonCount,
      totalLessonCount,
      completionRate:
        totalLessonCount === 0
          ? 0
          : Math.round((completedLessonCount / totalLessonCount) * 100),
      isCurrentStage:
        stage === Math.min(6, Math.max(0, Math.round(input.currentStage))),
    };
  });
}

function longestStreak(activeDates: readonly string[]): number {
  let longest = 0;
  let current = 0;
  let previous: string | undefined;
  for (const studyDate of activeDates) {
    current =
      previous !== undefined && shiftStudyDate(previous, 1) === studyDate
        ? current + 1
        : 1;
    longest = Math.max(longest, current);
    previous = studyDate;
  }
  return longest;
}

function buildContinuity(
  input: ProgressAggregateInput,
  daily: readonly DailyProgress[],
): LearningContinuity {
  const activeDateSet = new Set<string>();
  for (const attempt of input.attempts) {
    activeDateSet.add(attempt.studyDate);
  }
  for (const session of input.sessions) {
    if (
      durationMs(session.startedAt, session.endedAt) > 0 ||
      session.completedItemKeys.length > 0
    ) {
      activeDateSet.add(session.studyDate);
    }
  }
  for (const completion of input.lessonCompletions) {
    activeDateSet.add(completion.studyDate);
  }
  const activeDates = [...activeDateSet].sort();
  const activeToday = daily.at(-1)?.active === true;
  const yesterday = shiftStudyDate(input.endStudyDate, -1);
  const streakEnd = activeToday
    ? input.endStudyDate
    : activeDateSet.has(yesterday)
      ? yesterday
      : undefined;
  let currentStreak = 0;
  if (streakEnd !== undefined) {
    let cursor = streakEnd;
    while (activeDateSet.has(cursor)) {
      currentStreak += 1;
      cursor = shiftStudyDate(cursor, -1);
    }
  }
  let restartCount = 0;
  for (let index = 1; index < activeDates.length; index += 1) {
    const previous = activeDates[index - 1];
    const current = activeDates[index];
    if (
      previous !== undefined &&
      current !== undefined &&
      shiftStudyDate(previous, 1) !== current
    ) {
      restartCount += 1;
    }
  }
  const previousActiveDate = activeDates
    .filter((studyDate) => studyDate < input.endStudyDate)
    .at(-1);
  const isRestartDay =
    activeToday &&
    previousActiveDate !== undefined &&
    shiftStudyDate(previousActiveDate, 1) !== input.endStudyDate;

  let message: string;
  if (isRestartDay) {
    message = "今日また学習を再開できました。戻ってきた一歩を大切にしましょう。";
  } else if (currentStreak >= 2) {
    message = `${currentStreak}日続けて取り組めています。無理のないペースを保てています。`;
  } else if (activeToday) {
    message = "今日の学習を記録できました。この一歩が次につながります。";
  } else if (currentStreak === 1) {
    message = "昨日の学習が記録されています。今日も短い学習から続けられます。";
  } else if (activeDates.length === 0) {
    message = "最初の記録はこれからです。1問や1分から始められます。";
  } else {
    message = "いつでも今日から再開できます。これまでの学習記録も残っています。";
  }

  return {
    currentStreak,
    longestStreak: longestStreak(activeDates),
    totalActiveDays: activeDates.length,
    restartCount,
    isRestartDay,
    ...(activeDates.at(-1) === undefined
      ? {}
      : { latestStudyDate: activeDates.at(-1) }),
    message,
  };
}

function buildTextSummary(
  days: ProgressPeriodDays,
  daily: readonly DailyProgress[],
  totals: ProgressSnapshot["totals"],
): string {
  if (totals.activeDays === 0) {
    return `${days}日間の学習記録はまだありません。短い学習を終えると、ここに日別の変化が表示されます。`;
  }
  const busiest = [...daily].sort(
    (left, right) =>
      right.studyMinutes - left.studyMinutes ||
      right.studyDate.localeCompare(left.studyDate),
  )[0];
  const busiestText =
    busiest === undefined || busiest.studyMinutes === 0
      ? ""
      : ` 最も長く学習した日は${busiest.studyDate}の${busiest.studyMinutes}分です。`;
  return `${days}日間で${totals.activeDays}日、合計${totals.studyMinutes}分学習しました。復習${totals.reviewCount}項目、新規${totals.newCount}項目、完了レッスン${totals.completedLessonCount}件です。${busiestText}`.trim();
}

export function aggregateProgress(input: ProgressAggregateInput): ProgressSnapshot {
  if (Number.isNaN(input.now.getTime())) {
    throw new Error("進捗集計の基準時刻が正しくありません。");
  }
  const dates = buildStudyDateRange(input.endStudyDate, input.periodDays);
  const startStudyDate = dates[0];
  if (startStudyDate === undefined) {
    throw new Error("進捗集計の期間を作成できませんでした。");
  }
  const previousEndStudyDate = shiftStudyDate(startStudyDate, -1);
  const previousStartStudyDate = shiftStudyDate(
    previousEndStudyDate,
    -input.periodDays + 1,
  );
  const daily = buildDailyProgress(input, dates);
  const totals = {
    studyMinutes: daily.reduce((total, { studyMinutes }) => total + studyMinutes, 0),
    reviewCount: daily.reduce((total, { reviewCount }) => total + reviewCount, 0),
    newCount: daily.reduce((total, { newCount }) => total + newCount, 0),
    completedLessonCount: daily.reduce(
      (total, { completedLessonCount }) => total + completedLessonCount,
      0,
    ),
    activeDays: daily.filter(({ active }) => active).length,
  };
  return {
    period: {
      days: input.periodDays,
      startStudyDate,
      endStudyDate: input.endStudyDate,
    },
    daily,
    totals,
    skills: buildSkillTrends(
      input,
      startStudyDate,
      previousStartStudyDate,
      previousEndStudyDate,
    ),
    weakness: buildWeaknessSummary(input, startStudyDate),
    stages: buildStageProgress(input),
    continuity: buildContinuity(input, daily),
    textSummary: buildTextSummary(input.periodDays, daily, totals),
    hasActivity: totals.activeDays > 0,
  };
}
