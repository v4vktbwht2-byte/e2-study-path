import { useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { LessonRenderer } from "../../features/lesson";
import { ErrorState } from "../../shared/components";
import { createPhase03FeatureAdapters } from "../featureAdapters";

export function LessonRoute() {
  const navigate = useNavigate();
  const { lessonId } = useParams();
  const [searchParams] = useSearchParams();
  const adapters = useMemo(() => createPhase03FeatureAdapters(), []);
  const planDate = searchParams.get("planDate")?.trim();
  const blockId = searchParams.get("blockId")?.trim();
  const itemKey = searchParams.get("itemKey")?.trim();
  const planContext =
    planDate && blockId && itemKey
      ? {
          planDate,
          blockId,
          itemKey,
        }
      : undefined;
  const exitPath = planContext === undefined ? "/course" : "/";

  if (!lessonId) {
    return (
      <section>
        <h1>レッスン</h1>
        <ErrorState
          title="レッスンが見つかりません"
          description="コース画面からレッスンを選び直してください。"
        />
      </section>
    );
  }

  return (
    <LessonRenderer
      lessonId={lessonId}
      content={adapters.lessonContent}
      progressStore={adapters.lessonProgressStore}
      studyDayResolver={adapters.studyDayResolver}
      {...(planContext === undefined
        ? {}
        : {
            planContext,
            onComplete: () => navigate("/"),
            onSkip: () => navigate("/"),
          })}
      onExit={() => navigate(exitPath)}
    />
  );
}
