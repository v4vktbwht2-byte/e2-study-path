import {
  useCallback,
  useEffect,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Link } from "react-router-dom";
import { FocusHeading } from "../../app/FocusHeading";
import type {
  DailyProgress,
  ProgressPeriodDays,
  ProgressSkill,
  ProgressSnapshot,
  SkillTrendDirection,
} from "../../domain/progress";
import {
  Card,
  EmptyState,
  ErrorState,
  InlineAlert,
  ProgressBar,
} from "../../shared/components";
import type { ProgressDataPort } from "./types";
import styles from "./ProgressPage.module.css";

const SKILL_LABELS: Readonly<Record<ProgressSkill, string>> = {
  vocabulary: "語彙",
  grammar: "文法",
  reading: "読解",
  listening: "聞き取り",
  writing: "作文",
  speaking: "会話",
};

const TREND_LABELS: Readonly<Record<SkillTrendDirection, string>> = {
  improving: "伸びています",
  steady: "安定しています",
  needsPractice: "短い復習がおすすめ",
  new: "新しい記録",
  noData: "記録待ち",
};

type MetricKey = "studyMinutes" | "reviewCount" | "newCount" | "completedLessonCount";

interface ProgressPageProps {
  readonly port: ProgressDataPort;
}

type LoadState =
  | { readonly status: "loading" }
  | { readonly status: "ready"; readonly snapshot: ProgressSnapshot }
  | { readonly status: "error"; readonly error: Error };

function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error("学習記録を読み込めませんでした。");
}

function formatMinutes(minutes: number): string {
  const safeMinutes = Math.max(0, Math.round(minutes));
  if (safeMinutes < 60) {
    return `${safeMinutes}分`;
  }
  const hours = Math.floor(safeMinutes / 60);
  const remainder = safeMinutes % 60;
  return remainder === 0 ? `${hours}時間` : `${hours}時間${remainder}分`;
}

function formatStudyDate(studyDate: string): string {
  const [, month = "", day = ""] = studyDate.split("-");
  return `${Number(month)}/${Number(day)}`;
}

function formatResponseTime(milliseconds: number): string {
  const seconds = Math.max(0, milliseconds) / 1_000;
  return seconds < 10 ? `${seconds.toFixed(1)}秒` : `${Math.round(seconds)}秒`;
}

function metricValue(day: DailyProgress, metric: MetricKey): number {
  return day[metric];
}

function metricText(metric: MetricKey, value: number): string {
  return metric === "studyMinutes" ? formatMinutes(value) : `${value}件`;
}

function chartSummary(
  daily: readonly DailyProgress[],
  metric: MetricKey,
  title: string,
): string {
  const total = daily.reduce((sum, day) => sum + metricValue(day, metric), 0);
  if (total === 0) {
    return `${daily.length}日間の${title}はまだありません。`;
  }
  const maximumDay = [...daily].sort(
    (left, right) =>
      metricValue(right, metric) - metricValue(left, metric) ||
      right.studyDate.localeCompare(left.studyDate),
  )[0];
  if (maximumDay === undefined) {
    return `${daily.length}日間の合計は${metricText(metric, total)}です。`;
  }
  return `${daily.length}日間の合計は${metricText(metric, total)}です。最も多い日は${formatStudyDate(maximumDay.studyDate)}の${metricText(metric, metricValue(maximumDay, metric))}です。`;
}

function MetricChart({
  daily,
  metric,
  title,
}: {
  readonly daily: readonly DailyProgress[];
  readonly metric: MetricKey;
  readonly title: string;
}) {
  const maximum = Math.max(1, ...daily.map((day) => metricValue(day, metric)));
  return (
    <figure className={styles.chart}>
      <figcaption className={styles.chartTitle}>{title}</figcaption>
      <div className={styles.plot} aria-hidden="true">
        {daily.map((day) => {
          const value = metricValue(day, metric);
          const percentage = value === 0 ? 0 : Math.max(8, (value / maximum) * 100);
          return (
            <span
              key={day.studyDate}
              className={styles.bar}
              style={{ "--bar-size": `${percentage}%` } as CSSProperties}
              title={`${formatStudyDate(day.studyDate)} ${metricText(metric, value)}`}
            />
          );
        })}
      </div>
      <div className={styles.chartDates} aria-hidden="true">
        <span>{formatStudyDate(daily[0]?.studyDate ?? "")}</span>
        <span>{formatStudyDate(daily.at(-1)?.studyDate ?? "")}</span>
      </div>
      <p className={styles.chartSummary}>{chartSummary(daily, metric, title)}</p>
    </figure>
  );
}

