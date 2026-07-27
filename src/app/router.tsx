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
    case "vocabulary":
      return async () => {
        const { VocabularyRoute } = await import("./routes/VocabularyRoutes");
        return { Component: VocabularyRoute };
      };
    case "vocabulary-session":
      return async () => {
        const { VocabularySessionRoute } = await import("./routes/VocabularyRoutes");
        return { Component: VocabularySessionRoute };
      };
    case "word":
      return async () => {
        const { WordDetailRoute } = await import("./routes/VocabularyRoutes");
        return { Component: WordDetailRoute };
      };
    case "review":
      return async () => {
        const { ReviewRoute } = await import("./routes/VocabularyRoutes");
        return { Component: ReviewRoute };
      };
    case "practice":
      return async () => {
        const { PracticeEntryRoute } = await import("./routes/PracticeEntryRoute");
        return { Component: PracticeEntryRoute };
      };
    case "reading":
      return async () => {
        const { ReadingRoute } = await import("./routes/ReadingRoute");
        return { Component: ReadingRoute };
      };
    case "listening":
      return async () => {
        const { ListeningRoute } = await import("./routes/ListeningRoute");
        return { Component: ListeningRoute };
      };
    case "writing":
      return async () => {
        const { WritingRoute } = await import("./routes/WritingRoute");
        return { Component: WritingRoute };
      };
    case "speaking":
      return async () => {
        const { SpeakingRoute } = await import("./routes/SpeakingRoute");
        return { Component: SpeakingRoute };
      };
    case "mock":
      return async () => {
        const { MockRoute } = await import("./routes/MockRoute");
        return { Component: MockRoute };
      };
    case "settings":
      return async () => {
        const { SettingsPage } = await import("../features/settings");
        return { Component: SettingsPage };
      };
    case "data":
      return async () => {
        const { DataRoute } = await import("./routes/DataRoute");
        return { Component: DataRoute };
      };
    case "help":
      return async () => {
        const { HelpPage } = await import("../features/help");
        return { Component: HelpPage };
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
