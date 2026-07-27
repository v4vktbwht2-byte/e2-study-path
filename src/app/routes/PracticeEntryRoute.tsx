import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  createDexiePracticeHubPort,
  PracticeHubPage,
  type PracticeModule,
} from "../../features/practice";
import { getAppDb } from "../../infrastructure/db/appDb";
import { ErrorState } from "../../shared/components";
import {
  pathForPracticeType,
  readPlanContext,
  readSetId,
  searchWithSetId,
} from "./practiceRouteUtils";

const MODULE_PATHS: Readonly<Record<PracticeModule, string>> = {
  reading: "/practice/reading",
  listening: "/practice/listening",
  writing: "/practice/writing",
  speaking: "/practice/speaking",
  mock: "/mock",
};

type DispatchState =
  { status: "idle" | "loading" } | { status: "error"; message: string };

export function PracticeEntryRoute() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setId = readSetId(searchParams);
  const planContext = useMemo(() => readPlanContext(searchParams), [searchParams]);
  const db = useMemo(() => getAppDb(), []);
  const port = useMemo(() => createDexiePracticeHubPort(db), [db]);
  const [dispatchState, setDispatchState] = useState<DispatchState>({
    status: setId === undefined ? "idle" : "loading",
  });

  useEffect(() => {
    if (setId === undefined) {
      setDispatchState({ status: "idle" });
      return;
    }
    let active = true;
    setDispatchState({ status: "loading" });
    void db.practiceSets
      .get(setId)
      .then((set) => {
        if (!active) {
          return;
        }
        if (set === undefined) {
          setDispatchState({
            status: "error",
            message: `指定された技能教材 ${setId} が見つかりません。`,
          });
          return;
        }
        void navigate(
          `${pathForPracticeType(set.type)}${searchWithSetId(set.id, planContext)}`,
          { replace: true },
        );
      })
      .catch((error: unknown) => {
        if (active) {
          setDispatchState({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "技能教材を確認できませんでした。",
          });
        }
      });
    return () => {
      active = false;
    };
  }, [db, navigate, planContext, setId]);

  if (setId !== undefined && dispatchState.status === "loading") {
    return <p role="status">今日の技能練習を開いています。</p>;
  }
  if (dispatchState.status === "error") {
    return (
      <ErrorState
        title="技能教材を開けませんでした"
        description={dispatchState.message}
        onRetry={() => navigate("/practice", { replace: true })}
        retryLabel="技能練習の一覧へ"
      />
    );
  }

  return (
    <PracticeHubPage port={port} onOpen={(module) => navigate(MODULE_PATHS[module])} />
  );
}
