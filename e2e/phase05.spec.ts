import { expect, test, type Page } from "@playwright/test";

interface SeededVocabulary {
  itemKey: string;
  headword: string;
  meaningJa: string;
}

interface StoredPlanState {
  targetMinutes: number;
  mode: string;
  completedBlockIds: string[];
  blockStatus?: string;
}

async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    viewportWidth: document.documentElement.clientWidth,
    contentWidth: Math.max(
      document.documentElement.scrollWidth,
      document.body.scrollWidth,
    ),
  }));
  expect(
    dimensions.contentWidth,
    `横幅${dimensions.viewportWidth}pxで横スクロールが発生しています。`,
  ).toBeLessThanOrEqual(dimensions.viewportWidth);
}

async function seedOverdueVocabulary(
  page: Page,
  overdueCount: number,
): Promise<SeededVocabulary> {
  await page.goto("/#/vocabulary");
  await expect(
    page.getByRole("heading", { level: 1, name: "今日の単語メニュー" }),
  ).toBeVisible();

  return page.evaluate(async (count) => {
    const toError = (error: DOMException | null, fallback: string): Error =>
      error instanceof Error ? error : new Error(fallback);
    const requestAsPromise = <T>(request: IDBRequest<T>) =>
      new Promise<T>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () =>
          reject(toError(request.error, "IndexedDBの操作に失敗しました。"));
      });
    const transactionDone = (transaction: IDBTransaction) =>
      new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () =>
          reject(toError(transaction.error, "IndexedDBの更新に失敗しました。"));
        transaction.onabort = () =>
          reject(toError(transaction.error, "IndexedDBの更新が中断されました。"));
      });
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("e2-study-path");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(toError(request.error, "IndexedDBを開けませんでした。"));
    });

    try {
      const vocabularyTransaction = database.transaction("vocabulary", "readonly");
      const vocabulary = await requestAsPromise<unknown[]>(
        vocabularyTransaction.objectStore("vocabulary").getAll(),
      );
      await transactionDone(vocabularyTransaction);
      const items: Array<{
        id: string;
        headword: string;
        meaningJa: string;
      }> = vocabulary
        .flatMap((value) => {
          if (typeof value !== "object" || value === null) {
            return [];
          }
          const record = value as {
            id?: unknown;
            headword?: unknown;
            meanings?: unknown;
          };
          const meanings: unknown[] = Array.isArray(record.meanings)
            ? (record.meanings as unknown[])
            : [];
          const firstMeaning: unknown = meanings[0];
          const meaningRecord =
            typeof firstMeaning === "object" && firstMeaning !== null
              ? (firstMeaning as Record<string, unknown>)
              : undefined;
          if (
            typeof record.id !== "string" ||
            typeof record.headword !== "string" ||
            meaningRecord === undefined ||
            typeof meaningRecord["ja"] !== "string"
          ) {
            return [];
          }
          return [
            {
              id: record.id,
              headword: record.headword,
              meaningJa: meaningRecord["ja"],
            },
          ];
        })
        .sort((left, right) => left.id.localeCompare(right.id));
      if (items.length < count || items[0] === undefined) {
        throw new Error(
          `期限超過seedには${count}語必要ですが、${items.length}語しかありません。`,
        );
      }

      const selected = items.slice(0, count);
      const stores = [
        "profiles",
        "settings",
        "reviewStates",
        "mastery",
        "attempts",
        "vocabularyUserStates",
        "lessonProgress",
        "sessions",
        "dailyPlans",
      ];
      const writeTransaction = database.transaction(stores, "readwrite");
      for (const storeName of [
        "reviewStates",
        "mastery",
        "attempts",
        "vocabularyUserStates",
        "lessonProgress",
        "sessions",
        "dailyPlans",
      ]) {
        writeTransaction.objectStore(storeName).clear();
      }

      const now = new Date().toISOString();
      writeTransaction.objectStore("profiles").put({
        id: "local-user",
        createdAt: now,
        updatedAt: now,
        goals: ["relearn"],
        dailyMinutes: 15,
        recommendedStage: 0,
        selectedStage: 0,
        onboardingCompleted: true,
      });
      writeTransaction.objectStore("settings").put({
        id: "settings",
        theme: "system",
        fontScale: 1,
        reducedMotion: false,
        dailyNewVocabularyLimit: 10,
        reviewIntensity: "standard",
        speechRate: 1,
        autoPlayAudio: false,
        showKanaPronunciationGuide: false,
        speedAdjustmentEnabled: true,
        studyDayStartHour: 4,
      });
      for (const item of selected) {
        writeTransaction.objectStore("reviewStates").put({
          itemKey: `vocab:${item.id}`,
          status: "review",
          learningStep: 0,
          intervalDays: 7,
          easeBias: 1,
          dueAt: "2000-01-01T00:00:00.000Z",
          lastReviewedAt: "1999-12-25T00:00:00.000Z",
          firstLearnedAt: "1999-12-01T00:00:00.000Z",
          reviewCount: 3,
          lapseCount: 0,
          consecutiveSuccesses: 2,
          lastRating: "good",
          updatedAt: "2000-01-01T00:00:00.000Z",
        });
      }
      await transactionDone(writeTransaction);

      return {
        itemKey: `vocab:${selected[0].id}`,
        headword: selected[0].headword,
        meaningJa: selected[0].meaningJa,
      };
    } finally {
      database.close();
    }
  }, overdueCount);
}

