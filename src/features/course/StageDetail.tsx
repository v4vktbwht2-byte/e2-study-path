import { useEffect, useRef } from "react";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  ProgressBar,
} from "../../shared/components";
import styles from "./Course.module.css";
import type {
  CourseStageSummary,
  CurriculumContentReader,
  CurriculumStage,
  LessonProgressStore,
} from "./types";
import { useCourseMap } from "./useCourseMap";

const LESSON_STATUS_LABEL = {
  notStarted: "未開始",
  inProgress: "途中から再開",
  completed: "完了",
  skipped: "学習済み",
} as const;

export interface StageDetailViewProps {
  stage: CourseStageSummary;
  onOpenLesson: (lessonId: string) => void;
  onBack?: () => void;
}

export function StageDetailView({ stage, onOpenLesson, onBack }: StageDetailViewProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const titleById = new Map(
    stage.lessons.map(({ lesson }) => [lesson.id, lesson.titleJa]),
  );

  useEffect(() => {
    headingRef.current?.focus();
  }, [stage.definition.stage]);

  return (
    <section className={styles.page} aria-labelledby="stage-detail-title">
      {onBack !== undefined ? (
        <Button variant="tertiary" onClick={onBack}>
          ステージマップへ戻る
        </Button>
      ) : null}
      <header className={styles.pageHeader}>
        <p className={styles.eyebrow}>ステージ{stage.definition.stage}</p>
        <h1 ref={headingRef} id="stage-detail-title" tabIndex={-1}>
          {stage.definition.titleJa}
        </h1>
        <p>{stage.definition.roleJa}</p>
        <p>{stage.definition.goalJa}</p>
        <ProgressBar
          value={stage.completionRate}
          label="このステージの完了率"
          valueText={`${stage.completedLessonCount} / ${stage.totalLessonCount}レッスン`}
        />
      </header>

      {stage.lessons.length === 0 ? (
        <EmptyState
          title="レッスンを準備しています"
          description="ほかのステージも自由に確認できます。"
        />
      ) : (
        <ol className={styles.lessonList} aria-label="レッスン一覧">
          {stage.lessons.map((summary, index) => {
            const unmetTitles = summary.unmetPrerequisiteIds.map(
              (id) => titleById.get(id) ?? id,
            );
            return (
              <li key={summary.lesson.id}>
                <Card
                  as="article"
                  className={[
                    styles.lessonCard,
                    summary.isRecommendedNext ? styles.recommendedLesson : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <div className={styles.cardHeader}>
                    <div>
                      <p className={styles.lessonOrder}>レッスン{index + 1}</p>
                      <h2>{summary.lesson.titleJa}</h2>
                    </div>
                    <span className={styles.statusBadge}>
                      {LESSON_STATUS_LABEL[summary.status]}
                    </span>
                  </div>
                  {summary.lesson.descriptionJa !== undefined ? (
                    <p>{summary.lesson.descriptionJa}</p>
                  ) : null}
                  <p className={styles.meta}>約{summary.lesson.estimatedMinutes}分</p>
                  <ul className={styles.objectiveList}>
                    {summary.lesson.objectivesJa.map((objective) => (
                      <li key={objective}>{objective}</li>
                    ))}
                  </ul>

                  {!summary.prerequisitesMet ? (
                    <p className={styles.advice}>
                      先に「{unmetTitles.join("、")}
                      」を学ぶのがおすすめです。このまま始めることもできます。
                    </p>
                  ) : null}
                  {summary.isRecommendedNext ? (
                    <p className={styles.recommendedText}>次のおすすめです</p>
                  ) : null}

                  <Button
                    variant={summary.isRecommendedNext ? "primary" : "secondary"}
                    onClick={() => {
                      onOpenLesson(summary.lesson.id);
                    }}
                  >
                    {summary.status === "inProgress"
                      ? "続きから始める"
                      : summary.status === "completed" || summary.status === "skipped"
                        ? "もう一度見る"
                        : "このレッスンを始める"}
                  </Button>
                </Card>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

export interface StageDetailProps {
  stage: CurriculumStage;
  content: CurriculumContentReader;
  progressStore: LessonProgressStore;
  recommendedStage: CurriculumStage;
  onOpenLesson: (lessonId: string) => void;
  onBack?: () => void;
}

export function StageDetail({
  stage,
  content,
  progressStore,
  recommendedStage,
  onOpenLesson,
  onBack,
}: StageDetailProps) {
  const { state, reload } = useCourseMap(
    content,
    progressStore,
    stage,
    recommendedStage,
  );

  if (state.status === "loading") {
    return (
      <section className={styles.page} aria-busy="true">
        <h1 tabIndex={-1}>ステージ情報を準備しています</h1>
        <p role="status">ステージ情報を読み込んでいます。</p>
      </section>
    );
  }
  if (state.status === "error") {
    return (
      <section className={styles.page}>
        <ErrorState
          title="ステージ情報を読み込めませんでした"
          description={state.error.message}
          headingLevel={1}
          onRetry={reload}
        />
      </section>
    );
  }

  const selected = state.snapshot.stages.find(
    ({ definition }) => definition.stage === stage,
  );
  if (selected === undefined) {
    return (
      <section className={styles.page}>
        <ErrorState
          title="ステージが見つかりません"
          description="ステージマップへ戻って、もう一度選んでください。"
          headingLevel={1}
        />
      </section>
    );
  }
  return (
    <StageDetailView stage={selected} onOpenLesson={onOpenLesson} onBack={onBack} />
  );
}
