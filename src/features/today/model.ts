import { buildCourseMap } from "../course";
import {
  buildDailyPlan,
  DAILY_PLAN_MODES,
  type CompletedDailyPlanBlock,
  type CurriculumStage,
  type DailyPlan,
  type DailyPlanBlock,
  type DailyPlanCandidate,
  type DailyPlanMode,
  type LearningSkill,
} from "../../domain/planning";
import { rankReviewQueue } from "../../domain/review";
import { extractWeakWords, type WeakWordCandidate } from "../../domain/vocabulary";
import type { Attempt, MasteryProfile } from "../../domain/models";
import type { PracticeSet } from "../../infrastructure/content/schemas";
import type {
  TodayBlockAction,
  TodayBlockPresentation,
  TodayCompletionSummary,
  TodayDataSnapshot,
  TodayPlanPreview,
  TodaySource,
} from "./types";

const REVIEW_RECOGNITION_SECONDS = 10;
const REVIEW_RECALL_SECONDS = 20;
const NEW_VOCABULARY_SECONDS = 40;
const MINIMUM_LESSON_SECONDS = 60;

const MODE_LABELS: Readonly<Record<DailyPlanMode, string>> = {
  light: "軽め",
  standard: "標準",
  thorough: "しっかり",
  all: "すべて",
};

const SKILL_LABELS: Readonly<Record<LearningSkill, string>> = {
  vocabulary: "単語",
  grammar: "文法",
  reading: "読解",
  listening: "リスニング",
  writing: "ライティング",
  speaking: "スピーキング",
};

function normalizeStage(value: number): CurriculumStage {
  return Math.min(6, Math.max(0, Math.round(value))) as CurriculumStage;
}

function isVocabularyItemKey(itemKey: string): boolean {
  return itemKey.startsWith("vocab:");
}

function vocabularyIdFromItemKey(itemKey: string): string {
  return itemKey.slice("vocab:".length);
}

function lessonIdFromItemKey(itemKey: string): string | undefined {
  return itemKey.startsWith("lesson:") ? itemKey.slice("lesson:".length) : undefined;
}

function practiceSetIdFromItemKey(itemKey: string): string | undefined {
  return itemKey.startsWith("practice:")
    ? itemKey.slice("practice:".length)
    : undefined;
}

function estimateReviewSeconds(attempts: readonly Attempt[]): number {
  const latest = [...attempts].sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt),
  )[0];
  if (latest === undefined) {
    return REVIEW_RECALL_SECONDS;
  }
  return /recognition|choice/iu.test(latest.mode)
    ? REVIEW_RECOGNITION_SECONDS
    : REVIEW_RECALL_SECONDS;
}

function toWeakAttempt(attempt: Attempt) {
  return {
    attemptedAt: attempt.createdAt,
    correct: attempt.correct === true,
    responseSpeed:
      attempt.responseTimeMs >= 8_000
        ? ("slow" as const)
        : attempt.responseTimeMs <= 2_500
          ? ("fast" as const)
          : ("normal" as const),
    ...(attempt.confidence === undefined ? {} : { confidence: attempt.confidence }),
    ...(attempt.confusedWithItemKey === undefined
      ? {}
      : { confusedWithItemKey: attempt.confusedWithItemKey }),
  };
}

function attemptSkill(attempt: Attempt): LearningSkill {
  if (/listen|dictation|audio/iu.test(attempt.mode)) {
    return "listening";
  }
  if (/writing|summary|opinion/iu.test(attempt.mode)) {
    return "writing";
  }
  if (/speaking|speech/iu.test(attempt.mode)) {
    return "speaking";
  }
  if (/reading/iu.test(attempt.mode)) {
    return "reading";
  }
  if (/grammar|cloze|sentence/iu.test(attempt.mode)) {
    return "grammar";
  }
  return "vocabulary";
}

function rankWeakSkills(attempts: readonly Attempt[]): LearningSkill[] {
  const scores = new Map<LearningSkill, number>();
  for (const attempt of attempts) {
    if (attempt.correct === true && attempt.confidence !== "low") {
      continue;
    }
    const skill = attemptSkill(attempt);
    const weight = attempt.correct === false ? 2 : 1;
    scores.set(skill, (scores.get(skill) ?? 0) + weight);
  }
  return [...scores]
    .sort(
      ([leftSkill, leftScore], [rightSkill, rightScore]) =>
        rightScore - leftScore || leftSkill.localeCompare(rightSkill),
    )
    .map(([skill]) => skill);
}

