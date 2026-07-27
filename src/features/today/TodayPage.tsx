import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DailyPlanMode } from "../../domain/planning";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  InlineAlert,
  ProgressBar,
} from "../../shared/components";
import { trackPendingUpdateWrite } from "../../infrastructure/pwa";
import {
  buildCompletionSummary,
  buildTodayPlanPreviews,
  formatEstimatedMinutes,
  modeLabel,
  pendingPlanSeconds,
  planCompletionRate,
  presentPlanBlocks,
  skillLabel,
} from "./model";
import {
  loadToday,
  recalculateToday,
  systemTodayClock,
  type LoadedToday,
} from "./service";
import type { TodayBlockPresentation, TodayPageProps } from "./types";
import styles from "./TodayPage.module.css";

type PageState =
  | { status: "loading" }
  | { status: "ready"; loaded: LoadedToday }
  | { status: "error"; message: string };

const MINUTE_PRESETS = [5, 15, 30, 45] as const;

function formatStudyDate(studyDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(studyDate);
  if (match === null) {
    return studyDate;
  }
  return `${Number(match[2])}月${Number(match[3])}日`;
}

function blockButtonLabel(presentation: TodayBlockPresentation): string {
  switch (presentation.action.kind) {
    case "lesson":
      return presentation.block.category === "currentLesson"
        ? "レッスンを開く"
        : "復習レッスンを開く";
    case "vocabulary":
      return presentation.action.mode === "new"
        ? "この単語を学ぶ"
        : presentation.action.mode === "weak"
          ? "苦手練習を始める"
          : "この復習を始める";
    case "practice":
      return "技能練習を開く";
    case "none":
      return "";
  }
}

