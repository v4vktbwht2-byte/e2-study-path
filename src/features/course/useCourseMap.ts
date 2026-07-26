import { useCallback, useEffect, useState } from "react";
import { loadCourseMap } from "./courseModel";
import type {
  CourseMapSnapshot,
  CurriculumContentReader,
  CurriculumStage,
  LessonProgressStore,
} from "./types";

type CourseLoadState =
  | { status: "loading" }
  | { status: "ready"; snapshot: CourseMapSnapshot }
  | { status: "error"; error: Error };

function toError(value: unknown): Error {
  return value instanceof Error
    ? value
    : new Error("コース情報の読み込みに失敗しました。");
}

export function useCourseMap(
  content: CurriculumContentReader,
  progressStore: LessonProgressStore,
  currentStage: CurriculumStage,
  recommendedStage: CurriculumStage,
) {
  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState<CourseLoadState>({ status: "loading" });
  const reload = useCallback(() => {
    setReloadKey((current) => current + 1);
  }, []);

  useEffect(() => {
    let active = true;
    setState({ status: "loading" });
    void loadCourseMap(content, progressStore, currentStage, recommendedStage)
      .then((snapshot) => {
        if (active) {
          setState({ status: "ready", snapshot });
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setState({ status: "error", error: toError(error) });
        }
      });
    return () => {
      active = false;
    };
  }, [content, currentStage, progressStore, recommendedStage, reloadKey]);

  return { state, reload };
}