function practiceSetSkill(
  practiceSet: PracticeSet,
  weakSkills: readonly LearningSkill[],
): LearningSkill {
  switch (practiceSet.type) {
    case "reading":
      return "reading";
    case "listening":
      return "listening";
    case "summary":
    case "opinion":
      return "writing";
    case "speaking":
      return "speaking";
    case "mock":
      return weakSkills[0] ?? "reading";
  }
}

function buildWeakCandidates(input: {
  snapshot: TodayDataSnapshot;
  now: Date;
  blockedItemKeys: ReadonlySet<string>;
  suspendedItemKeys: ReadonlySet<string>;
  attemptsByItemKey: ReadonlyMap<string, readonly Attempt[]>;
  masteryByItemKey: ReadonlyMap<string, MasteryProfile>;
}): DailyPlanCandidate[] {
  const reviewByItemKey = new Map(
    input.snapshot.reviewStates.map((state) => [state.itemKey, state]),
  );
  const weakInputs: WeakWordCandidate[] = input.snapshot.vocabulary.flatMap((item) => {
    const itemKey = `vocab:${item.id}`;
    const reviewState = reviewByItemKey.get(itemKey);
    const mastery = input.masteryByItemKey.get(itemKey);
    if (
      reviewState === undefined ||
      mastery === undefined ||
      input.blockedItemKeys.has(itemKey) ||
      input.suspendedItemKeys.has(itemKey)
    ) {
      return [];
    }
    return [
      {
        itemKey,
        reviewState,
        mastery,
        recentAttempts: (input.attemptsByItemKey.get(itemKey) ?? []).map(toWeakAttempt),
      },
    ];
  });

  return extractWeakWords(weakInputs, input.now).map((weak) => ({
    id: weak.itemKey,
    kind: "weak",
    estimatedSeconds: REVIEW_RECALL_SECONDS,
    priorityScore: weak.score,
    skill: "vocabulary",
  }));
}

function buildCurrentLessonCandidate(
  snapshot: TodayDataSnapshot,
): DailyPlanCandidate | undefined {
  const profile = snapshot.profile;
  if (profile === undefined || snapshot.lessons.length === 0) {
    return undefined;
  }
  const progressByLessonId = new Map(
    snapshot.lessonProgress.map((progress) => [progress.lessonId, progress]),
  );
  const inProgress = [...snapshot.lessons]
    .filter((lesson) => progressByLessonId.get(lesson.id)?.status === "inProgress")
    .sort(
      (left, right) =>
        left.stage - right.stage ||
        left.order - right.order ||
        left.id.localeCompare(right.id),
    )[0];
  const courseMap = buildCourseMap({
    lessons: snapshot.lessons,
    progressByLessonId,
    currentStage: normalizeStage(profile.selectedStage),
    recommendedStage: normalizeStage(profile.recommendedStage),
  });
  const lesson = inProgress ?? courseMap.recommendedNextLesson?.lesson;
  if (lesson === undefined) {
    return undefined;
  }
  const sectionIndex = progressByLessonId.get(lesson.id)?.currentSectionIndex ?? 0;
  const remainingSeconds = estimateLessonSeconds(
    lesson,
    snapshot,
    Math.max(0, sectionIndex),
  );
  return {
    id: `lesson:${lesson.id}`,
    kind: "currentLesson",
    estimatedSeconds: Math.max(MINIMUM_LESSON_SECONDS, remainingSeconds),
    skill: "grammar",
    priorityScore: inProgress === undefined ? 0 : 100,
  };
}

function estimateLessonSeconds(
  lesson: TodayDataSnapshot["lessons"][number],
  snapshot: TodayDataSnapshot,
  startSectionIndex = 0,
): number {
  const exerciseById = new Map(
    snapshot.exercises.map((exercise) => [exercise.id, exercise]),
  );
  return lesson.sections.slice(startSectionIndex).reduce((total, section) => {
    const exerciseIds = section.exerciseIds ?? [];
    const exercises = exerciseIds.flatMap((id) => {
      const exercise = exerciseById.get(id);
      return exercise === undefined ? [] : [exercise];
    });
    const sectionSeconds =
      exerciseIds.length > 0 && exercises.length === exerciseIds.length
        ? exercises.reduce(
            (subtotal, exercise) => subtotal + exercise.estimatedSeconds,
            0,
          )
        : Math.max(0, section.estimatedMinutes * 60);
    return total + sectionSeconds;
  }, 0);
}

