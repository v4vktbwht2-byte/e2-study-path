import { useMemo } from "react";
import {
  createDexieProgressPort,
  ProgressPage,
  type ProgressClock,
  type ProgressDataPort,
} from "../../features/progress";
import { getAppDb } from "../../infrastructure/db/appDb";

export interface ProgressRouteProps {
  readonly port?: ProgressDataPort;
  readonly clock?: ProgressClock;
}

export function ProgressRoute({ port: injectedPort, clock }: ProgressRouteProps = {}) {
  const defaultPort = useMemo(
    () => createDexieProgressPort(getAppDb(), clock),
    [clock],
  );
  return <ProgressPage port={injectedPort ?? defaultPort} />;
}
