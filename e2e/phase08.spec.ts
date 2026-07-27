import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { readAppDatabaseRecord, seedAppDatabase } from "./support/indexedDb";

const DEFAULT_STUDY_DAY_START_HOUR = 4;

const ACCESSIBILITY_ROUTES = [
  "/#/",
  "/#/course",
  "/#/vocabulary",
  "/#/practice",
  "/#/practice?setId=not-a-set",
  "/#/practice/reading",
  "/#/practice/listening",
  "/#/practice/writing",
  "/#/practice/speaking",
  "/#/progress",
  "/#/settings",
  "/#/settings/data",
  "/#/help",
  "/#/vocabulary/not-a-word",
] as const;

async function waitForPageHeading(page: Page) {
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0, {
    timeout: 10_000,
  });
}

async function tabUntilFocused(
  page: Page,
  target: Locator,
  maximumTabs = 40,
): Promise<void> {
  await expect(target).toBeVisible();
  for (let index = 0; index < maximumTabs; index += 1) {
    if (await target.evaluate((element) => element === document.activeElement)) {
      return;
    }
    await page.keyboard.press("Tab");
  }
  expect(
    await target.evaluate((element) => element === document.activeElement),
    `${maximumTabs}回Tabを押しても対象へフォーカスできませんでした。`,
  ).toBe(true);
}

async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: Math.max(
      document.documentElement.scrollWidth,
      document.body.scrollWidth,
    ),
  }));
  expect(
    dimensions.scrollWidth,
    `横幅${dimensions.clientWidth}pxで横スクロールが発生しています。`,
  ).toBeLessThanOrEqual(dimensions.clientWidth);
}

async function expectMinimumTargetSize(
  target: Locator,
  viewportWidth: number,
  minimum = 44,
) {
  await target.scrollIntoViewIfNeeded();
  const box = await target.boundingBox();
  expect(box, "操作対象の表示領域を取得できませんでした。").not.toBeNull();
  if (box === null) {
    return;
  }
  expect(box.width, "操作対象の幅が44 CSS px未満です。").toBeGreaterThanOrEqual(
    minimum,
  );
  expect(box.height, "操作対象の高さが44 CSS px未満です。").toBeGreaterThanOrEqual(
    minimum,
  );
  expect(box.x, "操作対象の左端が画面外です。").toBeGreaterThanOrEqual(0);
  expect(box.x + box.width, "操作対象の右端が画面外です。").toBeLessThanOrEqual(
    viewportWidth,
  );
}

async function expectCurrentPageAccessibility(page: Page, routeLabel: string) {
  await waitForPageHeading(page);
  await expect(page.getByRole("main")).toHaveCount(1);
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(page.getByRole("heading", { level: 1 })).toBeFocused();

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"])
    .analyze();
  const severeViolations = results.violations
    .filter(
      (violation) => violation.impact === "serious" || violation.impact === "critical",
    )
    .map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      targets: violation.nodes.flatMap((node) => node.target),
    }));

  expect(
    severeViolations,
    `${routeLabel} に重大なアクセシビリティ違反があります。`,
  ).toEqual([]);

  const targetSizeResults = await new AxeBuilder({ page })
    .withRules("target-size")
    .analyze();
  expect(
    targetSizeResults.violations.map((violation) => ({
      id: violation.id,
      targets: violation.nodes.flatMap((node) => node.target),
    })),
    `${routeLabel} に24 CSS px未満の操作対象があります。`,
  ).toEqual([]);
}

async function seedSettingsProfile(page: Page) {
  const now = new Date().toISOString();
  await seedAppDatabase(page, [
    {
      storeName: "profiles",
      records: [
        {
          id: "local-user",
          createdAt: now,
          updatedAt: now,
          goals: ["relearn"],
          dailyMinutes: 15,
          recommendedStage: 0,
          selectedStage: 0,
          onboardingCompleted: true,
        },
      ],
    },
  ]);
}

