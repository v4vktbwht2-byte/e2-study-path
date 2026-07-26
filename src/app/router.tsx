import { createHashRouter, type RouteObject } from "react-router-dom";
import { AppLayout } from "./AppLayout";
import { RouteErrorPage } from "./RouteErrorPage";
import { RouterLoadingPage } from "./RouterLoadingPage";
import { foundationRoutes, type FoundationRouteId } from "./routeCatalog";

function lazyPreparationRoute(routeId: FoundationRouteId) {
  return async () => {
    const { PreparationPage } = await import("../features/foundation/PreparationPage");

    return {
      Component: function FoundationPreparationRoute() {
        return <PreparationPage routeId={routeId} />;
      },
    };
  };
}

function lazyFoundationRoute(routeId: FoundationRouteId) {
  switch (routeId) {
    case "today":
      return async () => {
        const { TodayEntryRoute } = await import("./routes/TodayEntryRoute");
        return { Component: TodayEntryRoute };
      };
    case "onboarding":
      return async () => {
        const { OnboardingPage } = await import("../features/onboarding");
        return { Component: OnboardingPage };
      };
    case "diagnostic":
      return async () => {
        const { DiagnosticRoute } = await import("./routes/DiagnosticRoute");
        return { Component: DiagnosticRoute };
      };
    case "course":
      return async () => {
        const { CourseRoute } = await import("./routes/CourseRoutes");
        return { Component: CourseRoute };
      };
    case "stage":
      return async () => {
        const { StageRoute } = await import("./routes/CourseRoutes");
        return { Component: StageRoute };
      };
    case "lesson":
      return async () => {
        const { LessonRoute } = await import("./routes/LessonRoute");
        return { Component: LessonRoute };
      };
    default:
      return lazyPreparationRoute(routeId);
  }
}

export const appRouteObjects: RouteObject[] = [
  {
    id: "app-shell",
    path: "/",
    Component: AppLayout,
    ErrorBoundary: RouteErrorPage,
    HydrateFallback: RouterLoadingPage,
    children: [
      ...foundationRoutes.map((route): RouteObject => {
        if (route.path === "/") {
          return {
            id: route.id,
            index: true,
            lazy: lazyFoundationRoute(route.id),
          };
        }

        return {
          id: route.id,
          path: route.path.slice(1),
          lazy: lazyFoundationRoute(route.id),
        };
      }),
      {
        id: "not-found",
        path: "*",
        lazy: async () => {
          const { NotFoundPage } = await import("./NotFoundPage");
          return { Component: NotFoundPage };
        },
      },
    ],
  },
];

export function createAppRouter() {
  return createHashRouter(appRouteObjects);
}
