import { expect, test, type Page } from "@playwright/test";

const DATABASE_NAME = "e2-study-path";
const LESSON_ID = "lesson-s0-u1";
const LESSON_TITLE = "アルファベットを見分ける";

interface UserDataSnapshot {
  readonly profile: {
    readonly id: string;
    readonly dailyMinutes: number;
    readonly selectedStage: number;
    readonly onboardingCompleted: boolean;
  } | null;
  readonly lessonProgress: {
    readonly lessonId: string;
    readonly status: string;
    readonly currentSectionIndex: number;
  } | null;
  readonly vocabularyUserState: {
    readonly itemKey: string;
    readonly favorite: boolean;
    readonly note: string;
  } | null;
  readonly writingSubmission: {
    readonly id: string;
    readonly draft: string;
  } | null;
  readonly settingsCount: number;
  readonly attemptCount: number;
}

async function waitForApplication(page: Page) {
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: /英語を、基礎から少しずつ|今日の学習/u,
    }),
  ).toBeVisible();
}

async function waitForControllingServiceWorker(page: Page) {
  await page.evaluate(async () => {
    if (!("serviceWorker" in navigator)) {
      throw new Error("このブラウザーはService Workerに対応していません。");
    }
    await navigator.serviceWorker.ready;
  });

  if (
    !(await page.evaluate(
      () => "serviceWorker" in navigator && navigator.serviceWorker.controller !== null,
    ))
  ) {
    await page.reload();
    await waitForApplication(page);
  }

  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            "serviceWorker" in navigator && navigator.serviceWorker.controller !== null,
        ),
      { message: "Service Workerがページを制御するまで待機する" },
    )
    .toBe(true);
}

async function seedPhase07UserData(page: Page) {
  await page.evaluate(
    async ({ databaseName, lessonId }) => {
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(databaseName);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () =>
          reject(request.error ?? new Error("学習データベースを開けませんでした。"));
      });
      const now = "2026-07-27T06:00:00.000Z";
      const transaction = database.transaction(
        ["profiles", "lessonProgress", "vocabularyUserStates", "writingSubmissions"],
        "readwrite",
      );
      transaction.objectStore("profiles").put({
        id: "local-user",
        createdAt: now,
        updatedAt: now,
        goals: ["grade2"],
        dailyMinutes: 15,
        recommendedStage: 0,
        selectedStage: 0,
        onboardingCompleted: true,
      });
      transaction.objectStore("lessonProgress").put({
        lessonId,
        status: "inProgress",
        currentSectionIndex: 3,
        updatedAt: now,
      });
      transaction.objectStore("vocabularyUserStates").put({
        itemKey: "vocabulary:vocab-s0-001",
        favorite: true,
        note: "Phase 07 オフライン確認",
        suspended: false,
        updatedAt: now,
      });
      transaction.objectStore("writingSubmissions").put({
        id: "phase07-writing",
        promptId: "writing-summary-community",
        type: "summary",
        draft: "This draft must survive backup and restore.",
        wordCount: 8,
        checklist: { content: true },
        summaryMemo: "要点メモ",
        opinionOutline: {
          opinion: "",
          reason1: "",
          detail1: "",
          reason2: "",
          detail2: "",
          conclusion: "",
        },
        createdAt: now,
        updatedAt: now,
      });

      await new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () =>
          reject(
            transaction.error ?? new Error("テストデータを保存できませんでした。"),
          );
        transaction.onabort = () =>
          reject(
            transaction.error ?? new Error("テストデータの保存が中断されました。"),
          );
      });
      database.close();
    },
    { databaseName: DATABASE_NAME, lessonId: LESSON_ID },
  );
}

