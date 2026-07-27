import {
  BACKLOG_REVIEW_LIMITS,
  calculateDailyPlanCapacity,
  calculateNewItemLimit,
} from "./capacity";
import {
  LEARNING_SKILLS,
  type BuildDailyPlanInput,
  type CompletedDailyPlanBlock,
  type DailyPlan,
  type DailyPlanBlock,
  type DailyPlanCandidate,
  type DailyPlanCategory,
  type LearningSkill,
} from "./types";

interface ClassifiedCandidate {
  candidate: DailyPlanCandidate;
  category: DailyPlanCategory;
}

const CATEGORY_ORDER: Readonly<Record<DailyPlanCategory, number>> = {
  overdueReview: 0,
  dueReview: 1,
  weakItem: 2,
  currentLesson: 3,
  newVocabulary: 4,
  skillPractice: 5,
};

function assertTimestamp(value: number, name: string): void {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${name}には有限の時刻を指定してください。`);
  }
}

function assertUniqueIds(candidates: readonly DailyPlanCandidate[]): void {
  const ids = new Set<string>();

  for (const candidate of candidates) {
    if (candidate.id.trim() === "") {
      throw new Error("日次プラン候補のIDは空にできません。");
    }
    if (ids.has(candidate.id)) {
      throw new Error(`日次プラン候補のIDが重複しています: ${candidate.id}`);
    }
    if (
      !Number.isFinite(candidate.estimatedSeconds) ||
      candidate.estimatedSeconds <= 0
    ) {
      throw new RangeError(`候補 ${candidate.id} の所要時間は1秒以上にしてください。`);
    }
    ids.add(candidate.id);
  }
}

function classifyCandidate(
  candidate: DailyPlanCandidate,
  nowMs: number,
  studyDayStartMs: number,
): ClassifiedCandidate | null {
  if (candidate.kind === "review") {
    assertTimestamp(candidate.dueAtMs, `${candidate.id}の復習期限`);
    if (candidate.dueAtMs > nowMs) {
      return null;
    }

    return {
      candidate,
      category: candidate.dueAtMs < studyDayStartMs ? "overdueReview" : "dueReview",
    };
  }

  const categoryByKind = {
    weak: "weakItem",
    currentLesson: "currentLesson",
    newVocabulary: "newVocabulary",
    skillPractice: "skillPractice",
  } as const;

  return { candidate, category: categoryByKind[candidate.kind] };
}

function createSkillOrder(
  weakSkills: readonly LearningSkill[],
  currentStage: number,
): ReadonlyMap<LearningSkill, number> {
  const uniqueWeakSkills = weakSkills.filter(
    (skill, index) =>
      weakSkills.indexOf(skill) === index && LEARNING_SKILLS.includes(skill),
  );
  const rotatedSkills = LEARNING_SKILLS.map(
    (_, index) => LEARNING_SKILLS[(index + currentStage) % LEARNING_SKILLS.length],
  ).filter((skill): skill is LearningSkill => skill !== undefined);
  const orderedSkills = [
    ...uniqueWeakSkills,
    ...rotatedSkills.filter((skill) => !uniqueWeakSkills.includes(skill)),
  ];

  return new Map(orderedSkills.map((skill, index) => [skill, index]));
}

function compareCandidates(
  left: ClassifiedCandidate,
  right: ClassifiedCandidate,
  skillOrder: ReadonlyMap<LearningSkill, number>,
): number {
  const categoryDifference =
    CATEGORY_ORDER[left.category] - CATEGORY_ORDER[right.category];
  if (categoryDifference !== 0) {
    return categoryDifference;
  }

  if (left.candidate.kind === "review" && right.candidate.kind === "review") {
    const priorityDifference =
      (right.candidate.priorityScore ?? 0) - (left.candidate.priorityScore ?? 0);
    if (priorityDifference !== 0) {
      return priorityDifference;
    }

    const dueDifference = left.candidate.dueAtMs - right.candidate.dueAtMs;
    if (dueDifference !== 0) {
      return dueDifference;
    }
  }

  if (
    left.candidate.kind === "skillPractice" &&
    right.candidate.kind === "skillPractice"
  ) {
    const skillDifference =
      (skillOrder.get(left.candidate.skill) ?? Number.MAX_SAFE_INTEGER) -
      (skillOrder.get(right.candidate.skill) ?? Number.MAX_SAFE_INTEGER);
    if (skillDifference !== 0) {
      return skillDifference;
    }
  }

  const priorityDifference =
    (right.candidate.priorityScore ?? 0) - (left.candidate.priorityScore ?? 0);
  if (priorityDifference !== 0) {
    return priorityDifference;
  }

  return left.candidate.id < right.candidate.id
    ? -1
    : left.candidate.id > right.candidate.id
      ? 1
      : 0;
}

function toPendingBlock(classified: ClassifiedCandidate): DailyPlanBlock {
  return {
    blockId: classified.candidate.id,
    itemId: classified.candidate.id,
    category: classified.category,
    estimatedSeconds: Math.round(classified.candidate.estimatedSeconds),
    status: "pending",
    ...(classified.candidate.skill === undefined
      ? {}
      : { skill: classified.candidate.skill }),
  };
}

function sumEstimatedSeconds(blocks: readonly DailyPlanBlock[]): number {
  return blocks.reduce((total, block) => total + block.estimatedSeconds, 0);
}

function cloneCompletedBlocks(
  blocks: readonly CompletedDailyPlanBlock[],
): CompletedDailyPlanBlock[] {
  return blocks.map((block) => ({ ...block, status: "completed" }));
}

/**
 * block完了を表示状態とID一覧へ同時に反映する。
 * すでに両方へ反映済みの場合は同じplanを返すため、再試行しても重複しない。
 */
export function completeDailyPlanBlock(plan: DailyPlan, blockId: string): DailyPlan {
  const targetBlock = plan.blocks.find((block) => block.blockId === blockId);
  if (targetBlock === undefined) {
    throw new Error(`日次プランblockが見つかりません: ${blockId}`);
  }

  const isRecorded = plan.completedBlockIds.includes(blockId);
  if (targetBlock.status === "completed" && isRecorded) {
    return plan;
  }

  return {
    ...plan,
    blocks: plan.blocks.map((block) =>
      block.blockId === blockId ? { ...block, status: "completed" } : block,
    ),
    completedBlockIds: isRecorded
      ? plan.completedBlockIds
      : [...plan.completedBlockIds, blockId],
  };
}

/**
 * 別タブや戻り遷移で古いplanを再保存しても、すでに確定した完了を失わないようにする。
 * 時間・mode・未完了候補はincomingを採用し、完了状態だけを単調増加で統合する。
 */
export function mergeDailyPlanCompletions(
  latest: DailyPlan,
  incoming: DailyPlan,
): DailyPlan {
  if (latest.date !== incoming.date) {
    throw new Error("異なる学習日のプランは統合できません。");
  }

  const latestCompletedIds = new Set([
    ...latest.completedBlockIds,
    ...latest.blocks
      .filter((block) => block.status === "completed")
      .map((block) => block.blockId),
  ]);
  const incomingCompletedIds = new Set([
    ...incoming.completedBlockIds,
    ...incoming.blocks
      .filter((block) => block.status === "completed")
      .map((block) => block.blockId),
  ]);
  const completedIds = new Set([...latestCompletedIds, ...incomingCompletedIds]);
  const incomingById = new Map(incoming.blocks.map((block) => [block.blockId, block]));
  const completedBlocks: CompletedDailyPlanBlock[] = [];
  const recordedIds = new Set<string>();

  for (const block of [...latest.blocks, ...incoming.blocks]) {
    if (!completedIds.has(block.blockId) || recordedIds.has(block.blockId)) {
      continue;
    }
    const preferred = incomingById.get(block.blockId) ?? block;
    completedBlocks.push({ ...preferred, status: "completed" });
    recordedIds.add(block.blockId);
  }

  const pendingBlocks = incoming.blocks.filter(
    (block) => !completedIds.has(block.blockId),
  );
  const blocks = [...completedBlocks, ...pendingBlocks];
  const plannedSeconds = sumEstimatedSeconds(blocks);

  return {
    ...incoming,
    blocks,
    completedBlockIds: completedBlocks.map((block) => block.blockId),
    plannedSeconds,
    remainingBudgetSeconds:
      incoming.capacity.budgetSeconds === null
        ? null
        : Math.max(0, incoming.capacity.budgetSeconds - plannedSeconds),
  };
}

export function buildDailyPlan(input: BuildDailyPlanInput): DailyPlan {
  assertTimestamp(input.nowMs, "現在時刻");
  assertTimestamp(input.studyDayStartMs, "学習日の開始時刻");
  if (input.studyDayStartMs > input.nowMs) {
    throw new RangeError("学習日の開始時刻は現在時刻以前にしてください。");
  }
  assertUniqueIds(input.candidates);

  const completedBlocks = cloneCompletedBlocks(input.completedBlocks ?? []);
  const completedItemIds = new Set(completedBlocks.map((block) => block.itemId));
  const skillOrder = createSkillOrder(input.weakSkills ?? [], input.currentStage);
  const classifiedCandidates = input.candidates
    .filter((candidate) => !completedItemIds.has(candidate.id))
    .filter(
      (candidate) =>
        candidate.kind !== "skillPractice" ||
        candidate.minimumStage === undefined ||
        candidate.minimumStage <= input.currentStage,
    )
    .map((candidate) =>
      classifyCandidate(candidate, input.nowMs, input.studyDayStartMs),
    )
    .filter((candidate): candidate is ClassifiedCandidate => candidate !== null)
    .sort((left, right) => compareCandidates(left, right, skillOrder));

  const overdueCount = classifiedCandidates.filter(
    ({ category }) => category === "overdueReview",
  ).length;
  const dueCount = classifiedCandidates.filter(
    ({ category }) => category === "overdueReview" || category === "dueReview",
  ).length;
  const capacity = calculateDailyPlanCapacity(input.targetMinutes, input.mode);
  const newLimit = calculateNewItemLimit(
    overdueCount,
    dueCount,
    capacity.estimatedReviewItemCapacity,
    input.configuredNewItemLimit,
  );
  const backlogReviewLimit = dueCount > 40 ? BACKLOG_REVIEW_LIMITS[input.mode] : null;
  const completedSeconds = sumEstimatedSeconds(completedBlocks);
  let remainingBudget =
    capacity.budgetSeconds === null
      ? null
      : Math.max(0, capacity.budgetSeconds - completedSeconds);
  let selectedReviewCount = completedBlocks.filter(
    ({ category }) => category === "overdueReview" || category === "dueReview",
  ).length;
  let selectedNewCount = completedBlocks.filter(
    ({ category }) => category === "newVocabulary",
  ).length;
  const pendingBlocks: DailyPlanBlock[] = [];

  for (const classified of classifiedCandidates) {
    const isReview =
      classified.category === "overdueReview" || classified.category === "dueReview";
    if (
      isReview &&
      backlogReviewLimit !== null &&
      selectedReviewCount >= backlogReviewLimit
    ) {
      continue;
    }
    if (classified.category === "newVocabulary" && selectedNewCount >= newLimit) {
      continue;
    }

    const estimatedSeconds = Math.round(classified.candidate.estimatedSeconds);
    if (remainingBudget !== null && estimatedSeconds > remainingBudget) {
      const mayUseMinimumMeaningfulBlock =
        remainingBudget > 0 &&
        completedBlocks.length === 0 &&
        pendingBlocks.length === 0;
      if (!mayUseMinimumMeaningfulBlock) {
        continue;
      }
    }

    pendingBlocks.push(toPendingBlock(classified));
    if (isReview) {
      selectedReviewCount += 1;
    }
    if (classified.category === "newVocabulary") {
      selectedNewCount += 1;
    }
    if (remainingBudget !== null) {
      remainingBudget = Math.max(0, remainingBudget - estimatedSeconds);
    }
  }

  const blocks = [...completedBlocks, ...pendingBlocks];

  return {
    date: input.studyDate,
    generatedAt: new Date(input.nowMs).toISOString(),
    targetMinutes: capacity.requestedMinutes,
    mode: input.mode,
    blocks,
    completedBlockIds: completedBlocks.map((block) => block.blockId),
    sourceSnapshot: {
      dueCount,
      overdueCount,
      newLimit,
    },
    capacity,
    plannedSeconds: sumEstimatedSeconds(blocks),
    remainingBudgetSeconds: remainingBudget,
  };
}