/**
 * 永続データを日次プランdomainへ渡す候補へ変換する。
 * 同一itemKeyは最も優先度の高い区分へ一度だけ入り、停止中項目は除外する。
 */
export function buildTodaySource(input: {
  snapshot: TodayDataSnapshot;
  now: Date;
  studyDate: string;
  studyDayStartMs: number;
}): TodaySource {
  const { snapshot, now } = input;
  const profile = snapshot.profile;
  const currentStage = normalizeStage(profile?.selectedStage ?? 0);
  const vocabularyIds = new Set(snapshot.vocabulary.map((item) => item.id));
  const lessonById = new Map(snapshot.lessons.map((lesson) => [lesson.id, lesson]));
  const userStateByItemKey = new Map(
    snapshot.vocabularyUserStates.map((state) => [state.itemKey, state]),
  );
  const suspendedItemKeys = new Set(
    snapshot.reviewStates
      .filter((state) => state.status === "suspended")
      .map((state) => state.itemKey),
  );
  for (const state of snapshot.vocabularyUserStates) {
    if (state.suspended) {
      suspendedItemKeys.add(state.itemKey);
    }
  }
  const attemptsByItemKey = new Map<string, Attempt[]>();
  for (const attempt of snapshot.attempts) {
    const values = attemptsByItemKey.get(attempt.itemKey) ?? [];
    values.push(attempt);
    attemptsByItemKey.set(attempt.itemKey, values);
  }
  const masteryByItemKey = new Map(
    snapshot.masteryProfiles.map((profile) => [profile.itemKey, profile]),
  );
  const candidates: DailyPlanCandidate[] = [];
  const selectedItemKeys = new Set<string>();

  const knownReviewStates = snapshot.reviewStates.filter((state) => {
    const vocabularyId = isVocabularyItemKey(state.itemKey)
      ? vocabularyIdFromItemKey(state.itemKey)
      : undefined;
    const lessonId = lessonIdFromItemKey(state.itemKey);
    return (
      state.status !== "new" &&
      !suspendedItemKeys.has(state.itemKey) &&
      ((vocabularyId !== undefined && vocabularyIds.has(vocabularyId)) ||
        (lessonId !== undefined && lessonById.has(lessonId)))
    );
  });
  const rankedDue = rankReviewQueue(
    knownReviewStates.map((state) => ({
      state,
      userPinned: userStateByItemKey.get(state.itemKey)?.favorite === true,
      data: state.itemKey,
    })),
    now,
  );
  for (const ranked of rankedDue) {
    const itemKey = ranked.state.itemKey;
    const lessonId = lessonIdFromItemKey(itemKey);
    const reviewLesson = lessonId === undefined ? undefined : lessonById.get(lessonId);
    candidates.push({
      id: itemKey,
      kind: "review",
      dueAtMs: new Date(ranked.state.dueAt).getTime(),
      estimatedSeconds:
        reviewLesson === undefined
          ? estimateReviewSeconds(attemptsByItemKey.get(itemKey) ?? [])
          : Math.max(
              MINIMUM_LESSON_SECONDS,
              estimateLessonSeconds(reviewLesson, snapshot),
            ),
      priorityScore: ranked.priority.priority,
      skill: isVocabularyItemKey(itemKey) ? "vocabulary" : "grammar",
    });
    selectedItemKeys.add(itemKey);
  }

  for (const candidate of buildWeakCandidates({
    snapshot,
    now,
    blockedItemKeys: selectedItemKeys,
    suspendedItemKeys,
    attemptsByItemKey,
    masteryByItemKey,
  })) {
    candidates.push(candidate);
    selectedItemKeys.add(candidate.id);
  }

  const lessonCandidate = buildCurrentLessonCandidate(snapshot);
  if (lessonCandidate !== undefined && !selectedItemKeys.has(lessonCandidate.id)) {
    candidates.push(lessonCandidate);
    selectedItemKeys.add(lessonCandidate.id);
  }

  for (const item of [...snapshot.vocabulary].sort(
    (left, right) => left.stage - right.stage || left.id.localeCompare(right.id),
  )) {
    const itemKey = `vocab:${item.id}`;
    const reviewState = snapshot.reviewStates.find(
      (state) => state.itemKey === itemKey,
    );
    if (
      item.stage <= currentStage &&
      !selectedItemKeys.has(itemKey) &&
      !suspendedItemKeys.has(itemKey) &&
      (reviewState === undefined || reviewState.status === "new")
    ) {
      candidates.push({
        id: itemKey,
        kind: "newVocabulary",
        estimatedSeconds: NEW_VOCABULARY_SECONDS,
        skill: "vocabulary",
        priorityScore: currentStage - item.stage,
      });
      selectedItemKeys.add(itemKey);
    }
  }

  const weakSkills = rankWeakSkills(snapshot.attempts);
  for (const practiceSet of [...snapshot.practiceSets].sort(
    (left, right) => left.stage - right.stage || left.id.localeCompare(right.id),
  )) {
    if (practiceSet.stage > currentStage) {
      continue;
    }
    const skill = practiceSetSkill(practiceSet, weakSkills);
    candidates.push({
      id: `practice:${practiceSet.id}`,
      kind: "skillPractice",
      skill,
      minimumStage: normalizeStage(practiceSet.stage),
      estimatedSeconds: practiceSet.estimatedMinutes * 60,
    });
  }

  return {
    snapshot,
    studyDate: input.studyDate,
    studyDayStartMs: input.studyDayStartMs,
    candidates,
    weakSkills,
  };
}

