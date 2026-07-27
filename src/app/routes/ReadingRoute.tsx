import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createAppStudyDayResolver } from "../featureAdapters";
import {
  createDexieReadingContentPort,
  createDexieReadingLearningStore,
  ReadingHubPage,
  ReadingPracticePage,
} from "../../features/reading";
import { getAppDb } from "../../infrastructure/db/appDb";
import { readPlanContext, readSetId, searchWithSetId } from "./practiceRouteUtils";

export function ReadingRoute() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const db = useMemo(() => getAppDb(), []);
  const content = useMemo(() => createDexieReadingContentPort(db), [db]);
  const store = useMemo(() => createDexieReadingLearningStore(db), [db]);
  const setId = readSetId(searchParams);
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

  if (setId === undefined) {
    return (
      <ReadingHubPage
        content={content}
        onSelectSet={(set) => navigate(`/practice/reading${searchWithSetId(set.id)}`)}
      />
    );
  }

  return (
    <ReadingPracticePage
      setId={setId}
      content={content}
      store={store}
      studyDayResolver={studyDayResolver}
      {...(planContext === undefined ? {} : { planContext })}
      onExit={() => navigate("/practice/reading")}
    />
  );
}