async function readUserDataSnapshot(page: Page): Promise<UserDataSnapshot> {
  return page.evaluate(
    async ({ databaseName, lessonId }) => {
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(databaseName);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () =>
          reject(request.error ?? new Error("学習データベースを開けませんでした。"));
      });
      const transaction = database.transaction(
        [
          "profiles",
          "lessonProgress",
          "vocabularyUserStates",
          "writingSubmissions",
          "settings",
          "attempts",
        ],
        "readonly",
      );
      const request = <T>(value: IDBRequest<T>) =>
        new Promise<T>((resolve, reject) => {
          value.onsuccess = () => resolve(value.result);
          value.onerror = () =>
            reject(value.error ?? new Error("保存データを読み込めませんでした。"));
        });
      const [profile, progress, vocabularyState, writing, settingsCount, attempts] =
        await Promise.all([
          request<unknown>(transaction.objectStore("profiles").get("local-user")),
          request<unknown>(transaction.objectStore("lessonProgress").get(lessonId)),
          request<unknown>(
            transaction
              .objectStore("vocabularyUserStates")
              .get("vocabulary:vocab-s0-001"),
          ),
          request<unknown>(
            transaction.objectStore("writingSubmissions").get("phase07-writing"),
          ),
          request<number>(transaction.objectStore("settings").count()),
          request<number>(transaction.objectStore("attempts").count()),
        ]);
      await new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () =>
          reject(transaction.error ?? new Error("保存データの読込に失敗しました。"));
        transaction.onabort = () =>
          reject(transaction.error ?? new Error("保存データの読込が中断されました。"));
      });
      database.close();

      const userProfile = profile as
        | {
            id: string;
            dailyMinutes: number;
            selectedStage: number;
            onboardingCompleted: boolean;
          }
        | undefined;
      const lessonProgress = progress as
        { lessonId: string; status: string; currentSectionIndex: number } | undefined;
      const vocabularyUserState = vocabularyState as
        { itemKey: string; favorite: boolean; note: string } | undefined;
      const writingSubmission = writing as { id: string; draft: string } | undefined;
      return {
        profile:
          userProfile === undefined
            ? null
            : {
                id: userProfile.id,
                dailyMinutes: userProfile.dailyMinutes,
                selectedStage: userProfile.selectedStage,
                onboardingCompleted: userProfile.onboardingCompleted,
              },
        lessonProgress:
          lessonProgress === undefined
            ? null
            : {
                lessonId: lessonProgress.lessonId,
                status: lessonProgress.status,
                currentSectionIndex: lessonProgress.currentSectionIndex,
              },
        vocabularyUserState:
          vocabularyUserState === undefined
            ? null
            : {
                itemKey: vocabularyUserState.itemKey,
                favorite: vocabularyUserState.favorite,
                note: vocabularyUserState.note,
              },
        writingSubmission:
          writingSubmission === undefined
            ? null
            : {
                id: writingSubmission.id,
                draft: writingSubmission.draft,
              },
        settingsCount,
        attemptCount: attempts,
      };
    },
    { databaseName: DATABASE_NAME, lessonId: LESSON_ID },
  );
}

