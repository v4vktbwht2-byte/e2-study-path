import { Suspense } from "react";
import { RouterProvider } from "react-router-dom";
import { FatalErrorBoundary } from "./FatalErrorBoundary";
import { RouterLoadingPage } from "./RouterLoadingPage";
import { createAppRouter } from "./router";
import { StartupGate } from "./startup/StartupGate";

const appRouter = createAppRouter();

export function App() {
  return (
    <FatalErrorBoundary>
      <StartupGate>
        <Suspense fallback={<RouterLoadingPage />}>
          <RouterProvider router={appRouter} />
        </Suspense>
      </StartupGate>
    </FatalErrorBoundary>
  );
}
