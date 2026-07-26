import {
  DIAGNOSTIC_AREAS,
  DIAGNOSTIC_STAGES,
  type DiagnosticArea,
  type DiagnosticInsight,
  type DiagnosticPlacement,
  type DiagnosticSession,
  type DiagnosticStage,
  type DiagnosticStageSummary,
  type PlacementOptions,
} from "./types";

const AREA_LABELS: Readonly<Record<DiagnosticArea, string>> = {
  alphabet: "アルファベット",
  basicVocabulary: "基本語彙",
  beVerb: "be動詞",
  generalVerb: "一般動詞",
  questions: "疑問文",
  shortReading: "短文読解",
  basicListening: "基本的な聞き取り",
  pastFutureComparison: "過去・未来・比較",
  presentPerfect: "現在完了",
  passive: "受動態",
  relativeClauses: "関係代名詞",
  upperGrammar: "高校基礎文法",
  upperVocabulary: "発展語彙",
  upperReading: "発展読解",
  upperListening: "発展リスニング",
};

const DEFAULT_PASS_ACCURACY = 2 / 3;
const DEFAULT_MINIMUM_ANSWERS = 2;

function clampRatio(value: number, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(1, Math.max(0, value));
}

function createStageSummary(
  session: DiagnosticSession,
  stage: DiagnosticStage,
  passAccuracy: number,
  minimumAnswers: number,
): DiagnosticStageSummary {
  const answers = session.answers.filter((answer) => answer.stage === stage);
  const correctCount = answers.filter((answer) => answer.response === "correct").length;
  const accuracy = answers.length === 0 ? 0 : correctCount / answers.length;

  return {
    stage,
    answeredCount: answers.length,
    correctCount,
    accuracy,
    passed: answers.length >= minimumAnswers && accuracy >= passAccuracy,
  };
}

function createAreaInsights(session: DiagnosticSession): DiagnosticInsight[] {
  return DIAGNOSTIC_AREAS.map((area) => {
    const answers = session.answers.filter((answer) => answer.area === area);
    const correctCount = answers.filter(
      (answer) => answer.response === "correct",
    ).length;

    return {
      area,
      label: AREA_LABELS[area],
      answeredCount: answers.length,
      correctCount,
      accuracy: answers.length === 0 ? 0 : correctCount / answers.length,
    };
  }).filter((insight) => insight.answeredCount > 0);
}

function compareStrengths(left: DiagnosticInsight, right: DiagnosticInsight): number {
  return (
    right.accuracy - left.accuracy ||
    right.answeredCount - left.answeredCount ||
    (left.area < right.area ? -1 : left.area > right.area ? 1 : 0)
  );
}

function compareGaps(left: DiagnosticInsight, right: DiagnosticInsight): number {
  return (
    left.accuracy - right.accuracy ||
    right.answeredCount - left.answeredCount ||
    (left.area < right.area ? -1 : left.area > right.area ? 1 : 0)
  );
}

function selectStrengths(insights: readonly DiagnosticInsight[]): DiagnosticInsight[] {
  const thresholdMatches = insights
    .filter((insight) => insight.accuracy >= 0.75)
    .sort(compareStrengths);
  if (thresholdMatches.length > 0) {
    return thresholdMatches;
  }

  const positiveInsights = insights
    .filter((insight) => insight.correctCount > 0)
    .sort(compareStrengths);
  return positiveInsights.slice(0, 1);
}

function selectGaps(insights: readonly DiagnosticInsight[]): DiagnosticInsight[] {
  const thresholdMatches = insights
    .filter((insight) => insight.accuracy < 0.6)
    .sort(compareGaps);
  if (thresholdMatches.length > 0) {
    return thresholdMatches;
  }

  const insightsWithMisses = insights
    .filter((insight) => insight.correctCount < insight.answeredCount)
    .sort(compareGaps);
  return insightsWithMisses.slice(0, 1);
}

function recommendStage(
  stageSummaries: readonly DiagnosticStageSummary[],
): DiagnosticStage {
  let recommendedStage: DiagnosticStage = 0;

  for (const summary of stageSummaries) {
    if (summary.stage === 6 || !summary.passed) {
      break;
    }
    recommendedStage = (summary.stage + 1) as DiagnosticStage;
  }

  return recommendedStage;
}

export function summarizeDiagnosticPlacement(
  session: DiagnosticSession,
  options: PlacementOptions = {},
): DiagnosticPlacement {
  const passAccuracy = clampRatio(
    options.passAccuracy ?? DEFAULT_PASS_ACCURACY,
    DEFAULT_PASS_ACCURACY,
  );
  const minimumAnswers = Math.max(
    1,
    Math.round(options.minimumAnswersPerStage ?? DEFAULT_MINIMUM_ANSWERS),
  );
  const stageSummaries = DIAGNOSTIC_STAGES.map((stage) =>
    createStageSummary(session, stage, passAccuracy, minimumAnswers),
  );
  const insights = createAreaInsights(session);

  return {
    recommendedStage: recommendStage(stageSummaries),
    strengths: selectStrengths(insights),
    gaps: selectGaps(insights),
    stageSummaries,
    answeredCount: session.answers.length,
    correctCount: session.answers.filter((answer) => answer.response === "correct")
      .length,
    skippedCount: session.answers.filter(
      (answer) => answer.response === "skipped" || answer.response === "unknown",
    ).length,
    ...(session.finishReason === undefined
      ? {}
      : { finishReason: session.finishReason }),
  };
}