async function readStoredPlanState(
  page: Page,
  itemKey: string,
): Promise<StoredPlanState> {
  return page.evaluate(async (targetItemKey) => {
    const toError = (error: DOMException | null, fallback: string): Error =>
      error instanceof Error ? error : new Error(fallback);
    const isRecord = (value: unknown): value is Record<string, unknown> =>
      typeof value === "object" && value !== null;
    const blocksOf = (value: Record<string, unknown>): unknown[] =>
      Array.isArray(value["blocks"]) ? (value["blocks"] as unknown[]) : [];
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("e2-study-path");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(toError(request.error, "IndexedDBを開けませんでした。"));
    });

    try {
      const transaction = database.transaction("dailyPlans", "readonly");
      const plans = await new Promise<unknown[]>((resolve, reject) => {
        const request = transaction
          .objectStore("dailyPlans")
          .getAll() as unknown as IDBRequest<unknown[]>;
        request.onsuccess = () => resolve(request.result);
        request.onerror = () =>
          reject(toError(request.error, "日次プランを読み取れませんでした。"));
      });
      const plan = plans.find((value) => {
        if (!isRecord(value)) {
          return false;
        }
        return blocksOf(value).some(
          (block) => isRecord(block) && block["itemId"] === targetItemKey,
        );
      });
      if (!isRecord(plan)) {
        throw new Error(`単語 ${targetItemKey} を含む日次プランが見つかりません。`);
      }
      const targetBlock = blocksOf(plan).find(
        (block): block is Record<string, unknown> =>
          isRecord(block) && block["itemId"] === targetItemKey,
      );
      const completedBlockIds: unknown[] = Array.isArray(plan["completedBlockIds"])
        ? (plan["completedBlockIds"] as unknown[])
        : [];
      const blockStatus =
        targetBlock !== undefined && typeof targetBlock["status"] === "string"
          ? targetBlock["status"]
          : undefined;
      return {
        targetMinutes:
          typeof plan["targetMinutes"] === "number" ? plan["targetMinutes"] : -1,
        mode: typeof plan["mode"] === "string" ? plan["mode"] : "",
        completedBlockIds: completedBlockIds.filter(
          (value): value is string => typeof value === "string",
        ),
        ...(blockStatus === undefined ? {} : { blockStatus }),
      };
    } finally {
      database.close();
    }
  }, itemKey);
}