function completedBlocks(plan: DailyPlan | undefined): CompletedDailyPlanBlock[] {
  return (
    plan?.blocks.filter(
      (block): block is CompletedDailyPlanBlock => block.status === "completed",
    ) ?? []
  );
}

export function generateTodayPlan(input: {
  source: TodaySource;
  now: Date;
  targetMinutes: number;
  mode: DailyPlanMode;
  previousPlan?: DailyPlan;
}): DailyPlan {
  const profile = input.source.snapshot.profile;
  const settings = input.source.snapshot.settings;
  return buildDailyPlan({
    studyDate: input.source.studyDate,
    nowMs: input.now.getTime(),
    studyDayStartMs: input.source.studyDayStartMs,
    targetMinutes: input.targetMinutes,
    mode: input.mode,
    configuredNewItemLimit: settings?.dailyNewVocabularyLimit ?? 5,
    currentStage: normalizeStage(profile?.selectedStage ?? 0),
    weakSkills: input.source.weakSkills,
    candidates: input.source.candidates,
    completedBlocks: completedBlocks(input.previousPlan),
  });
}

export function buildTodayPlanPreviews(input: {
  source: TodaySource;
  now: Date;
  targetMinutes: number;
  previousPlan?: DailyPlan;
}): TodayPlanPreview[] {
  return DAILY_PLAN_MODES.map((mode) => {
    const plan = generateTodayPlan({ ...input, mode });
    const pending = plan.blocks.filter((block) => block.status === "pending");
    return {
      mode,
      plan,
      pendingCount: pending.length,
      reviewCount: pending.filter(
        (block) => block.category === "overdueReview" || block.category === "dueReview",
      ).length,
      newCount: pending.filter((block) => block.category === "newVocabulary").length,
      estimatedMinutes: Math.ceil(
        pending.reduce((total, block) => total + block.estimatedSeconds, 0) / 60,
      ),
    };
  });
}

export function modeLabel(mode: DailyPlanMode): string {
  return MODE_LABELS[mode];
}

export function skillLabel(skill: LearningSkill): string {
  return SKILL_LABELS[skill];
}

export function formatEstimatedMinutes(seconds: number): string {
  if (seconds <= 0) {
    return "0分";
  }
  if (seconds < 60) {
    return "1分未満";
  }
  return `約${Math.ceil(seconds / 60)}分`;
}

export function pendingPlanSeconds(plan: DailyPlan): number {
  return plan.blocks
    .filter((block) => block.status === "pending")
    .reduce((total, block) => total + block.estimatedSeconds, 0);
}

export function planCompletionRate(plan: DailyPlan): number {
  if (plan.blocks.length === 0) {
    return 0;
  }
  return Math.round(
    (plan.blocks.filter((block) => block.status === "completed").length /
      plan.blocks.length) *
      100,
  );
}

