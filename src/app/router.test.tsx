import { describe, expect, it } from "vitest";
import { matchRoutes } from "react-router-dom";
import { appRouteObjects } from "./router";
import { foundationRoutes } from "./routeCatalog";

const routeSamples: Record<string, string> = {
  ":stageId": "stage-0",
  ":lessonId": "lesson-sample",
  ":wordId": "word-sample",
};

function createSamplePath(path: string) {
  return Object.entries(routeSamples).reduce(
    (samplePath, [parameter, value]) =>
      samplePath.replace(parameter, encodeURIComponent(value)),
    path,
  );
}

describe("アプリルーター", () => {
  it("情報設計にある20ルートを登録している", () => {
    expect(foundationRoutes.map((route) => route.path)).toEqual([
      "/",
      "/onboarding",
      "/diagnostic",
      "/course",
      "/course/stage/:stageId",
      "/lesson/:lessonId",
      "/vocabulary",
      "/vocabulary/session",
      "/vocabulary/:wordId",
      "/review",
      "/practice",
      "/practice/reading",
      "/practice/listening",
      "/practice/writing",
      "/practice/speaking",
      "/mock",
      "/progress",
      "/settings",
      "/settings/data",
      "/help",
    ]);
  });

  it.each(foundationRoutes)("$path が対応する準備画面へ一致する", (route) => {
    const matches = matchRoutes(appRouteObjects, createSamplePath(route.path));

    expect(matches?.at(-1)?.route.id).toBe(route.id);
  });

  it("未知のルートはNot Found画面へ一致する", () => {
    const matches = matchRoutes(appRouteObjects, "/unknown-screen");

    expect(matches?.at(-1)?.route.id).toBe("not-found");
  });

  it("各準備画面に目的・実装Phase・関連ルートがある", () => {
    for (const route of foundationRoutes) {
      expect(route.purpose.length).toBeGreaterThan(10);
      expect(route.phase).toMatch(/^Phase \d+$/);
      expect(route.plannedFeatures.length).toBeGreaterThan(0);
      expect(route.relatedRoutes.length).toBeGreaterThan(0);
    }
  });
});
