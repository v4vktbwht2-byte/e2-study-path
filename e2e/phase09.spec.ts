import { expect, test } from "@playwright/test";
import { readAppDatabaseRecord, seedAppDatabase } from "./support/indexedDb";

test.describe("Phase 09 CI・静的配信・テスト基盤", () => {
  test("共通DB seed helperは不明なstoreを原子的に拒否する", async ({ page }) => {
    await page.goto("/#/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    const profile = {
      id: "phase09-atomic-profile",
      createdAt: "2026-07-27T00:00:00.000Z",
      updatedAt: "2026-07-27T00:00:00.000Z",
      goals: ["relearn"],
      dailyMinutes: 15,
      recommendedStage: 0,
      selectedStage: 0,
      onboardingCompleted: true,
    };

    await expect(
      seedAppDatabase(page, [
        { storeName: "profiles", records: [profile] },
        { storeName: "存在しないstore", records: [{ id: "invalid" }] },
      ]),
    ).rejects.toThrow(/必要なstoreがありません/u);
    await expect(
      readAppDatabaseRecord(page, "profiles", profile.id),
    ).resolves.toBeUndefined();

    await seedAppDatabase(page, [{ storeName: "profiles", records: [profile] }]);
    await expect(
      readAppDatabaseRecord<typeof profile>(page, "profiles", profile.id),
    ).resolves.toEqual(profile);
  });

  test("共通DB seed helperはputの同期例外でも先行書込みをrollbackする", async ({
    page,
  }) => {
    await page.goto("/#/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    const validProfile = {
      id: "phase09-rollback-profile",
      createdAt: "2026-07-27T00:00:00.000Z",
      updatedAt: "2026-07-27T00:00:00.000Z",
      goals: ["relearn"],
      dailyMinutes: 15,
      recommendedStage: 0,
      selectedStage: 0,
      onboardingCompleted: true,
    };
    const profileWithoutPrimaryKey = {
      createdAt: "2026-07-27T00:00:00.000Z",
      updatedAt: "2026-07-27T00:00:00.000Z",
      goals: ["relearn"],
      dailyMinutes: 15,
      recommendedStage: 0,
      selectedStage: 0,
      onboardingCompleted: true,
    };

    await expect(
      seedAppDatabase(page, [
        {
          storeName: "profiles",
          records: [validProfile, profileWithoutPrimaryKey],
        },
      ]),
    ).rejects.toThrow();
    await expect(
      readAppDatabaseRecord(page, "profiles", validProfile.id),
    ).resolves.toBeUndefined();
  });

  test("production previewでHash route・manifest・Service Workerを同時に配信する", async ({
    page,
    request,
  }) => {
    await page.goto("/#/progress");
    await expect(
      page.getByRole("heading", { level: 1, name: "学習記録" }),
    ).toBeVisible();

    const [manifestResponse, workerResponse, offlineResponse] = await Promise.all([
      request.get("/manifest.webmanifest"),
      request.get("/service-worker.js"),
      request.get("/offline.html"),
    ]);
    expect(manifestResponse.ok()).toBe(true);
    expect(workerResponse.ok()).toBe(true);
    expect(offlineResponse.ok()).toBe(true);
    expect(await workerResponse.text()).toContain("SKIP_WAITING");
    expect(await offlineResponse.text()).toContain("オフライン");
  });
});
