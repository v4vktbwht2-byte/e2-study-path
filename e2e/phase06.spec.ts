import { expect, test, type Page } from "@playwright/test";

async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    viewportWidth: document.documentElement.clientWidth,
    contentWidth: Math.max(
      document.documentElement.scrollWidth,
      document.body.scrollWidth,
    ),
  }));
  expect(dimensions.contentWidth).toBeLessThanOrEqual(dimensions.viewportWidth);
}

async function countStore(page: Page, storeName: string) {
  return page.evaluate(
    ({ databaseName, targetStore }) =>
      new Promise<number>((resolve, reject) => {
        const openRequest = indexedDB.open(databaseName);
        openRequest.onerror = () =>
          reject(
            openRequest.error ?? new Error("学習データベースを開けませんでした。"),
          );
        openRequest.onsuccess = () => {
          const database = openRequest.result;
          const transaction = database.transaction(targetStore, "readonly");
          const countRequest = transaction.objectStore(targetStore).count();
          countRequest.onerror = () =>
            reject(countRequest.error ?? new Error("保存件数を取得できませんでした。"));
          countRequest.onsuccess = () => resolve(countRequest.result);
          transaction.oncomplete = () => database.close();
        };
      }),
    { databaseName: "e2-study-path", targetStore: storeName },
  );
}

async function seedSpeakingDailyPlan(page: Page) {
  await page.evaluate(
    ({ planDate, itemKey }) =>
      new Promise<void>((resolve, reject) => {
        const openRequest = indexedDB.open("e2-study-path");
        openRequest.onerror = () =>
          reject(
            openRequest.error ?? new Error("学習データベースを開けませんでした。"),
          );
        openRequest.onsuccess = () => {
          const database = openRequest.result;
          const transaction = database.transaction("dailyPlans", "readwrite");
          transaction.objectStore("dailyPlans").put({
            date: planDate,
            generatedAt: "2026-07-27T00:00:00.000Z",
            targetMinutes: 15,
            mode: "standard",
            blocks: [
              {
                blockId: "phase06-speaking-block",
                itemId: itemKey,
                category: "skillPractice",
                estimatedSeconds: 480,
                status: "pending",
                skill: "speaking",
              },
            ],
            completedBlockIds: [],
            sourceSnapshot: {
              dueCount: 0,
              overdueCount: 0,
              newLimit: 0,
            },
            capacity: {
              requestedMinutes: 15,
              effectiveMinutes: 15,
              budgetSeconds: 900,
              estimatedReviewItemCapacity: 30,
            },
            plannedSeconds: 480,
            remainingBudgetSeconds: 420,
          });
          transaction.oncomplete = () => {
            database.close();
            resolve();
          };
          transaction.onerror = () =>
            reject(
              transaction.error ?? new Error("今日の学習を保存できませんでした。"),
            );
          transaction.onabort = () =>
            reject(
              transaction.error ?? new Error("今日の学習の保存が中断されました。"),
            );
        };
      }),
    {
      planDate: "2026-07-27",
      itemKey: "practice:speaking-community-garden",
    },
  );
}

async function readSpeakingPlanStatus(page: Page) {
  return page.evaluate(
    () =>
      new Promise<{ status?: string; completedBlockIds?: string[] }>(
        (resolve, reject) => {
          const openRequest = indexedDB.open("e2-study-path");
          openRequest.onerror = () =>
            reject(
              openRequest.error ?? new Error("学習データベースを開けませんでした。"),
            );
          openRequest.onsuccess = () => {
            const database = openRequest.result;
            const transaction = database.transaction("dailyPlans", "readonly");
            const request = transaction.objectStore("dailyPlans").get("2026-07-27");
            request.onerror = () =>
              reject(request.error ?? new Error("今日の学習を取得できませんでした。"));
            request.onsuccess = () => {
              const plan = request.result as
                | {
                    blocks?: Array<{ blockId: string; status: string }>;
                    completedBlockIds?: string[];
                  }
                | undefined;
              resolve({
                status: plan?.blocks?.find(
                  (block) => block.blockId === "phase06-speaking-block",
                )?.status,
                completedBlockIds: plan?.completedBlockIds,
              });
            };
            transaction.oncomplete = () => database.close();
          };
        },
      ),
  );
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      get: () => false,
    });
  });
});