export function TodayPage({
  port,
  clock = systemTodayClock,
  onRequireOnboarding,
  onOpenLesson,
  onOpenVocabulary,
  onOpenPractice,
  onOpenVocabularyHub,
}: TodayPageProps) {
  const [state, setState] = useState<PageState>({ status: "loading" });
  const [selectedMinutes, setSelectedMinutes] = useState(15);
  const [customMinutes, setCustomMinutes] = useState("20");
  const [customSelected, setCustomSelected] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string>();
  const headingRef = useRef<HTMLHeadingElement>(null);

  const reload = useCallback(() => {
    let active = true;
    setState({ status: "loading" });
    setSaveError(undefined);
    void trackPendingUpdateWrite("today-plan", () => loadToday(port, clock))
      .then((loaded) => {
        if (!active) {
          return;
        }
        if (loaded.plan !== undefined) {
          setSelectedMinutes(loaded.plan.targetMinutes);
          setCustomMinutes(String(loaded.plan.targetMinutes));
          setCustomSelected(
            !MINUTE_PRESETS.includes(
              loaded.plan.targetMinutes as (typeof MINUTE_PRESETS)[number],
            ),
          );
        }
        setState({ status: "ready", loaded });
      })
      .catch((error: unknown) => {
        if (active) {
          setState({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "今日のプランを読み込めませんでした。",
          });
        }
      });
    return () => {
      active = false;
    };
  }, [clock, port]);

  useEffect(reload, [reload]);

  useEffect(() => {
    if (state.status !== "ready") {
      return;
    }
    if (!state.loaded.snapshot.profile?.onboardingCompleted) {
      onRequireOnboarding?.();
      return;
    }
    headingRef.current?.focus();
  }, [onRequireOnboarding, state]);

  const saveRecalculated = useCallback(
    async (mode: DailyPlanMode) => {
      if (state.status !== "ready" || state.loaded.plan === undefined) {
        return;
      }
      setSaving(true);
      setSaveError(undefined);
      try {
        const loaded = recalculateToday({
          loaded: state.loaded,
          targetMinutes: selectedMinutes,
          mode,
        });
        if (loaded.plan === undefined) {
          return;
        }
        const recalculatedPlan = loaded.plan;
        const persistedPlan = await trackPendingUpdateWrite("today-plan", () =>
          port.savePlan(recalculatedPlan),
        );
        const persistedLoaded = {
          ...loaded,
          plan: persistedPlan,
          previews: buildTodayPlanPreviews({
            source: loaded.source,
            now: loaded.now,
            targetMinutes: persistedPlan.targetMinutes,
            previousPlan: persistedPlan,
          }),
        };
        setState({ status: "ready", loaded: persistedLoaded });
      } catch (error: unknown) {
        setSaveError(
          error instanceof Error ? error.message : "プランを保存できませんでした。",
        );
      } finally {
        setSaving(false);
      }
    },
    [port, selectedMinutes, state],
  );

  if (state.status === "loading") {
    return (
      <section className={styles.page} aria-busy="true" aria-live="polite">
        <Card as="section" padding="large">
          <p role="status">今日の学習を準備しています…</p>
        </Card>
      </section>
    );
  }

  if (state.status === "error") {
    return (
      <section className={styles.page}>
        <h1>今日の学習</h1>
        <ErrorState
          title="今日のプランを読み込めませんでした"
          description={state.message}
          onRetry={reload}
        />
      </section>
    );
  }

  const { loaded } = state;
  const { profile } = loaded.snapshot;
  if (
    profile === undefined ||
    !profile.onboardingCompleted ||
    loaded.plan === undefined
  ) {
    return (
      <section className={styles.page} aria-live="polite">
        <h1>今日の学習</h1>
        <p role="status">初期設定を確認しています…</p>
      </section>
    );
  }

  const plan = loaded.plan;
  const presentations = presentPlanBlocks(plan, loaded.snapshot);
  const pendingPresentations = presentations.filter(
    ({ block }) => block.status === "pending",
  );
  const actionable = pendingPresentations.filter(
    ({ action }) => action.kind !== "none",
  );
  const firstActionable = actionable[0];
  const completedCount = plan.blocks.length - pendingPresentations.length;
  const completionRate = planCompletionRate(plan);
  const allComplete = plan.blocks.length > 0 && pendingPresentations.length === 0;
  const remainingSeconds = pendingPlanSeconds(plan);
  const isBacklog = plan.sourceSnapshot.overdueCount >= 80;
  const hasProgress =
    completedCount > 0 ||
    loaded.snapshot.lessonProgress.some((progress) => progress.status === "inProgress");
  const weakFocus = loaded.source.weakSkills[0];
  const previews = buildTodayPlanPreviews({
    source: loaded.source,
    now: loaded.now,
    targetMinutes: selectedMinutes,
    previousPlan: plan,
  });

  const openBlock = (presentation: TodayBlockPresentation) => {
    const context = {
      planDate: plan.date,
      blockId: presentation.block.blockId,
      itemKey: presentation.block.itemId,
    };
    switch (presentation.action.kind) {
      case "lesson":
        onOpenLesson?.(presentation.action.lessonId, context);
        break;
      case "vocabulary":
        onOpenVocabulary?.(
          presentation.action.mode,
          presentation.action.limit,
          context,
        );
        break;
      case "practice":
        onOpenPractice?.(presentation.action.practiceSetId, context);
        break;
      case "none":
        break;
    }
  };

  return (
    <article className={styles.page} aria-labelledby="today-title">
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>
            {formatStudyDate(loaded.source.studyDate)}のプラン
          </p>
          <h1 ref={headingRef} id="today-title" tabIndex={-1}>
            今日の学習
          </h1>
        </div>
        <p>
          1日{profile.dailyMinutes}分を目安に、ステージ
          {profile.selectedStage}から少しずつ進めましょう。できる分だけで大丈夫です。
        </p>
      </header>

      {saveError !== undefined ? (
        <InlineAlert tone="danger" title="プランを保存できませんでした">
          {saveError}
        </InlineAlert>
      ) : null}

      {isBacklog ? (
        <InlineAlert tone="warning" title="復習がたまっています">
          復習待ちが{plan.sourceSnapshot.overdueCount}
          件あります。軽めなら優先度の高い最大15件に絞り、新しい単語は増やしません。
          残りは失敗扱いになりません。
        </InlineAlert>
      ) : null}

      {allComplete ? (
        <TodayComplete
          summary={buildCompletionSummary({
            plan,
            snapshot: loaded.snapshot,
            now: loaded.now,
          })}
          onOpenVocabularyHub={onOpenVocabularyHub}
        />
      ) : plan.blocks.length === 0 ? (
        <EmptyState
          title="今日の追加メニューはありません"
          description="休むのも学習の一部です。単語を見たいときは、単語メニューから自由に始められます。"
          actions={
            onOpenVocabularyHub === undefined ? undefined : (
              <Button onClick={onOpenVocabularyHub}>単語メニューを開く</Button>
            )
          }
        />
      ) : (
        <>
          <Card as="section" padding="large" className={styles.hero}>
            <div className={styles.heroTop}>
              <div>
                <p className={styles.eyebrow}>今日のおすすめ</p>
                <h2>残り{formatEstimatedMinutes(remainingSeconds)}</h2>
              </div>
              <span className={styles.modeBadge}>{modeLabel(plan.mode)}</span>
            </div>
            <ProgressBar
              value={completionRate}
              label="今日の完了率"
              valueText={`${completedCount}/${plan.blocks.length}項目・${completionRate}%`}
            />
            <div className={styles.stats} aria-label="今日の内訳">
              <span>
                <strong>{plan.sourceSnapshot.dueCount}</strong>
                復習期限
              </span>
              <span>
                <strong>
                  {
                    pendingPresentations.filter(
                      ({ block }) => block.category === "weakItem",
                    ).length
                  }
                </strong>
                苦手
              </span>
              <span>
                <strong>
                  {
                    pendingPresentations.filter(
                      ({ block }) => block.category === "newVocabulary",
                    ).length
                  }
                </strong>
                新しい単語
              </span>
            </div>
            {firstActionable === undefined ? null : (
              <Button size="large" fullWidth onClick={() => openBlock(firstActionable)}>
                {hasProgress ? "続きから" : "今日の学習を始める"}
              </Button>
            )}
          </Card>

          <Card as="section" className={styles.settingsCard}>
            <div className={styles.sectionHeading}>
              <div>
                <p className={styles.eyebrow}>時間に合わせる</p>
                <h2>今日の学習時間</h2>
              </div>
              <strong>{selectedMinutes}分</strong>
            </div>
            <div className={styles.minuteChoices} aria-label="学習時間を選択">
              {MINUTE_PRESETS.map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  className={styles.choiceButton}
                  aria-pressed={!customSelected && selectedMinutes === minutes}
                  onClick={() => {
                    setCustomSelected(false);
                    setSelectedMinutes(minutes);
                  }}
                >
                  {minutes}分
                </button>
              ))}
              <button
                type="button"
                className={styles.choiceButton}
                aria-pressed={customSelected}
                onClick={() => {
                  setCustomSelected(true);
                  const value = Number(customMinutes);
                  if (Number.isInteger(value) && value >= 1 && value <= 180) {
                    setSelectedMinutes(value);
                  }
                }}
              >
                カスタム
              </button>
            </div>
            {customSelected ? (
              <label className={styles.customField}>
                カスタム時間（1〜180分）
                <input
                  type="number"
                  min={1}
                  max={180}
                  value={customMinutes}
                  onChange={(event) => {
                    const rawValue = event.currentTarget.value;
                    setCustomMinutes(rawValue);
                    const value = Number(rawValue);
                    if (Number.isInteger(value) && value >= 1 && value <= 180) {
                      setSelectedMinutes(value);
                    }
                  }}
                  onBlur={() => {
                    const value = Math.min(
                      180,
                      Math.max(1, Math.round(Number(customMinutes) || 1)),
                    );
                    setCustomMinutes(String(value));
                    setSelectedMinutes(value);
                  }}
                />
              </label>
            ) : null}
            <Button
              variant="secondary"
              fullWidth
              isLoading={saving}
              disabled={
                customSelected &&
                (!Number.isInteger(Number(customMinutes)) ||
                  Number(customMinutes) < 1 ||
                  Number(customMinutes) > 180)
              }
              loadingLabel="再計算して保存中"
              onClick={() => void saveRecalculated(plan.mode)}
            >
              プランを再計算
            </Button>
          </Card>

          <section aria-labelledby="course-preview-title">
            <div className={styles.sectionHeading}>
              <div>
                <p className={styles.eyebrow}>量を選べます</p>
                <h2 id="course-preview-title">4つの学習コース</h2>
              </div>
            </div>
            <div className={styles.previewGrid}>
              {previews.map((preview) => (
                <Card
                  as="article"
                  padding="small"
                  key={preview.mode}
                  className={
                    preview.mode === plan.mode
                      ? `${styles.preview} ${styles.previewSelected}`
                      : styles.preview
                  }
                >
                  <div>
                    <h3>{modeLabel(preview.mode)}</h3>
                    <p>
                      {preview.reviewCount}件の復習・新規{preview.newCount}件
                    </p>
                    <p>
                      {preview.pendingCount}項目 / 約{preview.estimatedMinutes}分
                    </p>
                  </div>
                  <Button
                    size="small"
                    variant={preview.mode === plan.mode ? "primary" : "secondary"}
                    disabled={saving}
                    aria-label={`${modeLabel(preview.mode)}で再計算`}
                    onClick={() => void saveRecalculated(preview.mode)}
                  >
                    {preview.mode === plan.mode ? "選択中" : "この量にする"}
                  </Button>
                </Card>
              ))}
            </div>
          </section>

          <Card as="section" className={styles.planCard}>
            <div className={styles.sectionHeading}>
              <div>
                <p className={styles.eyebrow}>優先順</p>
                <h2>今日の内訳</h2>
              </div>
              <span>{pendingPresentations.length}項目</span>
            </div>
            <ol className={styles.blockList}>
              {pendingPresentations.slice(0, 8).map((presentation) => (
                <li key={presentation.block.blockId} className={styles.block}>
                  <div className={styles.blockText}>
                    <h3>{presentation.title}</h3>
                    <p>{presentation.description}</p>
                    <small>
                      目安 {formatEstimatedMinutes(presentation.block.estimatedSeconds)}
                    </small>
                  </div>
                  {presentation.action.kind === "none" ? null : (
                    <Button
                      size="small"
                      variant="secondary"
                      onClick={() => openBlock(presentation)}
                    >
                      {blockButtonLabel(presentation)}
                    </Button>
                  )}
                </li>
              ))}
            </ol>
            {pendingPresentations.length > 8 ? (
              <p className={styles.more}>
                ほか{pendingPresentations.length - 8}
                項目は、上から進めると順番に表示されます。
              </p>
            ) : null}
          </Card>
        </>
      )}

      <div className={styles.bottomGrid}>
        <Card as="section" className={styles.focusCard}>
          <p className={styles.eyebrow}>今週の重点</p>
          <h2>
            {weakFocus === undefined
              ? `ステージ${profile.selectedStage}の基礎`
              : `${skillLabel(weakFocus)}を丁寧に`}
          </h2>
          <p>
            {weakFocus === undefined
              ? "レッスンと復習を交互に進めます。"
              : "最近の回答をもとに、無理のない範囲で優先しています。"}
          </p>
        </Card>

        <Card as="section" className={styles.shortcutCard}>
          <p className={styles.eyebrow}>単語集中ショートカット</p>
          <h2>単語だけ学びたいとき</h2>
          <p>新規・復習・苦手から、自分で選んで始められます。</p>
          {onOpenVocabularyHub === undefined ? null : (
            <Button variant="secondary" onClick={onOpenVocabularyHub}>
              単語メニューを開く
            </Button>
          )}
        </Card>
      </div>
    </article>
  );
}

