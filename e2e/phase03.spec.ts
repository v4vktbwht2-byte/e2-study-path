import { expect, test, type Locator, type Page } from "@playwright/test";

function getLessonCard(page: Page, lessonTitle: string): Locator {
  return page.getByRole("article").filter({
    has: page.getByRole("heading", {
      level: 2,
      name: lessonTitle,
      exact: true,
    }),
  });
}

async function expectLessonStep(page: Page, step: number) {
  await expect(
    page.getByRole("progressbar", { name: "レッスンの進み具合" }),
  ).toHaveAttribute("aria-valuenow", String(step));
}

async function answerVisibleLessonExercises(page: Page) {
  const exerciseHeadings = page.getByRole("heading", { level: 3 });
  const exerciseCount = await exerciseHeadings.count();
  expect(exerciseCount).toBeGreaterThan(0);

  for (let index = 0; index < exerciseCount; index += 1) {
    const exercise = exerciseHeadings.nth(index).locator("..");
    const radios = exercise.getByRole("radio");
    const checkboxes = exercise.getByRole("checkbox");
    const textboxes = exercise.getByRole("textbox");

    if ((await radios.count()) > 0) {
      await radios.first().check();
    } else if ((await checkboxes.count()) > 0) {
      await checkboxes.first().check();
    } else {
      await textboxes.first().fill("I am learning.");
    }

    const submit = exercise.getByRole("button", {
      name: /^(答えを確認|回答例を確認)$/,
    });
    await submit.click();
    await expect(submit).toBeHidden();
  }
}

async function readLessonPersistence(page: Page, lessonId: string) {
  return page.evaluate(async (targetLessonId) => {
    const toError = (error: DOMException | null, fallback: string): Error =>
      error instanceof Error ? error : new Error(fallback);
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("e2-study-path");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(toError(request.error, "IndexedDBを開けませんでした。"));
    });
    const transaction = db.transaction(
      ["attempts", "lessonProgress", "reviewStates"],
      "readonly",
    );
    const transactionDone = new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () =>
        reject(toError(transaction.error, "IndexedDBの読み取りに失敗しました。"));
      transaction.onabort = () =>
        reject(toError(transaction.error, "IndexedDBの読み取りが中断されました。"));
    });
    const requestAsPromise = <T>(request: IDBRequest<T>) =>
      new Promise<T>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () =>
          reject(toError(request.error, "IndexedDBのデータを読み取れませんでした。"));
      });
    const attemptsRequest = transaction
      .objectStore("attempts")
      .getAll() as unknown as IDBRequest<unknown[]>;
    const progressRequest = transaction
      .objectStore("lessonProgress")
      .get(targetLessonId) as unknown as IDBRequest<unknown>;
    const reviewStateRequest = transaction
      .objectStore("reviewStates")
      .get(`lesson:${targetLessonId}`) as unknown as IDBRequest<unknown>;
    const [attempts, progress, reviewState] = await Promise.all([
      requestAsPromise(attemptsRequest),
      requestAsPromise(progressRequest),
      requestAsPromise(reviewStateRequest),
    ]);
    await transactionDone;
    db.close();

    const readStringProperty = (
      value: unknown,
      property: "exerciseId" | "status",
    ): string | undefined => {
      if (typeof value !== "object" || value === null) {
        return undefined;
      }
      if (property === "exerciseId") {
        return "exerciseId" in value && typeof value.exerciseId === "string"
          ? value.exerciseId
          : undefined;
      }
      return "status" in value && typeof value.status === "string"
        ? value.status
        : undefined;
    };
    return {
      attemptCount: attempts.filter((attempt) =>
        readStringProperty(attempt, "exerciseId")?.startsWith(
          `exercise-${targetLessonId.replace("lesson-", "")}-`,
        ),
      ).length,
      progressStatus: readStringProperty(progress, "status"),
      reviewStatus: readStringProperty(reviewState, "status"),
    };
  }, lessonId);
}