test("技能練習ハブから読解を完了して履歴保存できる", async ({ page }) => {
  await page.goto("/#/practice");
  await expect(page.getByRole("heading", { level: 1, name: "技能練習" })).toBeVisible();
  await page.getByRole("button", { name: "読解練習を選ぶ" }).click();
  await page
    .getByRole("button", { name: /を始める$/ })
    .first()
    .click();
  await expect(page.getByRole("button", { name: "設問へ進む" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.getByRole("button", { name: "設問へ進む" }).click();

  for (let index = 0; index < 2; index += 1) {
    await page.locator('input[type="radio"]').first().check();
    await page.getByRole("button", { name: "回答を確定" }).click();
    await page.locator('input[type="radio"]').first().check();
    await page.getByRole("button", { name: "根拠を確認" }).click();
    await page
      .getByRole("button", {
        name: index === 1 ? "結果を見る" : "次の設問へ",
      })
      .click();
  }

  await expect(
    page.getByRole("heading", { name: "読解セットを完了しました" }),
  ).toBeVisible();
  expect(await countStore(page, "attempts")).toBeGreaterThanOrEqual(2);
});

test("音声非対応時もリスニングを自己練習として完了できる", async ({ page }) => {
  await page.goto("/#/practice/listening");
  await page
    .getByRole("button", { name: /を開く$/ })
    .first()
    .click();
  await page.getByRole("button", { name: "本番風で始める" }).click();

  await expect(page.getByText(/音声を使わずに続けられます/u)).toBeVisible();
  await expect(page.getByRole("heading", { name: "スクリプト" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.getByRole("button", { name: "スクリプト自己練習を完了" }).click();

  await expect(
    page.getByRole("heading", { name: "リスニング練習を記録しました" }),
  ).toBeVisible();
});

test("ライティング下書きを提出し、自動正誤なしで保存できる", async ({ page }) => {
  await page.goto("/#/practice/writing");
  await expect(
    page.getByRole("heading", { level: 1, name: "英文要約と意見英作文" }),
  ).toBeVisible();
  await page
    .getByLabel("英文を書く")
    .fill(
      "The project shares safe food with local people. It reduces waste and helps families save money. Volunteers check the food every day. However, the center receives too much bread, so it plans to work with farms and restaurants to offer a better balance of useful food.",
    );
  await expect(page.getByText("下書きを保存しました")).toBeVisible();
  await page.getByRole("checkbox", { name: /内容/ }).check();
  await expect(page.getByText("下書きを保存しました")).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.getByRole("button", { name: "自己評価と一緒に提出" }).click();

  await expect(page.getByText(/作文と自己評価を端末内に保存しました/u)).toBeVisible();
  await expect(
    page.getByText("自由作文のため、自動の正誤判定はありません。"),
  ).toBeVisible();
});

test("Today形式のqueryから会話へ自動振分けし、plan blockを完了する", async ({
  page,
}) => {
  await page.goto("/#/practice");
  await expect(page.getByRole("heading", { level: 1, name: "技能練習" })).toBeVisible();
  await seedSpeakingDailyPlan(page);
  const query = new URLSearchParams({
    setId: "speaking-community-garden",
    planDate: "2026-07-27",
    blockId: "phase06-speaking-block",
    itemKey: "practice:speaking-community-garden",
  });
  await page.goto(`/#/practice?${query.toString()}`);
  await expect(page).toHaveURL(/#\/practice\/speaking\?/u);
  await page.getByRole("button", { name: "練習を始める" }).click();
  await expectNoHorizontalOverflow(page);
  await page.getByRole("button", { name: "黙読できたので次へ" }).click();
  await page.getByRole("button", { name: "音読を終えた" }).click();
  await page.getByRole("button", { name: "この回答で次へ" }).click();
  await page.getByRole("button", { name: "説明を始める" }).click();
  await page.getByRole("button", { name: "説明を終えた" }).click();
  await page.getByRole("button", { name: "この回答で次へ" }).click();
  await page.getByRole("button", { name: "この回答で次へ" }).click();
  await page.getByRole("button", { name: "自己評価を保存して完了" }).click();

  await expect(
    page.getByRole("heading", { name: "スピーキング練習を完了しました" }),
  ).toBeVisible();
  await expect
    .poll(() => readSpeakingPlanStatus(page))
    .toEqual({
      status: "completed",
      completedBlockIds: ["phase06-speaking-block"],
    });
});

test("短縮模試を完了し、結果が公式スコアでないと確認できる", async ({ page }) => {
  await page.goto("/#/mock");
  await page.getByRole("button", { name: "内容を確認" }).click();
  await expect(page.getByText(/リーディング・ライティング85分/u)).toBeVisible();
  await page.getByRole("button", { name: "短縮模試を始める" }).click();

  for (let index = 0; index < 6; index += 1) {
    const scriptButton = page.getByRole("button", { name: "スクリプトを開く" });
    if (await scriptButton.isVisible().catch(() => false)) {
      await scriptButton.click();
    }
    await page.locator('input[type="radio"]').first().check();
    await page
      .getByRole("button", {
        name: index === 5 ? "採点して保存" : "次の問題へ",
      })
      .click();
  }

  await expect(
    page.getByRole("heading", { name: "短縮模試を終えました" }),
  ).toBeVisible();
  await expect(page.getByText("公式スコアではありません")).toBeVisible();
  await expectNoHorizontalOverflow(page);
  expect(await countStore(page, "sessions")).toBeGreaterThanOrEqual(1);
});

test("短縮模試中の下部ナビ移動を1回の中断警告で取り消せる", async ({ page }) => {
  await page.goto("/#/mock");
  await page.getByRole("button", { name: "内容を確認" }).click();
  await page.getByRole("button", { name: "短縮模試を始める" }).click();
  let dialogCount = 0;
  page.on("dialog", async (dialog) => {
    dialogCount += 1;
    await dialog.dismiss();
  });

  await page.getByRole("link", { name: "今日", exact: true }).click();

  await expect.poll(() => dialogCount).toBe(1);
  await expect(
    page.getByRole("heading", { level: 1, name: /短縮模試/u }),
  ).toBeVisible();
  await expect(page).toHaveURL(/#\/mock/u);
});
