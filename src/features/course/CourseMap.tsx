import { useEffect, useRef } from "react";
import { Button, Card, ErrorState, ProgressBar } from "../../shared/components";
import styles from "./Course.module.css";
import type {
  CourseMapSnapshot,
  CurriculumContentReader,
  CurriculumStage,
  LessonProgressStore,
} from "./types";
import { useCourseMap } from "./useCourseMap";

const STATUS_LABEL = {
  notStarted: "未開始",
  inProgress: "進行中",
  completed: "完了",
} as const;

export interface CourseMapViewProps {
  snapshot: CourseMapSnapshot;
  onOpenStage: (stage: CurriculumStage) => void;
  onOpenLesson?: (lessonId: string) => void;
}

export function CourseMapView({
  snapshot,
  onOpenStage,
  onOpenLesson,
}: CourseMapViewProps) {
  const recommendedLesson = snapshot.recommendedNextLesson;
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <section className={styles.page} aria-labelledby="course-map-title">
      <header className={styles.pageHeader}>
        <p className={styles.eyebrow}>学習コース</p>
        <h1 ref={headingRef} id="course-map-title" tabIndex={-1}>
          ステージマップ
        </h1>
        <p>おすすめ順を目安に進めます。どのステージからでも始められます。</p>
      </header>

      {recommendedLesson !== undefined && onOpenLesson !== undefined ? (
        <Card as="section" className={styles.recommendation}>
          <p className={styles.eyebrow}>次のおすすめ</p>
          <h2>{recommendedLesson.lesson.titleJa}</h2>
          <p>
            ステージ{recommendedLesson.lesson.stage}・約
            {recommendedLesson.lesson.estimatedMinutes}分
          </p>
          <Button
            onClick={() => {
              onOpenLesson(recommendedLesson.lesson.id);
            }}
          >
            おすすめを始める
          </Button>
        </Card>
      ) : null}

      <ol className={styles.stageList} aria-label="ステージ0から6">
        {snapshot.stages.map((stage) => (
          <li key={stage.definition.stage}>
            <Card
              as="article"
              className={[styles.stageCard, stage.isCurrentStage ? styles.current : ""]
                .filter(Boolean)
                .join(" ")}
              aria-current={stage.isCurrentStage ? "step" : undefined}
            >
              <div className={styles.cardHeader}>
                <div>
                  <p className={styles.stageNumber}>ステージ{stage.definition.stage}</p>
                  <h2>{stage.definition.titleJa}</h2>
                </div>
                <div className={styles.badges} role="group" aria-label="ステージの状態">
                  {stage.isCurrentStage ? (
                    <span className={styles.currentBadge}>現在地</span>
                  ) : null}
                  {stage.isRecommendedStage ? (
                    <span className={styles.recommendedBadge}>おすすめ開始地点</span>
                  ) : null}
                  <span className={styles.statusBadge}>
                    {STATUS_LABEL[stage.status]}
                  </span>
                </div>
              </div>

              <p className={styles.role}>{stage.definition.roleJa}</p>
              <p>{stage.definition.goalJa}</p>
              <ProgressBar
                value={stage.completionRate}
                label={`ステージ${stage.definition.stage}の完了率`}
                valueText={
                  stage.totalLessonCount === 0
                    ? "教材準備中"
                    : `${stage.completedLessonCount} / ${stage.totalLessonCount}レッスン`
                }
              />

              {stage.nextLesson !== undefined ? (
                <p className={styles.nextLesson}>
                  次のレッスン: {stage.nextLesson.lesson.titleJa}
                </p>
              ) : (
                <p className={styles.nextLesson}>
                  {stage.totalLessonCount === 0
                    ? "このステージの教材を準備しています。"
                    : "このステージのレッスンを確認できました。"}
                </p>
              )}

              <Button
                variant={stage.isCurrentStage ? "primary" : "secondary"}
                onClick={() => {
                  onOpenStage(stage.definition.stage);
                }}
              >
                ステージ{stage.definition.stage}を見る
              </Button>
            </Card>
          </li>
        ))}
      </ol>
    </section>
  );
}

export interface CourseMapProps extends Omit<CourseMapViewProps, "snapshot"> {
  content: CurriculumContentReader;
  progressStore: LessonProgressStore;
  currentStage: CurriculumStage;
  recommendedStage: CurriculumStage;
}

export function CourseMap({
  content,
  progressStore,
  currentStage,
  recommendedStage,
  onOpenStage,
  onOpenLesson,
}: CourseMapProps) {
  const { state, reload } = useCourseMap(
    content,
    progressStore,
    currentStage,
    recommendedStage,
  );

  if (state.status === "loading") {
    return (
      <section className={styles.page} aria-busy="true">
        <h1 tabIndex={-1}>ステージマップを準備しています</h1>
        <p role="status">コース情報を読み込んでいます。</p>
      </section>
    );
  }
  if (state.status === "error") {
    return (
      <section className={styles.page}>
        <ErrorState
          title="コース情報を読み込めませんでした"
          description={state.error.message}
          headingLevel={1}
          onRetry={reload}
        />
      </section>
    );
  }

  return (
    <CourseMapView
      snapshot={state.snapshot}
      onOpenStage={onOpenStage}
      onOpenLesson={onOpenLesson}
    />
  );
}
