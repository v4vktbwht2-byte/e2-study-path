import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type {
  DiagnosticArea,
  DiagnosticQuestionLevel,
  DiagnosticStage,
} from "../../domain/diagnostic";
import { DIAGNOSTIC_AREAS, DIAGNOSTIC_STAGES } from "../../domain/diagnostic";
import {
  DiagnosticPage,
  type DiagnosticLessonSummary,
  type DiagnosticMode,
  type DiagnosticQuestionContent,
} from "../../features/diagnostic";
import type { Exercise } from "../../infrastructure/content/schemas";
import { getAppDb } from "../../infrastructure/db/appDb";
import { Card, ErrorState } from "../../shared/components";
import { createPhase03FeatureAdapters } from "../featureAdapters";

type LoadState =
  | { status: "loading" }
  | {
      status: "ready";
      questions: readonly DiagnosticQuestionContent[];
      lessons: readonly DiagnosticLessonSummary[];
      mode: DiagnosticMode;
    }
  | { status: "error"; message: string };

function diagnosticTagValue(
  tags: readonly string[],
  prefix: string,
): string | undefined {
  return tags.find((tag) => tag.startsWith(prefix))?.slice(prefix.length);
}

function isDiagnosticStage(value: number): value is DiagnosticStage {
  return DIAGNOSTIC_STAGES.some((stage) => stage === value);
}

function isDiagnosticArea(value: string | undefined): value is DiagnosticArea {
  return (
    value !== undefined && DIAGNOSTIC_AREAS.some((candidate) => candidate === value)
  );
}

function isDiagnosticLevel(
  value: string | undefined,
): value is DiagnosticQuestionLevel {
  return value === "foundation" || value === "standard" || value === "upper";
}

function toDiagnosticQuestion(
  exercise: Exercise,
  sequence: number,
): DiagnosticQuestionContent | undefined {
  const choices = Array.isArray(exercise.payload.choices)
    ? exercise.payload.choices.filter(
        (choice): choice is string => typeof choice === "string",
      )
    : [];
  const answerIndex =
    typeof exercise.answer === "number" ? exercise.answer : Number.NaN;
  const area = diagnosticTagValue(exercise.tags, "diagnostic:area:");
  const level = diagnosticTagValue(exercise.tags, "diagnostic:level:");

  if (
    !exercise.tags.includes("diagnostic") ||
    !isDiagnosticStage(exercise.stage) ||
    !isDiagnosticArea(area) ||
    !isDiagnosticLevel(level) ||
    choices.length < 2 ||
    !Number.isInteger(answerIndex) ||
    choices[answerIndex] === undefined
  ) {
    return undefined;
  }

  const passage =
    typeof exercise.payload.passage === "string" ? exercise.payload.passage.trim() : "";
  const speechText =
    typeof exercise.payload.speechText === "string"
      ? exercise.payload.speechText
      : undefined;

  return {
    id: exercise.id,
    stage: exercise.stage,
    area,
    level,
    sequence,
    prompt: passage.length > 0 ? `${passage}\n\n${exercise.prompt}` : exercise.prompt,
    ...(exercise.instructionsJa === undefined
      ? {}
      : { instructionsJa: exercise.instructionsJa }),
    kind: exercise.type === "listenAndChoose" ? "listeningChoice" : "singleChoice",
    choices: choices.map((choice) => ({ value: choice, label: choice })),
    acceptedAnswers: [choices[answerIndex]],
    ...(speechText === undefined ? {} : { audioTranscript: speechText }),
  };
}

export function DiagnosticRoute() {
  const navigate = useNavigate();
  const adapters = useMemo(() => createPhase03FeatureAdapters(), []);
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let active = true;
    const db = getAppDb();

    void Promise.all([
      db.exercises.where("tags").equals("diagnostic").toArray(),
      adapters.curriculumContent.listLessons(),
      adapters.profileRepository.get(),
      db.appMeta.get("diagnostic-session:initial"),
    ])
      .then(([exercises, lessons, profile, initialRun]) => {
        if (!active) {
          return;
        }
        const questions = exercises
          .sort(
            (left, right) =>
              left.stage - right.stage || left.id.localeCompare(right.id),
          )
          .map(toDiagnosticQuestion)
          .filter(
            (question): question is DiagnosticQuestionContent => question !== undefined,
          );
        setState({
          status: "ready",
          questions,
          lessons: lessons.map((lesson) => ({
            id: lesson.id,
            stage: lesson.stage,
            order: lesson.order,
            titleJa: lesson.titleJa,
            ...(lesson.descriptionJa === undefined
              ? {}
              : { descriptionJa: lesson.descriptionJa }),
          })),
          mode:
            initialRun !== undefined || !profile?.diagnosticCompletedAt
              ? "initial"
              : "reassessment",
        });
      })
      .catch((error: unknown) => {
        if (active) {
          setState({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "診断教材を読み込めませんでした。",
          });
        }
      });

    return () => {
      active = false;
    };
  }, [adapters]);

  if (state.status === "loading") {
    return (
      <section aria-busy="true" aria-live="polite">
        <Card as="section">
          <p role="status">診断教材を読み込んでいます…</p>
        </Card>
      </section>
    );
  }

  if (state.status === "error") {
    return (
      <section>
        <h1>初期診断</h1>
        <ErrorState
          title="診断教材を読み込めませんでした"
          description={state.message}
        />
      </section>
    );
  }

  return (
    <DiagnosticPage
      questions={state.questions}
      lessons={state.lessons}
      profileRepository={adapters.profileRepository}
      mode={state.mode}
      onComplete={async () => {
        await navigate("/");
      }}
    />
  );
}