function blockAction(block: DailyPlanBlock): TodayBlockAction {
  const lessonId = lessonIdFromItemKey(block.itemId);
  if (lessonId !== undefined) {
    return { kind: "lesson", lessonId };
  }
  const practiceSetId = practiceSetIdFromItemKey(block.itemId);
  if (practiceSetId !== undefined) {
    return { kind: "practice", practiceSetId };
  }
  if (isVocabularyItemKey(block.itemId)) {
    const mode =
      block.category === "newVocabulary"
        ? "new"
        : block.category === "weakItem"
          ? "weak"
          : "due";
    return { kind: "vocabulary", mode, limit: 1 };
  }
  return { kind: "none" };
}

export function presentPlanBlocks(
  plan: DailyPlan,
  snapshot: TodayDataSnapshot,
): TodayBlockPresentation[] {
  const vocabularyById = new Map(snapshot.vocabulary.map((item) => [item.id, item]));
  const lessonById = new Map(snapshot.lessons.map((lesson) => [lesson.id, lesson]));
  const practiceById = new Map(snapshot.practiceSets.map((set) => [set.id, set]));

  return plan.blocks.map((block) => {
    const vocabularyItem = isVocabularyItemKey(block.itemId)
      ? vocabularyById.get(vocabularyIdFromItemKey(block.itemId))
      : undefined;
    const lessonId = lessonIdFromItemKey(block.itemId);
    const lesson = lessonId === undefined ? undefined : lessonById.get(lessonId);
    const practiceId = practiceSetIdFromItemKey(block.itemId);
    const practice =
      practiceId === undefined ? undefined : practiceById.get(practiceId);
    const title =
      vocabularyItem !== undefined
        ? block.category === "newVocabulary"
          ? `新しい単語「${vocabularyItem.headword}」`
          : block.category === "weakItem"
            ? `苦手な単語「${vocabularyItem.headword}」`
            : `単語「${vocabularyItem.headword}」を復習`
        : lesson !== undefined
          ? `${lesson.titleJa}${block.category === "currentLesson" ? "" : "を復習"}`
          : (practice?.titleJa ?? "復習項目");
    const description =
      block.category === "overdueReview"
        ? "期限を過ぎた復習から、忘れやすい順に確認します。"
        : block.category === "dueReview"
          ? "今日が期限の復習です。"
          : block.category === "weakItem"
            ? "最近あやふやだった内容を短く確認します。"
            : block.category === "currentLesson"
              ? "現在のステージを少しずつ進めます。"
              : block.category === "newVocabulary"
                ? "新しい語を見てから、思い出す練習をします。"
                : `${block.skill === undefined ? "技能" : skillLabel(block.skill)}の短い練習です。`;
    return {
      block,
      title,
      description,
      action: blockAction(block),
    };
  });
}

function formatNextDue(snapshot: TodayDataSnapshot, now: Date): string {
  const next = snapshot.reviewStates
    .filter(
      (state) =>
        state.status !== "suspended" &&
        Number.isFinite(new Date(state.dueAt).getTime()) &&
        new Date(state.dueAt).getTime() > now.getTime(),
    )
    .sort((left, right) => left.dueAt.localeCompare(right.dueAt))[0];
  if (next === undefined) {
    return "次回予定はまだありません";
  }
  const formatter = new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  return `${formatter.format(new Date(next.dueAt))}から`;
}

export function buildCompletionSummary(input: {
  plan: DailyPlan;
  snapshot: TodayDataSnapshot;
  now: Date;
}): TodayCompletionSummary {
  const completed = input.plan.blocks.filter((block) => block.status === "completed");
  const todayAttempts = input.snapshot.attempts.filter(
    (attempt) => attempt.studyDate === input.plan.date,
  );
  const uncertainItemKeys = new Set(
    todayAttempts
      .filter(
        (attempt) =>
          attempt.confidence === "none" ||
          attempt.confidence === "low" ||
          attempt.finalRating === "again" ||
          attempt.finalRating === "hard",
      )
      .map((attempt) => attempt.itemKey),
  );
  return {
    estimatedStudyMinutes: Math.ceil(
      completed.reduce((total, block) => total + block.estimatedSeconds, 0) / 60,
    ),
    reviewCount: completed.filter(
      (block) => block.category === "overdueReview" || block.category === "dueReview",
    ).length,
    newCount: completed.filter((block) => block.category === "newVocabulary").length,
    uncertainCount: uncertainItemKeys.size,
    nextDueLabel: formatNextDue(input.snapshot, input.now),
  };
}
