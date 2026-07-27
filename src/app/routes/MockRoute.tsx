import { useEffect, useMemo, useState } from "react";
import { useBlocker, useNavigate, useSearchParams } from "react-router-dom";
import { createDexieMockStore, MockPracticePage } from "../../features/mock";
import { createBrowserAudioService } from "../../infrastructure/audio";
import { getAppDb } from "../../infrastructure/db/appDb";
import { readPlanContext, readSetId } from "./practiceRouteUtils";

export function MockRoute() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const db = useMemo(() => getAppDb(), []);
  const store = useMemo(() => createDexieMockStore(db), [db]);
  const audio = useMemo(() => createBrowserAudioService(), []);
  const [active, setActive] = useState(false);
  const blocker = useBlocker(active);
  const setId = readSetId(searchParams);
  const planContext = useMemo(() => readPlanContext(searchParams), [searchParams]);

  useEffect(() => {
    if (blocker.state !== "blocked") {
      return;
    }
    if (
      window.confirm(
        "短縮模試はまだ終了していません。移動すると現在の回答は保存されません。移動しますか？",
      )
    ) {
      blocker.proceed();
    } else {
      blocker.reset();
    }
  }, [blocker]);

  return (
    <MockPracticePage
      store={store}
      audio={audio}
      {...(setId === undefined ? {} : { setId })}
      {...(planContext === undefined ? {} : { planContext })}
      onExit={() => navigate("/practice")}
      confirmExit={() => true}
      onOpenReview={(path) => navigate(path)}
      onActiveChange={setActive}
    />
  );
}
