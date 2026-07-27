import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createAppStudyDayResolver } from "../featureAdapters";
import { pilotWritingPracticeSets } from "../../content/pilot/practiceWriting";
import { createDexieWritingLearningPort, WritingPage } from "../../features/writing";
import { getAppDb } from "../../infrastructure/db/appDb";
import { readPlanContext, readSetId } from "./practiceRouteUtils";

export function WritingRoute() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const db = useMemo(() => getAppDb(), []);
  const port = useMemo(() => createDexieWritingLearningPort(db), [db]);
  const initialPromptId = readSetId(searchParams);
  const planContext = useMemo(() => readPlanContext(searchParams), [searchParams]);
  const appStudyDayResolver = useMemo(() => createAppStudyDayResolver(db), [db]);
  const studyDayResolver = useMemo(
    () =>
      planContext === undefined
        ? appStudyDayResolver
        : (now: Date) =>
            Promise.resolve({
              studyDate: planContext.planDate,
              studyDayStartMs: now.getTime(),
            }),
    [appStudyDayResolver, planContext],
  );
  const practiceSets = useMemo(
    () =>
      planContext === undefined || initialPromptId === undefined
        ? pilotWritingPracticeSets
        : pilotWritingPracticeSets.filter((set) => set.id === initialPromptId),
    [initialPromptId, planContext],
  );

  return (
    <WritingPage
      practiceSets={practiceSets}
      port={port}
      studyDayResolver={studyDayResolver}
      {...(initialPromptId === undefined ? {} : { initialPromptId })}
      {...(planContext === undefined ? {} : { planContext })}
      onReturnToToday={() => navigate("/")}
    />
  );
}