async function completeFirstTodayVocabularyBlock(
  page: Page,
  vocabulary: SeededVocabulary,
): Promise<string> {
  await page.goto("/#/");
  await expect(
    page.getByRole("heading", { level: 1, name: "今日の学習" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "今日の学習を始める", exact: true }).click();

  await expect(page).toHaveURL(/#\/vocabulary\/session\?.*planDate=.*blockId=/);
  const card = page.getByRole("article");
  await expect(
    card.getByRole("heading", {
      level: 2,
      name: vocabulary.headword,
      exact: true,
    }),
  ).toBeVisible();
  await card.getByRole("radio", { name: vocabulary.meaningJa, exact: true }).check();
  await card.getByRole("button", { name: "答えを確認" }).click();
  const goodButton = card.getByRole("button", {
    name: /^Good(?:、推奨)?$/,
  });
  await goodButton.click();
  await expect(
    page.getByRole("heading", { level: 1, name: "セッションを終えました" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "今日の学習へ戻る" }).click();

  await expect(page).toHaveURL(/#\/$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "今日の学習" }),
  ).toBeVisible();
  const progress = page.getByRole("progressbar", { name: "今日の完了率" });
  await expect(progress).toHaveAttribute("aria-valuetext", /^1\/\d+項目・\d+%$/);
  return (await progress.getAttribute("aria-valuetext")) ?? "";
}

test.describe("Phase 05 daily plan / backlog の主要フロー", () => {
  test("onboarding後のTodayに標準プラン、時間、内訳、単語ショートカットを表示する", async ({
    page,
  }) => {
    await page.goto("/#/");
    await page.getByRole("button", { name: "設定を始める" }).click();
    await page.getByRole("radio", { name: "15分" }).check();
    await page.getByRole("button", { name: "次へ" }).click();
    await page.getByRole("button", { name: "診断はあとで" }).click();

    await expect(
      page.getByRole("heading", { level: 1, name: "今日の学習" }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: /^残り/ })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "15分", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("button", { name: "標準で再計算" })).toBeVisible();
    const breakdown = page.locator('[aria-label="今日の内訳"]');
    await expect(breakdown).toContainText("復習期限");
    await expect(breakdown).toContainText("苦手");
    await expect(breakdown).toContainText("新しい単語");
    await expect(
      page.getByRole("heading", { level: 2, name: "今日の内訳" }),
    ).toBeVisible();
    await expect(
      page.getByText("単語集中ショートカット", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "単語メニューを開く" }),
    ).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("84件の期限超過で4コースを示し、軽めを復習15件・新規0件にする", async ({
    page,
  }) => {
    await seedOverdueVocabulary(page, 84);
    await page.goto("/#/");

    const backlogStatus = page
      .getByRole("status")
      .filter({ hasText: "復習がたまっています" });
    await expect(backlogStatus).toContainText("復習待ちが84件");
    await expect(backlogStatus).toContainText("軽めなら優先度の高い最大15件に絞り");
    await expect(backlogStatus).toContainText("残りは失敗扱いになりません");

    for (const mode of ["軽め", "標準", "しっかり", "すべて"]) {
      await expect(
        page.getByRole("heading", { level: 3, name: mode, exact: true }),
      ).toBeVisible();
    }
    const courseRegion = page.getByRole("region", {
      name: "4つの学習コース",
    });
    const lightCourse = courseRegion.getByRole("article").filter({
      has: page.getByRole("heading", { level: 3, name: "軽め", exact: true }),
    });
    await expect(lightCourse).toContainText("15件の復習・新規0件");
    await lightCourse.getByRole("button", { name: "軽めで再計算" }).click();
    await expect(lightCourse.getByRole("button", { name: "軽めで再計算" })).toHaveText(
      "選択中",
    );
    await expect(page.getByText("15項目", { exact: true })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("Todayの単語blockを完了し、戻ったTodayとreload後に完了状態を保持する", async ({
    page,
  }) => {
    const vocabulary = await seedOverdueVocabulary(page, 1);
    const progressText = await completeFirstTodayVocabularyBlock(page, vocabulary);

    await expect
      .poll(() => readStoredPlanState(page, vocabulary.itemKey))
      .toMatchObject({
        completedBlockIds: [vocabulary.itemKey],
        blockStatus: "completed",
      });

    await page.reload();
    const reloadedProgress = page.getByRole("progressbar", {
      name: "今日の完了率",
    });
    await expect(reloadedProgress).toHaveAttribute("aria-valuetext", progressText);
    await expect
      .poll(() => readStoredPlanState(page, vocabulary.itemKey))
      .toMatchObject({
        completedBlockIds: [vocabulary.itemKey],
        blockStatus: "completed",
      });
    await expectNoHorizontalOverflow(page);
  });

  test("学習時間を変更して再計算しても完了済みblockを保持する", async ({ page }) => {
    const vocabulary = await seedOverdueVocabulary(page, 1);
    await completeFirstTodayVocabularyBlock(page, vocabulary);

    await page.getByRole("button", { name: "5分", exact: true }).click();
    await page.getByRole("button", { name: "プランを再計算" }).click();
    await expect
      .poll(() => readStoredPlanState(page, vocabulary.itemKey))
      .toMatchObject({
        targetMinutes: 5,
        mode: "standard",
        completedBlockIds: [vocabulary.itemKey],
        blockStatus: "completed",
      });
    await expect(
      page.getByRole("progressbar", { name: "今日の完了率" }),
    ).toHaveAttribute("aria-valuetext", /^1\/\d+項目・\d+%$/);

    await page.reload();
    await expect(
      page.getByRole("button", { name: "5分", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect
      .poll(() => readStoredPlanState(page, vocabulary.itemKey))
      .toMatchObject({
        targetMinutes: 5,
        completedBlockIds: [vocabulary.itemKey],
        blockStatus: "completed",
      });
    await expectNoHorizontalOverflow(page);
  });
});
