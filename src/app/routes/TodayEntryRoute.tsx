import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  createDexieTodayPort,
  TodayPage,
  type TodayClock,
  type TodayDataPort,
  type TodayNavigationContext,
} from "../../features/today";
import { getAppDb } from "../../infrastructure/db/appDb";
import styles from "./TodayEntryRoute.module.css";

export interface TodayEntryRouteProps {
  port?: TodayDataPort;
  clock?: TodayClock;
}

function withPlanContext(
  basePath: string,
  context: TodayNavigationContext,
  extra?: Readonly<Record<string, string>>,
): string {
  const query = new URLSearchParams({
    ...(extra ?? {}),
    planDate: context.planDate,
    blockId: context.blockId,
    itemKey: context.itemKey,
  });
  return `${basePath}?${query.toString()}`;
}

export function TodayEntryRoute({
  port: injectedPort,
  clock,
}: TodayEntryRouteProps = {}) {
  const navigate = useNavigate();
  const defaultPort = useMemo(() => createDexieTodayPort(getAppDb()), []);
  const port = injectedPort ?? defaultPort;

  return (
    <div className={styles.route}>
      <TodayPage
        port={port}
        {...(clock === undefined ? {} : { clock })}
        onRequireOnboarding={() => navigate("/onboarding", { replace: true })}
        onOpenLesson={(lessonId, context) =>
          navigate(withPlanContext(`/lesson/${lessonId}`, context))
        }
        onOpenVocabulary={(mode, limit, context) =>
          navigate(
            withPlanContext("/vocabulary/session", context, {
              mode,
              limit: String(limit),
            }),
          )
        }
        onOpenPractice={(practiceSetId, context) =>
          navigate(
            withPlanContext("/practice", context, {
              setId: practiceSetId,
            }),
          )
        }
        onOpenVocabularyHub={() => navigate("/vocabulary")}
      />
    </div>
  );
}
