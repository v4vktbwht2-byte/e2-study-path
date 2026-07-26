import type { Goal, UserProfile } from "../../domain/models";
import type { ProfileRepository } from "../../domain/repositories";

export const GOAL_OPTIONS = [
  {
    value: "grade2",
    label: "英検2級を目指す",
    description: "基礎から段階的に、英検2級相当の力を目指します。",
  },
  {
    value: "relearn",
    label: "基礎から学び直す",
    description: "アルファベットや短い文から、あせらず確認します。",
  },
  {
    value: "conversation",
    label: "簡単な日常英語",
    description: "身近な場面で使う短い表現を増やします。",
  },
  {
    value: "vocabulary",
    label: "単語を増やす",
    description: "見て分かる単語と、自分で思い出せる単語を増やします。",
  },
] as const satisfies readonly {
  value: Goal;
  label: string;
  description: string;
}[];

export const DAILY_MINUTE_PRESETS = [5, 15, 30, 45] as const;

const GOAL_VALUES = new Set<Goal>(GOAL_OPTIONS.map((option) => option.value));

export interface OnboardingInput {
  goals: readonly Goal[];
  dailyMinutes: number;
  targetExamDate?: string;
}

export interface CompleteOnboardingInput extends OnboardingInput {
  selectedStage: number;
}

export class OnboardingValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OnboardingValidationError";
  }
}

function normalizeDate(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new OnboardingValidationError("受験予定日は正しい日付で入力してください。");
  }

  const parsed = new Date(`${trimmed}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== trimmed) {
    throw new OnboardingValidationError("受験予定日は正しい日付で入力してください。");
  }

  return trimmed;
}

function normalizeInput(input: OnboardingInput): {
  goals: Goal[];
  dailyMinutes: number;
  targetExamDate?: string;
} {
  const goals = [...new Set(input.goals)].filter((goal) => GOAL_VALUES.has(goal));
  if (goals.length === 0) {
    throw new OnboardingValidationError("学習目標を1つ以上選んでください。");
  }

  if (
    !Number.isFinite(input.dailyMinutes) ||
    !Number.isInteger(input.dailyMinutes) ||
    input.dailyMinutes < 5 ||
    input.dailyMinutes > 180
  ) {
    throw new OnboardingValidationError(
      "1日の学習時間は5〜180分の範囲で入力してください。",
    );
  }

  const targetExamDate = normalizeDate(input.targetExamDate);
  return {
    goals,
    dailyMinutes: input.dailyMinutes,
    ...(targetExamDate === undefined ? {} : { targetExamDate }),
  };
}

function createProfile(
  existing: UserProfile | undefined,
  input: OnboardingInput,
  now: string,
  onboardingCompleted: boolean,
  selectedStage = existing?.selectedStage ?? 0,
): UserProfile {
  const normalized = normalizeInput(input);
  const profile: UserProfile = {
    id: "local-user",
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    goals: normalized.goals,
    dailyMinutes: normalized.dailyMinutes,
    recommendedStage: existing?.recommendedStage ?? 0,
    selectedStage,
    onboardingCompleted,
    ...(normalized.targetExamDate === undefined
      ? {}
      : { targetExamDate: normalized.targetExamDate }),
    ...(existing?.diagnosticCompletedAt === undefined
      ? {}
      : { diagnosticCompletedAt: existing.diagnosticCompletedAt }),
  };

  return profile;
}

export async function saveOnboardingDraft(
  repository: ProfileRepository,
  input: OnboardingInput,
  now = new Date().toISOString(),
): Promise<UserProfile> {
  const existing = await repository.get();
  const profile = createProfile(
    existing,
    input,
    now,
    existing?.onboardingCompleted ?? false,
  );
  await repository.save(profile);
  return profile;
}

export async function completeOnboardingWithoutDiagnostic(
  repository: ProfileRepository,
  input: CompleteOnboardingInput,
  now = new Date().toISOString(),
): Promise<UserProfile> {
  if (
    !Number.isInteger(input.selectedStage) ||
    input.selectedStage < 0 ||
    input.selectedStage > 6
  ) {
    throw new OnboardingValidationError("開始ステージは0〜6から選んでください。");
  }

  const existing = await repository.get();
  const profile = createProfile(existing, input, now, true, input.selectedStage);
  await repository.save(profile);
  return profile;
}
