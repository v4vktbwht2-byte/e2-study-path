import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  createDexieSpeakingStore,
  SpeakingPracticePage,
} from "../../features/speaking";
import { getAppDb } from "../../infrastructure/db/appDb";
import { readPlanContext, readSetId } from "./practiceRouteUtils";

export function SpeakingRoute() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const db = useMemo(() => getAppDb(), []);
  const setId = readSetId(searchParams);
  const planContext = useMemo(() => readPlanContext(searchParams), [searchParams]);
  const store = useMemo(() => {
    const base = createDexieSpeakingStore(db);
    if (planContext === undefined || setId === undefined) {
      return base;
    }
    return {
      async load() {
        const loaded = await base.load();
        return {
          ...loaded,
          sets: loaded.sets.filter((content) => content.set.id === setId),
        };
      },
      saveRecording: (recording) => base.saveRecording(recording),
      deleteRecording: (recordingId) => base.deleteRecording(recordingId),
      complete: (input) => base.complete(input),
    };
  }, [db, planContext, setId]);

  return (
    <SpeakingPracticePage
      store={store}
      {...(setId === undefined ? {} : { setId })}
      {...(planContext === undefined ? {} : { planContext })}
      onBack={() => navigate("/practice")}
    />
  );
}