test.describe("Phase 07 PWA・オフライン・バックアップ", () => {
  test("productionのmanifest・Service Worker・必須アイコンを配信する", async ({
    request,
  }) => {
    const manifestResponse = await request.get("/manifest.webmanifest");
    expect(manifestResponse.ok()).toBe(true);
    const manifest = (await manifestResponse.json()) as {
      name?: string;
      start_url?: string;
      scope?: string;
      display?: string;
      icons?: Array<{ src?: string; sizes?: string; purpose?: string }>;
    };
    expect(manifest).toMatchObject({
      name: "E2 Study Path — 基礎から続ける英語学習",
      start_url: "/",
      scope: "/",
      display: "standalone",
    });
    expect(manifest.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ src: "icons/icon-192.png", sizes: "192x192" }),
        expect.objectContaining({ src: "icons/icon-512.png", sizes: "512x512" }),
        expect.objectContaining({
          src: "icons/icon-maskable-512.png",
          sizes: "512x512",
          purpose: "maskable",
        }),
      ]),
    );

    const workerResponse = await request.get("/service-worker.js");
    expect(workerResponse.ok()).toBe(true);
    const workerSource = await workerResponse.text();
    expect(workerSource).toContain("SKIP_WAITING");
    expect(workerSource).toContain("content/pilot-core-ja-original/0.6.0/index.json");

    for (const iconPath of [
      "/icons/icon-192.png",
      "/icons/icon-512.png",
      "/icons/icon-maskable-512.png",
    ]) {
      const iconResponse = await request.get(iconPath);
      expect(iconResponse.ok()).toBe(true);
      expect(iconResponse.headers()["content-type"]).toContain("image/png");
      const iconBytes = await iconResponse.body();
      expect([...iconBytes.subarray(0, 8)]).toEqual([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      ]);
    }
  });

  test("Service Worker有効後はオフラインで今日・単語・保存済みレッスンを使え、回答を保持する", async ({
    page,
    context,
  }) => {
    await page.goto("/#/");
    await waitForApplication(page);
    await waitForControllingServiceWorker(page);
    await seedPhase07UserData(page);

    await page.goto("/#/");
    await expect(
      page.getByRole("heading", { level: 1, name: "今日の学習" }),
    ).toBeVisible();

    await context.setOffline(true);
    await page.reload();
    await expect(
      page.getByRole("heading", { level: 1, name: "今日の学習" }),
    ).toBeVisible();
    // PlaywrightのCDPオフライン切替はnavigator.onLineのイベントを常に発火しないため、
    // 実際の通信遮断後にブラウザーのoffline通知も再現する。
    await page.evaluate(() => globalThis.dispatchEvent(new Event("offline")));
    await expect(page.getByText("オフラインで利用中です")).toBeVisible();

    await page.goto("/#/vocabulary");
    await expect(
      page.getByRole("heading", { level: 1, name: "今日の単語メニュー" }),
    ).toBeVisible();

    await page.goto(`/#/lesson/${LESSON_ID}`);
    await expect(
      page.getByRole("heading", { level: 1, name: LESSON_TITLE }),
    ).toBeVisible();
    await expect(
      page.getByRole("progressbar", { name: "レッスンの進み具合" }),
    ).toHaveAttribute("aria-valuenow", "4");
    await expect(page.getByText(/前回の続きから再開しました。/u)).toBeVisible();

    const firstExercise = page.getByRole("heading", { level: 3 }).first().locator("..");
    await firstExercise.getByRole("radio").first().check();
    await firstExercise.getByRole("button", { name: "答えを確認" }).click();
    await expect
      .poll(async () => (await readUserDataSnapshot(page)).attemptCount)
      .toBe(1);

    await page.reload();
    await expect(
      page.getByRole("heading", { level: 1, name: LESSON_TITLE }),
    ).toBeVisible();
    const snapshot = await readUserDataSnapshot(page);
    expect(snapshot.attemptCount).toBe(1);
    expect(snapshot.lessonProgress).toMatchObject({
      lessonId: LESSON_ID,
      status: "inProgress",
      currentSectionIndex: 3,
    });
    expect(snapshot.vocabularyUserState).toMatchObject({
      favorite: true,
      note: "Phase 07 オフライン確認",
    });
  });

  test("バックアップを書き出し、全削除後に置換復元すると利用者データが一致する", async ({
    page,
  }) => {
    await page.goto("/#/");
    await waitForApplication(page);
    await seedPhase07UserData(page);
    const before = await readUserDataSnapshot(page);

    await page.goto("/#/settings/data");
    await expect(
      page.getByRole("heading", { level: 1, name: "データ管理" }),
    ).toBeVisible();
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "JSONを書き出す" }).click();
    const backupDownload = await downloadPromise;
    expect(backupDownload.suggestedFilename()).toMatch(
      /^e2-study-path-backup-\d{8}T\d{6}Z\.json$/u,
    );
    const backupPath = await backupDownload.path();
    if (backupPath === null) {
      throw new Error("バックアップの一時ファイルを取得できませんでした。");
    }
    await expect(page.getByText("バックアップを書き出しました")).toBeVisible();

    await page.getByRole("button", { name: "全利用者データの削除へ進む" }).click();
    const deleteDialog = page.getByRole("dialog", {
      name: "すべての利用者データを削除しますか",
    });
    await deleteDialog.getByLabel("確認のため「削除」と入力").fill("削除");
    await deleteDialog.getByRole("button", { name: "完全に削除" }).click();
    await expect(page).toHaveURL(/#\/onboarding$/u);

    const deleted = await readUserDataSnapshot(page);
    expect(deleted).toMatchObject({
      profile: null,
      lessonProgress: null,
      vocabularyUserState: null,
      writingSubmission: null,
      settingsCount: 1,
      attemptCount: 0,
    });

    await page.goto("/#/settings/data");
    await expect(
      page.getByRole("heading", { level: 1, name: "データ管理" }),
    ).toBeVisible();
    await page.getByLabel("バックアップJSON").setInputFiles(backupPath);
    await expect(
      page.getByRole("heading", { level: 3, name: "復元する内容" }),
    ).toBeVisible();
    await page.getByRole("radio", { name: /現在のデータを置換/u }).check();
    await page
      .getByRole("checkbox", {
        name: /置換前に現在の安全バックアップを書き出す/u,
      })
      .uncheck();
    await page.getByRole("button", { name: "復元内容を最終確認" }).click();
    const restoreDialog = page.getByRole("dialog", {
      name: "バックアップで置き換えますか",
    });
    await restoreDialog.getByRole("button", { name: "置換して復元" }).click();
    await expect(page.getByText("バックアップで置き換えました")).toBeVisible();

    const restored = await readUserDataSnapshot(page);
    expect(restored).toEqual(before);
  });

  test("320pxでも設定・データ管理・ヘルプに横スクロールが出ない", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    for (const path of ["/#/settings", "/#/settings/data", "/#/help"]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      const widths = await page.evaluate(() => ({
        client: document.documentElement.clientWidth,
        scroll: Math.max(
          document.documentElement.scrollWidth,
          document.body.scrollWidth,
        ),
      }));
      expect(widths.scroll).toBeLessThanOrEqual(widths.client);
    }
    await expect(
      page.getByText("アプリの更新があります", { exact: false }),
    ).toHaveCount(0);
  });
});