async function readStoredPreferences(page: Page) {
  const [profile, settings] = await Promise.all([
    readAppDatabaseRecord(page, "profiles", "local-user"),
    readAppDatabaseRecord(page, "settings", "settings"),
  ]);
  return { profile, settings };
}

async function seedProgressData(page: Page) {
  return page.evaluate(async (studyDayStartHour) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("e2-study-path");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(request.error ?? new Error("IndexedDBを開けませんでした。"));
    });
    const shiftDate = (calendarDate: string, days: number) => {
      const date = new Date(`${calendarDate}T00:00:00.000Z`);
      date.setUTCDate(date.getUTCDate() + days);
      return date.toISOString().slice(0, 10);
    };
    const formatter = new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
    });
    const dateParts = formatter.formatToParts(new Date());
    const datePart = (type: Intl.DateTimeFormatPartTypes) =>
      dateParts.find((part) => part.type === type)?.value ?? "";
    const calendarDate = [datePart("year"), datePart("month"), datePart("day")].join(
      "-",
    );
    const currentStudyDate =
      Number(datePart("hour")) < studyDayStartHour
        ? shiftDate(calendarDate, -1)
        : calendarDate;
    const previousStudyDate = shiftDate(currentStudyDate, -10);
    const currentStart = `${currentStudyDate}T10:00:00.000Z`;
    const currentEnd = `${currentStudyDate}T10:15:00.000Z`;
    const lessonStart = `${currentStudyDate}T10:15:00.000Z`;
    const lessonEnd = `${currentStudyDate}T10:20:00.000Z`;
    const previousStart = `${previousStudyDate}T10:00:00.000Z`;
    const previousEnd = `${previousStudyDate}T10:10:00.000Z`;
    const vocabularyItemKey = "vocab:vocab-s0-book";
    const newItemKey = "vocab:vocab-s0-day";
    const lessonId = "lesson-s0-u1";
    const transaction = database.transaction(
      ["profiles", "attempts", "sessions", "reviewStates", "mastery", "lessonProgress"],
      "readwrite",
    );
    for (const storeName of [
      "attempts",
      "sessions",
      "reviewStates",
      "mastery",
      "lessonProgress",
    ]) {
      transaction.objectStore(storeName).clear();
    }
    transaction.objectStore("profiles").put({
      id: "local-user",
      createdAt: previousStart,
      updatedAt: currentEnd,
      goals: ["relearn"],
      dailyMinutes: 15,
      recommendedStage: 0,
      selectedStage: 0,
      onboardingCompleted: true,
    });
    transaction.objectStore("attempts").put({
      id: "progress-attempt-previous",
      itemKey: vocabularyItemKey,
      sessionId: "progress-session-previous",
      createdAt: previousEnd,
      studyDate: previousStudyDate,
      mode: "recognitionChoice",
      response: 0,
      correct: true,
      score: 1,
      responseTimeMs: 4_000,
      hintCount: 0,
      finalRating: "good",
    });
    transaction.objectStore("attempts").put({
      id: "progress-attempt-review",
      itemKey: vocabularyItemKey,
      sessionId: "progress-session-current",
      createdAt: currentEnd,
      studyDate: currentStudyDate,
      mode: "recognitionChoice",
      response: 1,
      correct: false,
      score: 0,
      responseTimeMs: 10_000,
      hintCount: 0,
      finalRating: "again",
    });
    transaction.objectStore("attempts").put({
      id: "progress-attempt-new",
      itemKey: newItemKey,
      sessionId: "progress-session-current",
      createdAt: currentEnd,
      studyDate: currentStudyDate,
      mode: "recognitionChoice",
      response: 0,
      correct: true,
      score: 1,
      responseTimeMs: 3_000,
      hintCount: 0,
      finalRating: "good",
    });
    transaction.objectStore("sessions").put({
      id: "progress-session-previous",
      type: "vocabulary",
      startedAt: previousStart,
      endedAt: previousEnd,
      studyDate: previousStudyDate,
      itemKeys: [vocabularyItemKey],
      completedItemKeys: [vocabularyItemKey],
      interrupted: false,
    });
    transaction.objectStore("sessions").put({
      id: "progress-session-current",
      type: "vocabulary",
      startedAt: currentStart,
      endedAt: currentEnd,
      studyDate: currentStudyDate,
      itemKeys: [vocabularyItemKey, newItemKey],
      completedItemKeys: [vocabularyItemKey, newItemKey],
      interrupted: false,
    });
    transaction.objectStore("sessions").put({
      id: "progress-session-lesson",
      type: "lesson",
      startedAt: lessonStart,
      endedAt: lessonEnd,
      studyDate: currentStudyDate,
      itemKeys: [`lesson:${lessonId}`],
      completedItemKeys: [`lesson:${lessonId}`],
      interrupted: false,
    });
    transaction.objectStore("reviewStates").put({
      itemKey: vocabularyItemKey,
      status: "relearning",
      learningStep: 1,
      intervalDays: 1,
      easeBias: 0,
      dueAt: "2000-01-01T00:00:00.000Z",
      lastReviewedAt: currentEnd,
      firstLearnedAt: previousStart,
      reviewCount: 2,
      lapseCount: 2,
      consecutiveSuccesses: 0,
      lastRating: "again",
      updatedAt: currentEnd,
    });
    transaction.objectStore("mastery").put({
      itemKey: vocabularyItemKey,
      recognition: 85,
      recall: 40,
      listening: 30,
      spelling: 25,
      context: 35,
      lastUpdatedAt: currentEnd,
    });
    transaction.objectStore("lessonProgress").put({
      lessonId,
      status: "completed",
      currentSectionIndex: 5,
      completedAt: lessonEnd,
      updatedAt: lessonEnd,
    });
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () =>
        reject(transaction.error ?? new Error("進捗データを保存できませんでした。"));
      transaction.onabort = () =>
        reject(transaction.error ?? new Error("進捗データ保存が中断されました。"));
    });
    database.close();
    return { currentStudyDate, previousStudyDate };
  }, DEFAULT_STUDY_DAY_START_HOUR);
}

