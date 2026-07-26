import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { LessonRenderer } from "../../features/lesson";
import { ErrorState } from "../../shared/components";
import { createPhase03FeatureAdapters } from "../featureAdapters";

export function LessonRoute() {
  const navigate = useNavigate();
  const { lessonId } = useParams();
  const adapters = useMemo(() => createPhase03FeatureAdapters(), []);

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
      onExit={() => navigate("/course")}
    />
  );
}
