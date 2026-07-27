import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createAppStudyDayResolver } from "../featureAdapters";
import {
  createDexieListeningContentPort,
  createDexieListeningStudyStore,
  ListeningPage,
} from "../../features/listening";
import { createBrowserAudioService } from "../../infrastructure/audio";
import { getAppDb } from "../../infrastructure/db/appDb";
import { readPlanContext, readSetId } from "./practiceRouteUtils";

export function ListeningRoute() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const db = useMemo(() => getAppDb(), []);
  const initialSetId = readSetId(searchParams);
  const planContext = useMemo(() => readPlanContext(searchParams), [searchParams]);
  const content = useMemo(() => {
    const base = createDexieListeningContentPort(db);
    if (planContext === undefined || initialSetId === undefined) {
      return base;
    }
    return {
      async listListeningSets() {
        const values = await base.listListeningSets();
        return values.filter(
          (value) =>
            value !== null &&
            typeof value === "object" &&
            "id" in value &&
            value.id === initialSetId,
        );
      },
    };
  }, [db, initialSetId, planContext]);
  const store = useMemo(() => createDexieListeningStudyStore(db), [db]);
  const audio = useMemo(() => createBrowserAudioService(), []);
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

  return (
    <ListeningPage
      content={content}
      store={store}
      audio={audio}
      studyDayResolver={studyDayResolver}
      {...(initialSetId === undefined ? {} : { initialSetId })}
      {...(planContext === undefined ? {} : { planContext })}
      onBack={() => navigate("/practice")}
    />
  );
}