test.describe("Phase 08 記録・設定・アクセシビリティ", () => {
  test.use({ timezoneId: "Asia/Tokyo" });

  test("主要画面に重大なaxe違反と重複mainランドマークがない", async ({ page }) => {
    for (const path of ACCESSIBILITY_ROUTES) {
      await page.goto(path);
      await expectCurrentPageAccessibility(page, path);
    }

    await seedSettingsProfile(page);
    await page.goto("/#/");
    await expect(
      page.getByRole("heading", { level: 1, name: "今日の学習" }),
    ).toBeVisible();
    await expectCurrentPageAccessibility(page, "初回設定完了後の今日の学習");
  });

  test("320px・文字200%でも主要画面と下部ナビが横へ切れない", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    for (const path of ["/#/progress", "/#/settings", "/#/practice"] as const) {
      await page.goto(path);
      await waitForPageHeading(page);
      await page.evaluate(() => {
        document.documentElement.style.fontSize = "200%";
      });

      await expectNoHorizontalOverflow(page);
      const navigation = page.getByRole("navigation", { name: "メインメニュー" });
      await expect(navigation).toBeVisible();
      await expect(navigation.getByRole("link")).toHaveCount(5);
      for (const link of await navigation.getByRole("link").all()) {
        await expect(link).toBeInViewport();
        await expectMinimumTargetSize(link, 320);
      }
      const auxiliaryNavigation = page.getByRole("navigation", {
        name: "補助メニュー",
      });
      for (const link of await auxiliaryNavigation.getByRole("link").all()) {
        await expectMinimumTargetSize(link, 320);
      }
    }

    await page.goto("/#/progress");
    await expect(
      page.getByRole("heading", { level: 1, name: "学習記録" }),
    ).toBeVisible();
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "200%";
    });
    for (const radio of await page
      .getByRole("radio", { name: /過去(?:7|30)日/u })
      .all()) {
      await expectMinimumTargetSize(radio.locator(".."), 320);
    }
    await expectMinimumTargetSize(
      page.getByRole("link", { name: "コースを見る" }),
      320,
    );

    // 320物理pxでページzoom 200%にしたときの約160 CSS px相当をproxy検証する。
    await page.setViewportSize({ width: 160, height: 640 });
    await page.goto("/#/practice");
    await waitForPageHeading(page);
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "100%";
    });
    await expectNoHorizontalOverflow(page);
    for (const link of await page
      .getByRole("navigation", { name: "メインメニュー" })
      .getByRole("link")
      .all()) {
      await expectMinimumTargetSize(link, 160);
    }
    for (const link of await page
      .getByRole("navigation", { name: "補助メニュー" })
      .getByRole("link")
      .all()) {
      await expectMinimumTargetSize(link, 160);
    }
  });

  test("7種類の設定を即時反映し、再読込後も保持する", async ({ page }) => {
    await page.goto("/#/settings");
    await waitForPageHeading(page);
    await seedSettingsProfile(page);
    await page.reload();

    const dailyMinutes = page.getByRole("spinbutton", {
      name: "1日の学習時間",
    });
    await expect(dailyMinutes).toBeEnabled();
    await dailyMinutes.fill("25");
    await page.getByRole("spinbutton", { name: "1日の新しい単語の上限" }).fill("7");
    await page.getByRole("combobox", { name: "復習の強さ" }).selectOption("strong");
    await page.getByRole("combobox", { name: "英語音声の速さ" }).selectOption("0.75");
    await page.getByRole("radio", { name: /^ダーク/u }).check();
    await page.getByRole("radio", { name: /^さらに大きく（130%）/u }).check();
    await page.getByRole("checkbox", { name: /^画面の動きを減らす/u }).check();

    await expect(page.getByRole("status", { name: "設定の保存状態" })).toHaveText(
      "設定をこの端末に保存しました。",
    );
    await expect
      .poll(() =>
        page.evaluate(() => ({
          theme: document.documentElement.dataset.theme,
          reducedMotion: document.documentElement.dataset.reducedMotion,
          fontSize: document.documentElement.style.fontSize,
        })),
      )
      .toEqual({
        theme: "dark",
        reducedMotion: "true",
        fontSize: "130%",
      });
    await expect
      .poll(() => readStoredPreferences(page))
      .toMatchObject({
        profile: { dailyMinutes: 25 },
        settings: {
          dailyNewVocabularyLimit: 7,
          reviewIntensity: "strong",
          speechRate: 0.75,
          theme: "dark",
          fontScale: 1.3,
          reducedMotion: true,
        },
      });

    await page.reload();
    await expect(dailyMinutes).toHaveValue("25");
    await expect(
      page.getByRole("spinbutton", { name: "1日の新しい単語の上限" }),
    ).toHaveValue("7");
    await expect(page.getByRole("radio", { name: /^ダーク/u })).toBeChecked();
    await expect(
      page.getByRole("radio", { name: /^さらに大きく（130%）/u }),
    ).toBeChecked();
    await expect(
      page.getByRole("checkbox", { name: /^画面の動きを減らす/u }),
    ).toBeChecked();
    await expect(page.getByText("非公式の自己学習アプリです")).toBeVisible();
  });

  test("実データを7日・30日で集計し、6技能・弱点・ステージを説明する", async ({
    page,
  }) => {
    await page.clock.setFixedTime(new Date("2026-07-28T00:30:00+09:00"));
    await page.goto("/#/progress");
    await waitForPageHeading(page);
    await seedProgressData(page);
    await page.reload();

    await expect(
      page.getByText(
        /7日間で1日、合計20分学習しました。復習1項目、新規1項目、完了レッスン1件/u,
      ),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: "6技能の傾向" }),
    ).toBeVisible();
    const vocabularyTrend = page
      .getByRole("heading", { level: 3, name: "語彙" })
      .locator("..")
      .locator("..");
    await expect(vocabularyTrend).toContainText("50%");
    await expect(vocabularyTrend).toContainText("短い復習がおすすめ");
    await expect(
      page.getByRole("heading", {
        level: 2,
        name: "復習すると伸ばしやすい項目",
      }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "book" }).first()).toBeVisible();
    await expect(page.getByText(/認識85%・想起40%（差45）/u)).toBeVisible();
    await expect(page.getByText(/平均10秒（1回答）/u)).toBeVisible();
    await expect(
      page.getByRole("progressbar", { name: "ステージ0の完了率" }),
    ).toHaveAttribute("aria-valuenow", /^(?!0$)\d+$/u);
    await expect(page.getByText("戻ってこられた日です")).toBeVisible();

    const thirtyDays = page.getByRole("radio", { name: "過去30日" });
    await thirtyDays.focus();
    await page.keyboard.press("Space");
    await expect(thirtyDays).toBeChecked();
    await expect(
      page.getByText(
        /30日間で2日、合計30分学習しました。復習1項目、新規2項目、完了レッスン1件/u,
      ),
    ).toBeVisible();
    await expect(page.getByText(/30日間の合計は30分です。/u)).toBeVisible();
  });

  test("初回設定から単語1問までキーボードだけで進められる", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, "speechSynthesis", {
        configurable: true,
        value: undefined,
      });
      Object.defineProperty(window, "SpeechSynthesisUtterance", {
        configurable: true,
        value: undefined,
      });
    });
    await page.goto("/#/");

    const startSettings = page.getByRole("button", { name: "設定を始める" });
    await tabUntilFocused(page, startSettings);
    await page.keyboard.press("Enter");

    const next = page.getByRole("button", { name: "次へ" });
    await tabUntilFocused(page, next);
    await page.keyboard.press("Enter");

    const skipDiagnostic = page.getByRole("button", { name: "診断はあとで" });
    await tabUntilFocused(page, skipDiagnostic);
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("heading", { level: 1, name: "今日の学習" }),
    ).toBeFocused();

    const vocabularyNavigation = page
      .getByRole("navigation", { name: "メインメニュー" })
      .getByRole("link", { name: "単語" });
    await tabUntilFocused(page, vocabularyNavigation);
    await page.keyboard.press("Enter");

    const newWordsCard = page.getByRole("article").filter({
      has: page.getByRole("heading", {
        level: 2,
        name: "新しい単語",
        exact: true,
      }),
    });
    const fiveWords = newWordsCard.getByRole("button", {
      name: "5語",
      exact: true,
    });
    await tabUntilFocused(page, fiveWords);
    await page.keyboard.press("Enter");

    const revealQuestion = page.getByRole("button", {
      name: "答えを隠して想起問題へ",
    });
    await tabUntilFocused(page, revealQuestion);
    await page.keyboard.press("Enter");

    const firstAnswer = page.getByRole("article").getByRole("radio").first();
    await tabUntilFocused(page, firstAnswer);
    await page.keyboard.press("Space");

    const confirmAnswer = page.getByRole("button", { name: "答えを確認" });
    await tabUntilFocused(page, confirmAnswer);
    await page.keyboard.press("Enter");

    const good = page.getByRole("button", { name: /^Good(?:、推奨)?$/u });
    await tabUntilFocused(page, good);
    await page.keyboard.press("Enter");

    await expect(
      page.getByText("閲覧カード・まだ採点しません", { exact: true }),
    ).toBeVisible();
  });
});