function TodayComplete({
  summary,
  onOpenVocabularyHub,
}: {
  summary: ReturnType<typeof buildCompletionSummary>;
  onOpenVocabularyHub?: () => void;
}) {
  const summaryItems = useMemo(
    () => [
      {
        label: "学習時間",
        value: `目安 ${summary.estimatedStudyMinutes}分`,
      },
      { label: "復習", value: `${summary.reviewCount}件` },
      { label: "新しい単語", value: `${summary.newCount}件` },
      { label: "曖昧項目", value: `${summary.uncertainCount}件` },
    ],
    [summary],
  );
  return (
    <Card as="section" padding="large" className={styles.completeCard}>
      <span className={styles.completeMark} aria-hidden="true">
        ✓
      </span>
      <p className={styles.eyebrow}>今日のまとめ</p>
      <h2>今日のプランを終えました</h2>
      <p>おつかれさまでした。続けすぎず、ここで終えて大丈夫です。</p>
      <dl className={styles.summaryGrid}>
        {summaryItems.map((item) => (
          <div key={item.label}>
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
          </div>
        ))}
      </dl>
      <p>
        <strong>次回予定:</strong> {summary.nextDueLabel}
      </p>
      {onOpenVocabularyHub === undefined ? null : (
        <Button variant="secondary" onClick={onOpenVocabularyHub}>
          単語メニューを開く
        </Button>
      )}
    </Card>
  );
}
