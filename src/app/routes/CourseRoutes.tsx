import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { UserProfile } from "../../domain/models";
import {
  CourseMap,
  StageDetail,
  type CurriculumStage,
} from "../../features/course";
import { Button, Card, ErrorState } from "../../shared/components";
import { createPhase03FeatureAdapters } from "../featureAdapters";

type ProfileState =
  | { status: "loading" }
  | { status: "ready"; profile?: UserProfile }
  | { status: "error"; message: string };

function useCourseProfile() {
  const adapters = useMemo(() => createPhase03FeatureAdapters(), []);
  const [state, setState] = useState<ProfileState>({ status: "loading" });

  useEffect(() => {
    let active = true;
    void adapters.profileRepository
      .get()
      .then((profile) => {
        if (active) {
          setState({ status: "ready", profile });
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setState({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "学習地点を読み込めませんでした。",
          });
        }
      });

    return () => {
      active = false;
    };
  }, [adapters]);

  return { adapters, state };
}

function CourseRouteLoading() {
  return (
    <section aria-busy="true" aria-live="polite">
      <Card as="section">
        <p role="status">学習地点を読み込んでいます…</p>
      </Card>
    </section>
  );
}

function CourseRouteError({ message }: { message: string }) {
  return (
    <section>
      <h1>コース</h1>
      <ErrorState
        title="学習地点を読み込めませんでした"
        description={message}
      />
    </section>
  );
}

function normalizeStage(value: string | undefined): CurriculumStage | undefined {
  const normalized = value?.replace(/^stage-/, "");
  const stage = Number(normalized);
  return Number.isInteger(stage) && stage >= 0 && stage <= 6
    ? (stage as CurriculumStage)
    : undefined;
}

export function CourseRoute() {
  const navigate = useNavigate();
  const { adapters, state } = useCourseProfile();

  if (state.status === "loading") {
    return <CourseRouteLoading />;
  }
  if (state.status === "error") {
    return <CourseRouteError message={state.message} />;
  }

  const currentStage = (state.profile?.selectedStage ?? 0) as CurriculumStage;
  const recommendedStage = (state.profile?.recommendedStage ??
    currentStage) as CurriculumStage;

  return (
    <CourseMap
      content={adapters.curriculumContent}
      progressStore={adapters.lessonProgressStore}
      currentStage={currentStage}
      recommendedStage={recommendedStage}
      onOpenStage={(stage) => navigate(`/course/stage/${stage}`)}
      onOpenLesson={(lessonId) => navigate(`/lesson/${lessonId}`)}
    />
  );
}

export function StageRoute() {
  const navigate = useNavigate();
  const { stageId } = useParams();
  const stage = normalizeStage(stageId);
  const { adapters, state } = useCourseProfile();

  if (state.status === "loading") {
    return <CourseRouteLoading />;
  }
  if (state.status === "error") {
    return <CourseRouteError message={state.message} />;
  }
  if (stage === undefined) {
    return (
      <section>
        <h1>ステージ詳細</h1>
        <ErrorState
          title="ステージが見つかりません"
          description="ステージ0〜6から選び直してください。"
          actions={
            <Button type="button" onClick={() => navigate("/course")}>
              ステージマップへ
            </Button>
          }
        />
      </section>
    );
  }

  const recommendedStage = (state.profile?.recommendedStage ??
    state.profile?.selectedStage ??
    0) as CurriculumStage;

  return (
    <StageDetail
      stage={stage}
      content={adapters.curriculumContent}
      progressStore={adapters.lessonProgressStore}
      recommendedStage={recommendedStage}
      onOpenLesson={(lessonId) => navigate(`/lesson/${lessonId}`)}
      onBack={() => navigate("/course")}
    />
  );
}