test.describe("Phase 03 onboarding / diagnostic / lesson の主要学習フロー", () => {
  test("onboarding: 初回設定で診断を後回しにし、今日の学習へ進んだ設定を再読み込み後も保持する", async ({
    page,
  }) => {
    await page.goto("/#/");

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "英語を、基礎から少しずつ",
      }),
    ).toBeVisible();
    await page.getByRole("button", { name: "設定を始める" }).click();

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "続けやすい学び方を決めましょう",
      }),
    ).toBeVisible();
    await page.getByRole("radio", { name: "30分" }).check();
    await page.getByRole("button", { name: "次へ" }).click();

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "最初の学習地点を選びます",
      }),
    ).toBeVisible();
    await page
      .getByRole("combobox", {
        name: /診断をあとにする場合の開始ステージ/,
      })
      .selectOption("2");
    await page.getByRole("button", { name: "診断はあとで" }).click();

    await expect(
      page.getByRole("heading", { level: 1, name: "今日の学習" }),
    ).toBeVisible();
    await expect(
      page.getByText(/1日30分を目安に、ステージ\s*2から少しずつ進めましょう。/),
    ).toBeVisible();

    await page.reload();

    await expect(
      page.getByRole("heading", { level: 1, name: "今日の学習" }),
    ).toBeVisible();
    await expect(
      page.getByText(/1日30分を目安に、ステージ\s*2から少しずつ進めましょう。/),
    ).toBeVisible();
  });

  test("diagnostic: 途中状態を再読み込み後に再開し、手動選択した開始地点を今日画面とコースで保持する", async ({
    page,
  }) => {
    await page.goto("/#/");
    await page.getByRole("button", { name: "設定を始める" }).click();
    await page.getByRole("button", { name: "次へ" }).click();
    await page.getByRole("button", { name: "診断を始める" }).click();

    await expect(
      page.getByRole("heading", { level: 1, name: "初期診断" }),
    ).toBeVisible();
    const diagnosticProgress = page.getByRole("progressbar", {
      name: "診断の進み具合",
    });

    await page.getByRole("button", { name: "分からない" }).click();
    await expect(diagnosticProgress).toHaveAttribute("aria-valuenow", "1");

    await page.reload();

    await expect(
      page.getByRole("heading", { level: 1, name: "初期診断" }),
    ).toBeVisible();
    await expect(page.getByText("前回の続きから再開しました")).toBeVisible();
    await expect(diagnosticProgress).toHaveAttribute("aria-valuenow", "1");

    await page.getByRole("button", { name: "この問題を飛ばす" }).click();
    await expect(diagnosticProgress).toHaveAttribute("aria-valuenow", "2");
    await page.getByRole("button", { name: "分からない" }).click();

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "おすすめの開始地点",
      }),
    ).toBeVisible();
    await expect(page.getByText("診断が終わりました", { exact: true })).toBeVisible();

    await page
      .getByRole("combobox", { name: /開始ステージを手動で変更/ })
      .selectOption("1");
    await page.getByRole("button", { name: "このステージから始める" }).click();

    await expect(page).toHaveURL(/#\/$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "今日の学習" }),
    ).toBeVisible();
    await expect(
      page.getByText(/1日15分を目安に、ステージ\s*1から少しずつ進めましょう。/),
    ).toBeVisible();

    await page.reload();

    await expect(
      page.getByRole("heading", { level: 1, name: "今日の学習" }),
    ).toBeVisible();
    await expect(
      page.getByText(/1日15分を目安に、ステージ\s*1から少しずつ進めましょう。/),
    ).toBeVisible();

    const navigation = page.getByRole("navigation", {
      name: "メインメニュー",
    });
    await navigation.getByRole("link", { name: "コース" }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "ステージマップ" }),
    ).toBeVisible();
    const stageOneCard = page.getByRole("article").filter({
      has: page.getByRole("heading", {
        level: 2,
        name: "1文を作る",
        exact: true,
      }),
    });
    await expect(stageOneCard.getByText("現在地", { exact: true })).toBeVisible();
    await stageOneCard.getByRole("button", { name: "ステージ1を見る" }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "1文を作る" }),
    ).toBeVisible();

    await page.reload();

    await expect(
      page.getByRole("heading", { level: 1, name: "1文を作る" }),
    ).toBeVisible();
    await page
      .getByRole("navigation", { name: "メインメニュー" })
      .getByRole("link", { name: "今日" })
      .click();
    await expect(
      page.getByText(/1日15分を目安に、ステージ\s*1から少しずつ進めましょう。/),
    ).toBeVisible();

    await page.reload();

    await expect(
      page.getByText(/1日15分を目安に、ステージ\s*1から少しずつ進めましょう。/),
    ).toBeVisible();
  });

  test("lesson: ステージ0の問題へ回答し、中断・再開・完了後のAttemptと復習状態を保持する", async ({
    page,
  }) => {
    const lessonTitle = "アルファベットを見分ける";
    const lessonId = "lesson-s0-u1";

    await page.goto("/#/course");
    await expect(
      page.getByRole("heading", { level: 1, name: "ステージマップ" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "ステージ0を見る" }).click();

    await expect(
      page.getByRole("heading", { level: 1, name: "はじめての英語" }),
    ).toBeVisible();
    let lessonCard = getLessonCard(page, lessonTitle);
    await expect(lessonCard.getByText("未開始", { exact: true })).toBeVisible();
    await lessonCard.getByRole("button", { name: "このレッスンを始める" }).click();

    await expect(
      page.getByRole("heading", { level: 1, name: lessonTitle }),
    ).toBeVisible();
    await expectLessonStep(page, 1);
    await page.getByRole("button", { name: "次へ" }).click();
    await expectLessonStep(page, 2);
    await page.getByRole("button", { name: "中断して戻る" }).click();

    await expect(
      page.getByRole("heading", { level: 1, name: "ステージマップ" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "ステージ0を見る" }).click();

    lessonCard = getLessonCard(page, lessonTitle);
    await expect(lessonCard.getByText("途中から再開", { exact: true })).toBeVisible();
    await lessonCard.getByRole("button", { name: "続きから始める" }).click();

    await expect(page.getByText(/前回の続きから再開しました。/)).toBeVisible();
    await expectLessonStep(page, 2);

    await page.getByRole("button", { name: "次へ" }).click();
    await expectLessonStep(page, 3);
    await page.getByRole("button", { name: "次へ" }).click();
    await expectLessonStep(page, 4);

    await page.getByRole("button", { name: "次へ" }).click();
    await expect(
      page.getByText(/すべて回答してから進んでください。未回答は3問です。/),
    ).toBeVisible();
    await expectLessonStep(page, 4);
    await answerVisibleLessonExercises(page);
    await page.getByRole("button", { name: "次へ" }).click();
    await expectLessonStep(page, 5);

    await page.getByRole("button", { name: "次へ" }).click();
    await expect(
      page.getByText(/すべて回答してから進んでください。未回答は2問です。/),
    ).toBeVisible();
    await expectLessonStep(page, 5);
    await answerVisibleLessonExercises(page);
    await page.getByRole("button", { name: "次へ" }).click();
    await expectLessonStep(page, 6);

    await page.getByRole("button", { name: "レッスンを完了" }).click();
    await expect(page.getByText(/レッスンを完了しました。/)).toBeVisible();

    await expect
      .poll(() => readLessonPersistence(page, lessonId))
      .toEqual({
        attemptCount: 5,
        progressStatus: "completed",
        reviewStatus: "learning",
      });

    await page.getByRole("button", { name: "コースへ戻る" }).click();

    await expect(
      page.getByRole("heading", { level: 1, name: "ステージマップ" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "ステージ0を見る" }).click();

    lessonCard = getLessonCard(page, lessonTitle);
    await expect(lessonCard.getByText("完了", { exact: true })).toBeVisible();

    await page.reload();

    await expect(
      page.getByRole("heading", { level: 1, name: "はじめての英語" }),
    ).toBeVisible();
    lessonCard = getLessonCard(page, lessonTitle);
    await expect(lessonCard.getByText("完了", { exact: true })).toBeVisible();
  });
});
