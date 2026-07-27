import {
  DAILY_PLAN_MODES,
  resolveStudyDay,
  type DailyPlan,
  type DailyPlanMode,
} from "../../domain/planning";
import { buildTodayPlanPreviews, buildTodaySource, generateTodayPlan } from "./model";
import type {
  TodayClock,
  TodayDataPort,
  TodayDataSnapshot,
  TodayPlanPreview,
  TodaySource,
} from "./types";

export interface LoadedToday {
  now: Date;
  snapshot: TodayDataSnapshot;
  source: TodaySource;
  plan?: DailyPlan;
  previews: readonly TodayPlanPreview[];
}

export const systemTodayClock: TodayClock = {
  now: () => new Date(),
  timeZone: () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
};

function previewInput(input: {
  source: TodaySource;
  now: Date;
  targetMinutes: number;
  previousPlan?: DailyPlan;
}) {
  return {
    source: input.source,
    now: input.now,
    targetMinutes: input.targetMinutes,
    ...(input.previousPlan === undefined ? {} : { previousPlan: input.previousPlan }),
  };
}

/**
 * 同一学習日は保存済みプランを再利用し、初回だけ標準プランを保存する。
 * 学習日が変われば前日の未完了を引き継がず、新しいdateで作成する。
 */
export async function loadToday(
  port: TodayDataPort,
  clock: TodayClock = systemTodayClock,
): Promise<LoadedToday> {
  const now = clock.now();
  if (Number.isNaN(now.getTime())) {
    throw new Error("現在時刻を確認できませんでした。");
  }
  const snapshot = await port.loadSnapshot();
  const resolved = resolveStudyDay(now, {
    timeZone: clock.timeZone(),
    hour: snapshot.settings?.studyDayStartHour ?? 4,
  });
  const source = buildTodaySource({
    snapshot,
    now,
    studyDate: resolved.studyDate,
    studyDayStartMs: resolved.studyDayStartMs,
  });
  const existing = snapshot.dailyPlans.find((plan) => plan.date === resolved.studyDate);
  if (snapshot.profile === undefined) {
    return { now, snapshot, source, previews: [] };
  }
  let plan =
    existing ??
    generateTodayPlan({
      source,
      now,
      targetMinutes: snapshot.profile.dailyMinutes,
      mode: "standard",
    });
  if (existing === undefined) {
    plan = await port.savePlan(plan);
  }
  return {
    now,
    snapshot,
    source,
    plan,
    previews: buildTodayPlanPreviews(
      previewInput({
        source,
        now,
        targetMinutes: plan.targetMinutes,
        previousPlan: plan,
      }),
    ),
  };
}

export function recalculateToday(input: {
  loaded: LoadedToday;
  targetMinutes: number;
  mode: DailyPlanMode;
}): LoadedToday {
  if (input.loaded.plan === undefined) {
    return input.loaded;
  }
  const plan = generateTodayPlan({
    source: input.loaded.source,
    now: input.loaded.now,
    targetMinutes: input.targetMinutes,
    mode: input.mode,
    previousPlan: input.loaded.plan,
  });
  return {
    ...input.loaded,
    plan,
    previews: buildTodayPlanPreviews(
      previewInput({
        source: input.loaded.source,
        now: input.loaded.now,
        targetMinutes: input.targetMinutes,
        previousPlan: plan,
      }),
    ),
  };
}

export function isDailyPlanMode(value: string): value is DailyPlanMode {
  return DAILY_PLAN_MODES.includes(value as DailyPlanMode);
}