function SummaryMetric({
  label,
  value,
  detail,
}: {
  readonly label: string;
  readonly value: string;
  readonly detail: string;
}) {
  return (
    <div className={styles.metric}>
      <dt>{label}</dt>
      <dd className={styles.metricValue}>{value}</dd>
      <dd className={styles.metricDetail}>{detail}</dd>
    </div>
  );
}

function ItemLink({
  path,
  children,
}: {
  readonly path?: string;
  readonly children: ReactNode;
}) {
  return path === undefined ? (
    <strong>{children}</strong>
  ) : (
    <Link to={path}>{children}</Link>
  );
}

function WeaknessSection({ snapshot }: { readonly snapshot: ProgressSnapshot }) {
  const { weakness } = snapshot;
  const hasAny =
    weakness.weakItems.length > 0 ||
    weakness.recognitionRecallGaps.length > 0 ||
    weakness.lapses.length > 0 ||
    weakness.slowResponses.length > 0;

  return (
    <Card as="section" className={styles.section} aria-labelledby="weakness-title">
      <div className={styles.sectionHeading}>
        <div>
          <p className={styles.eyebrow}>次の学習のヒント</p>
          <h2 id="weakness-title">復習すると伸ばしやすい項目</h2>
        </div>
      </div>
      {!hasAny ? (
        <p className={styles.positiveEmpty}>
          この期間には、急いで見直す必要のある項目は見つかりませんでした。
        </p>
      ) : (
        <div className={styles.insightGrid}>
          <section aria-labelledby="weak-items-title">
            <h3 id="weak-items-title">苦手上位</h3>
            {weakness.weakItems.length === 0 ? (
              <p>大きな偏りはありません。</p>
            ) : (
              <ol className={styles.insightList}>
                {weakness.weakItems.map((item) => (
                  <li key={item.itemKey}>
                    <ItemLink path={item.path}>{item.label}</ItemLink>
                    <span>{item.reasons.join("・")}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section aria-labelledby="gap-title">
            <h3 id="gap-title">見れば分かる・思い出すの差</h3>
            {weakness.recognitionRecallGaps.length === 0 ? (
              <p>15ポイント以上の差はありません。</p>
            ) : (
              <ul className={styles.insightList}>
                {weakness.recognitionRecallGaps.map((item) => (
                  <li key={item.itemKey}>
                    <ItemLink path={item.path}>{item.label}</ItemLink>
                    <span>
                      認識{item.recognition}%・想起{item.recall}%（差{item.gap}）
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="lapse-title">
            <h3 id="lapse-title">再学習になった項目</h3>
            {weakness.lapses.length === 0 ? (
              <p>再学習の記録はありません。</p>
            ) : (
              <ul className={styles.insightList}>
                {weakness.lapses.map((item) => (
                  <li key={item.itemKey}>
                    <ItemLink path={item.path}>{item.label}</ItemLink>
                    <span>{item.lapseCount}回。短く思い出す練習がおすすめです。</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="slow-title">
            <h3 id="slow-title">ゆっくり考えた項目</h3>
            {weakness.slowResponses.length === 0 ? (
              <p>平均8秒以上の項目はありません。</p>
            ) : (
              <ul className={styles.insightList}>
                {weakness.slowResponses.map((item) => (
                  <li key={item.itemKey}>
                    <ItemLink path={item.path}>{item.label}</ItemLink>
                    <span>
                      平均{formatResponseTime(item.averageResponseTimeMs)}（
                      {item.attemptCount}回答）
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </Card>
  );
}

function SkillSection({ snapshot }: { readonly snapshot: ProgressSnapshot }) {
  return (
    <Card as="section" className={styles.section} aria-labelledby="skills-title">
      <div className={styles.sectionHeading}>
        <div>
          <p className={styles.eyebrow}>採点・自己評価の記録</p>
          <h2 id="skills-title">6技能の傾向</h2>
        </div>
      </div>
      <p className={styles.sectionLead}>
        正答率と自己評価を、直前の同じ長さの期間と比べています。公式スコアではありません。
      </p>
      <div className={styles.skillGrid}>
        {snapshot.skills.map((trend) => (
          <article key={trend.skill} className={styles.skillCard}>
            <div className={styles.skillHeader}>
              <h3>{SKILL_LABELS[trend.skill]}</h3>
              <span className={styles.trendLabel}>{TREND_LABELS[trend.direction]}</span>
            </div>
            {trend.score === null ? (
              <p className={styles.noScore}>採点できる記録はまだありません。</p>
            ) : (
              <ProgressBar
                value={trend.score}
                label={`${SKILL_LABELS[trend.skill]}の今回の目安`}
                valueText={`${trend.score}%・${trend.attemptCount}問`}
              />
            )}
            <p>{trend.summary}</p>
          </article>
        ))}
      </div>
    </Card>
  );
}

function StageSection({ snapshot }: { readonly snapshot: ProgressSnapshot }) {
  return (
    <Card as="section" className={styles.section} aria-labelledby="stage-title">
      <div className={styles.sectionHeading}>
        <div>
          <p className={styles.eyebrow}>コースの現在地</p>
          <h2 id="stage-title">ステージ進行</h2>
        </div>
        <Link to="/course">コースを見る</Link>
      </div>
      <div className={styles.stageGrid}>
        {snapshot.stages.map((stage) => (
          <article
            key={stage.stage}
            className={[
              styles.stageCard,
              stage.isCurrentStage ? styles.currentStage : "",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-current={stage.isCurrentStage ? "step" : undefined}
          >
            <div className={styles.stageHeader}>
              <h3>ステージ{stage.stage}</h3>
              {stage.isCurrentStage ? <span>現在地</span> : null}
            </div>
            <ProgressBar
              value={stage.completionRate}
              label={`ステージ${stage.stage}の完了率`}
              valueText={
                stage.totalLessonCount === 0
                  ? "教材準備中"
                  : `${stage.completedLessonCount} / ${stage.totalLessonCount}レッスン`
              }
            />
          </article>
        ))}
      </div>
    </Card>
  );
}

function ReadyProgress({ snapshot }: { readonly snapshot: ProgressSnapshot }) {
  return (
    <>
      <InlineAlert
        role="note"
        tone={snapshot.continuity.isRestartDay ? "success" : "info"}
        title={
          snapshot.continuity.isRestartDay
            ? "戻ってこられた日です"
            : "自分のペースで続けられています"
        }
      >
        {snapshot.continuity.message}
      </InlineAlert>

      {!snapshot.hasActivity ? (
        <EmptyState
          title="この期間の学習記録はまだありません"
          description={
            <>
              1問や1分の学習でも、終えるとここに記録されます。これまでの記録が消えたわけではありません。
            </>
          }
          actions={<Link to="/">今日の学習を開く</Link>}
        />
      ) : (
        <>
          <Card as="section" className={styles.section} aria-labelledby="summary-title">
            <h2 id="summary-title">期間のまとめ</h2>
            <p className={styles.textSummary}>{snapshot.textSummary}</p>
            <dl className={styles.metrics}>
              <SummaryMetric
                label="学習時間"
                value={formatMinutes(snapshot.totals.studyMinutes)}
                detail={`${snapshot.totals.activeDays}日取り組みました`}
              />
              <SummaryMetric
                label="復習した項目"
                value={`${snapshot.totals.reviewCount}件`}
                detail="以前に学んだ項目"
              />
              <SummaryMetric
                label="新しく学んだ項目"
                value={`${snapshot.totals.newCount}件`}
                detail="この期間に初めて取り組んだ項目"
              />
              <SummaryMetric
                label="完了レッスン"
                value={`${snapshot.totals.completedLessonCount}件`}
                detail="最後まで確認したレッスン"
              />
            </dl>
            <div className={styles.chartGrid}>
              <MetricChart
                daily={snapshot.daily}
                metric="studyMinutes"
                title="日別の学習時間"
              />
              <MetricChart
                daily={snapshot.daily}
                metric="reviewCount"
                title="日別の復習項目"
              />
              <MetricChart
                daily={snapshot.daily}
                metric="newCount"
                title="日別の新規項目"
              />
              <MetricChart
                daily={snapshot.daily}
                metric="completedLessonCount"
                title="日別の完了レッスン"
              />
            </div>
          </Card>
          <SkillSection snapshot={snapshot} />
          <WeaknessSection snapshot={snapshot} />
        </>
      )}

      <StageSection snapshot={snapshot} />

      <Card
        as="section"
        className={styles.continuity}
        aria-labelledby="continuity-title"
      >
        <h2 id="continuity-title">学習の積み重ね</h2>
        <dl>
          <div>
            <dt>今の連続日数</dt>
            <dd>{snapshot.continuity.currentStreak}日</dd>
          </div>
          <div>
            <dt>これまでの学習日</dt>
            <dd>{snapshot.continuity.totalActiveDays}日</dd>
          </div>
          <div>
            <dt>戻ってこられた回数</dt>
            <dd>{snapshot.continuity.restartCount}回</dd>
          </div>
        </dl>
        <p>連続日数が途切れても、学んだ記録は残ります。再開した日も大切な前進です。</p>
      </Card>
    </>
  );
}

export function ProgressPage({ port }: ProgressPageProps) {
  const [periodDays, setPeriodDays] = useState<ProgressPeriodDays>(7);
  const [reloadSequence, setReloadSequence] = useState(0);
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let active = true;
    setLoadState({ status: "loading" });
    void port
      .load(periodDays)
      .then((snapshot) => {
        if (active) {
          setLoadState({ status: "ready", snapshot });
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setLoadState({ status: "error", error: toError(error) });
        }
      });
    return () => {
      active = false;
    };
  }, [periodDays, port, reloadSequence]);

  const retry = useCallback(() => {
    setReloadSequence((current) => current + 1);
  }, []);

  return (
    <article className={styles.page} aria-labelledby="progress-title">
      <header className={styles.header}>
        <p className={styles.eyebrow}>端末内の学習データ</p>
        <FocusHeading id="progress-title">学習記録</FocusHeading>
        <p>学習の積み重ねと、次に復習すると伸ばしやすい項目を確認できます。</p>
      </header>

      <fieldset
        className={styles.periodSelector}
        disabled={loadState.status === "loading"}
      >
        <legend>表示期間</legend>
        <div className={styles.periodOptions}>
          {([7, 30] as const).map((days) => (
            <label
              key={days}
              className={periodDays === days ? styles.selectedPeriod : undefined}
            >
              <input
                type="radio"
                name="progress-period"
                value={days}
                checked={periodDays === days}
                onChange={() => {
                  setPeriodDays(days);
                }}
              />
              過去{days}日
            </label>
          ))}
        </div>
      </fieldset>

      {loadState.status === "loading" ? (
        <section className={styles.state} aria-live="polite" aria-busy="true">
          <h2>学習記録を読み込んでいます</h2>
          <p role="status">端末に保存された記録を集計しています。</p>
        </section>
      ) : loadState.status === "error" ? (
        <ErrorState
          title="学習記録を読み込めませんでした"
          description={
            <>
              {loadState.error.message}
              <br />
              端末内の学習データは削除されていません。
            </>
          }
          onRetry={retry}
        />
      ) : (
        <ReadyProgress snapshot={loadState.snapshot} />
      )}
    </article>
  );
}
