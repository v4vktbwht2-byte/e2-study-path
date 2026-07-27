import { expect, test, type Page } from "@playwright/test";

type StoredRecord = Record<string, unknown>;

const NEW_WORD_ANSWERS: Readonly<Record<string, string>> = {
  book: "本",
  day: "日、1日",
  family: "家族",
  food: "食べ物",
  friend: "友達",
  goodbye: "さようなら",
  happy: "うれしい、幸せな",
  hello: "こんにちは",
  home: "家、自宅",
  like: "好きである",
};

type RatingLabel = "Again" | "Good";
type QuickSortResult = "known" | "unsure" | "unknown";

const QUICK_SORT_BUTTON_LABEL: Readonly<Record<QuickSortResult, string>> = {
  known: "知っている",
  unsure: "あやしい",
  unknown: "知らない",
};

async function readObjectStore(page: Page, storeName: string): Promise<StoredRecord[]> {
  return page.evaluate(async (targetStoreName) => {
    const toError = (error: DOMException | null, fallback: string): Error =>
      error instanceof Error ? error : new Error(fallback);
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("e2-study-path");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(toError(request.error, "IndexedDBを開けませんでした。"));
    });

    try {
      const transaction = database.transaction(targetStoreName, "readonly");
      const records = await new Promise<unknown[]>((resolve, reject) => {
        const request = transaction
          .objectStore(targetStoreName)
          .getAll() as unknown as IDBRequest<unknown[]>;
        request.onsuccess = () => resolve(request.result);
        request.onerror = () =>
          reject(toError(request.error, `${targetStoreName}を読み取れませんでした。`));
      });
      return records.filter(
        (record): record is Record<string, unknown> =>
          typeof record === "object" && record !== null,
      );
    } finally {
      database.close();
    }
  }, storeName);
}

async function resolveBrowserStudyDates(
  page: Page,
  isoDates: readonly string[],
  studyDayStartHour: number,
): Promise<string[]> {
  return page.evaluate(
    ({ values, boundaryHour }) => {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        hourCycle: "h23",
      });
      return values.map((value) => {
        const parts = formatter.formatToParts(new Date(value));
        const part = (type: Intl.DateTimeFormatPartTypes) =>
          Number(parts.find((candidate) => candidate.type === type)?.value);
        let year = part("year");
        let month = part("month");
        let day = part("day");
        if (part("hour") < boundaryHour) {
          const previous = new Date(Date.UTC(year, month - 1, day - 1));
          year = previous.getUTCFullYear();
          month = previous.getUTCMonth() + 1;
          day = previous.getUTCDate();
        }
        return [
          String(year).padStart(4, "0"),
          String(month).padStart(2, "0"),
          String(day).padStart(2, "0"),
        ].join("-");
      });
    },
    { values: [...isoDates], boundaryHour: studyDayStartHour },
  );
}

async function disableWebSpeech(page: Page) {
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

async function startNewVocabularySession(page: Page) {
  await page.goto("/#/vocabulary");
  await expect(
    page.getByRole("heading", { level: 1, name: "今日の単語メニュー" }),
  ).toBeVisible();
  const newWordsCard = page.getByRole("article").filter({
    has: page.getByRole("heading", {
      level: 2,
      name: "新しい単語",
      exact: true,
    }),
  });
  await newWordsCard.getByRole("button", { name: "5語", exact: true }).click();
  await expect(page).toHaveURL(/#\/vocabulary\/session\?mode=new&limit=5$/);
  await expectNoHorizontalOverflow(page);
}

async function startQuickSortSession(page: Page) {
  await page.goto("/#/vocabulary");
  await expect(
    page.getByRole("heading", { level: 1, name: "今日の単語メニュー" }),
  ).toBeVisible();
  const quickSortCard = page.getByRole("article").filter({
    has: page.getByRole("heading", {
      level: 2,
      name: "5分高速チェック",
      exact: true,
    }),
  });
  await quickSortCard
    .getByRole("button", { name: /^5分高速チェック、対象\d+語$/ })
    .click();
  await expect(page).toHaveURL(/#\/vocabulary\/session\?mode=quickSort&limit=10$/);
  await expectNoHorizontalOverflow(page);
}

async function clickRating(page: Page, rating: RatingLabel): Promise<void> {
  const ratingButton = page.getByRole("article").getByRole("button", {
    name: new RegExp(`^${rating}(?:、推奨)?$`),
  });
  await ratingButton.click();
  await expect(ratingButton).toBeHidden();
}

async function answerLevelOneChoice(
  page: Page,
  rating: RatingLabel,
  options: { browseFirst: boolean; repeated?: boolean },
): Promise<string> {
  const card = page.getByRole("article");
  if (options.browseFirst) {
    await expect(
      card.getByText("閲覧カード・まだ採点しません", { exact: true }),
    ).toBeVisible();
  } else {
    await expect(
      card.getByText(
        options.repeated ? "想起問題 Level 1・再確認" : "想起問題 Level 1",
        { exact: true },
      ),
    ).toBeVisible();
  }

  const word = (await card.getByRole("heading", { level: 2 }).innerText()).trim();
  const answer = NEW_WORD_ANSWERS[word];
  expect(answer, `${word}の正答をE2Eデータへ登録してください。`).toBeDefined();

  if (options.browseFirst) {
    await card.getByRole("button", { name: "答えを隠して想起問題へ" }).click();
  }
  await card.getByRole("radio", { name: answer, exact: true }).check();
  await card.getByRole("button", { name: "答えを確認" }).click();
  await expect(card.getByText("確認できました", { exact: true })).toBeVisible();

  await clickRating(page, rating);
  return word;
}

async function answerLevelTwoRecall(
  page: Page,
  rating: RatingLabel,
  options: { repeated: boolean },
): Promise<string> {
  const card = page.getByRole("article");
  await expect(
    card.getByText(options.repeated ? "想起問題 Level 2・再確認" : "想起問題 Level 2", {
      exact: true,
    }),
  ).toBeVisible();

  const word = (await card.getByRole("heading", { level: 2 }).innerText()).trim();
  expect(
    NEW_WORD_ANSWERS[word],
    `${word}の意味をE2Eデータへ登録してください。`,
  ).toBeDefined();
  await card.getByRole("button", { name: "思い出してから答えを表示" }).click();
  await card.getByRole("button", { name: "思い出せた" }).click();
  await expect(card.getByText("確認できました", { exact: true })).toBeVisible();
  await clickRating(page, rating);
  return word;
}

function attemptSequence(record: StoredRecord): number {
  const match = String(record.id).match(/:attempt:(\d+)$/);
  return match === null ? Number.MAX_SAFE_INTEGER : Number(match[1]);
}

test.describe("Phase 04 vocabulary / review / Again の主要フロー", () => {
  test("vocabulary: 新規5語へ回答してGoodを確定し、review・mastery・履歴をreload後も保持する", async ({
    page,
  }) => {
    await disableWebSpeech(page);
    await startNewVocabularySession(page);

    const studiedWords: string[] = [];
    for (let index = 0; index < 5; index += 1) {
      studiedWords.push(
        await answerLevelOneChoice(page, "Good", {
          browseFirst: true,
        }),
      );
    }

    expect(studiedWords).toEqual(["book", "day", "family", "food", "friend"]);
    const confirmedWords: string[] = [];
    for (let index = 0; index < 5; index += 1) {
      confirmedWords.push(
        await answerLevelTwoRecall(page, "Good", {
          repeated: true,
        }),
      );
    }
    expect(confirmedWords).toEqual(studiedWords);

    await expect(
      page.getByRole("heading", { level: 1, name: "セッションを終えました" }),
    ).toBeVisible();
    await expect(
      page
        .getByText("学習語数", { exact: true })
        .locator("..")
        .getByText("5語", { exact: true }),
    ).toBeVisible();
    await expect(
      page
        .getByText("回答数", { exact: true })
        .locator("..")
        .getByText("10回", { exact: true }),
    ).toBeVisible();
    await expect(
      page
        .getByText("翌日以降", { exact: true })
        .locator("..")
        .getByText("5語", { exact: true }),
    ).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await expect
      .poll(async () => {
        const [attempts, reviewStates, masteryProfiles, sessions, settings] =
          await Promise.all([
            readObjectStore(page, "attempts"),
            readObjectStore(page, "reviewStates"),
            readObjectStore(page, "mastery"),
            readObjectStore(page, "sessions"),
            readObjectStore(page, "settings"),
          ]);
        const vocabularyAttempts = attempts.filter(
          (record) =>
            typeof record.itemKey === "string" && record.itemKey.startsWith("vocab:"),
        );
        const itemKeys = new Set(
          vocabularyAttempts
            .map((record) => record.itemKey)
            .filter((itemKey): itemKey is string => typeof itemKey === "string"),
        );
        const savedReviewStates = reviewStates.filter((record) =>
          itemKeys.has(String(record.itemKey)),
        );
        const savedMastery = masteryProfiles.filter((record) =>
          itemKeys.has(String(record.itemKey)),
        );
        const studyDate = vocabularyAttempts.find(
          (record) => typeof record.studyDate === "string",
        )?.studyDate;
        const finishedSession = sessions.find(
          (record) =>
            record.type === "vocabulary" &&
            typeof record.endedAt === "string" &&
            Array.isArray(record.completedItemKeys),
        );
        const studyDayStartHour =
          typeof settings[0]?.studyDayStartHour === "number"
            ? settings[0].studyDayStartHour
            : 4;
        const dueStudyDates = await resolveBrowserStudyDates(
          page,
          savedReviewStates.flatMap((record) =>
            typeof record.dueAt === "string" ? [record.dueAt] : [],
          ),
          studyDayStartHour,
        );

        return {
          attemptCount: vocabularyAttempts.length,
          uniqueItemCount: itemKeys.size,
          ratingsAreGood: vocabularyAttempts.every(
            (record) => record.finalRating === "good",
          ),
          levelOneAttempts: vocabularyAttempts.filter(
            (record) =>
              typeof record.exerciseId === "string" &&
              record.exerciseId.endsWith("level-1"),
          ).length,
          levelTwoAttempts: vocabularyAttempts.filter(
            (record) =>
              typeof record.exerciseId === "string" &&
              record.exerciseId.endsWith("level-2"),
          ).length,
          reviewStateCount: savedReviewStates.length,
          reviewStatesStarted: savedReviewStates.every(
            (record) => record.status !== "new",
          ),
          allDueTomorrowOrLater:
            typeof studyDate === "string" &&
            dueStudyDates.length === savedReviewStates.length &&
            dueStudyDates.every((dueStudyDate) => dueStudyDate > studyDate),
          masteryCount: savedMastery.length,
          recognitionAndRecallUpdated: savedMastery.every(
            (record) =>
              typeof record.recognition === "number" &&
              record.recognition > 0 &&
              typeof record.recall === "number" &&
              record.recall > 0 &&
              record.spelling === 0,
          ),
          completedSessionItems:
            finishedSession !== undefined &&
            Array.isArray(finishedSession.completedItemKeys)
              ? finishedSession.completedItemKeys.length
              : 0,
        };
      })
      .toEqual({
        attemptCount: 10,
        uniqueItemCount: 5,
        ratingsAreGood: true,
        levelOneAttempts: 5,
        levelTwoAttempts: 5,
        reviewStateCount: 5,
        reviewStatesStarted: true,
        allDueTomorrowOrLater: true,
        masteryCount: 5,
        recognitionAndRecallUpdated: true,
        completedSessionItems: 5,
      });

    await page.getByRole("button", { name: "単語ハブへ戻る" }).click();
    await page.getByRole("button", { name: "単語一覧" }).click();
    await page.getByRole("searchbox", { name: "単語・意味・メモを検索" }).fill("day");
    const dayCard = page.getByRole("article").filter({
      has: page.getByRole("heading", {
        level: 2,
        name: "day",
        exact: true,
      }),
    });
    await dayCard.getByRole("button", { name: "詳細を見る" }).click();

    const masterySection = page
      .getByRole("heading", { level: 2, name: "習熟度5軸" })
      .locator("..");
    const historySection = page
      .getByRole("heading", { level: 2, name: "過去の回答履歴" })
      .locator("..");
    await expect(masterySection).toContainText("次回復習:");
    await expect(masterySection).not.toContainText("未登録");
    await expect(historySection).toContainText("評価 good");
    await expect(historySection.locator("li")).toHaveCount(2);

    await page.reload();

    await expect(
      page.getByRole("heading", { level: 1, name: "day", exact: true }),
    ).toBeVisible();
    await expect(masterySection).toContainText("次回復習:");
    await expect(masterySection).not.toContainText("未登録");
    await expect(historySection).toContainText("評価 good");
    await expect(historySection.locator("li")).toHaveCount(2);
    await expectNoHorizontalOverflow(page);
  });

  test("Again: 初回選択から4問以上あけてLevel 2再確認し、残りのreviewも完走する", async ({
    page,
  }) => {
    await disableWebSpeech(page);
    await startNewVocabularySession(page);

    const firstWord = await answerLevelOneChoice(page, "Again", {
      browseFirst: true,
    });
    const questionsBetween: string[] = [];
    for (let index = 0; index < 4; index += 1) {
      questionsBetween.push(
        await answerLevelOneChoice(page, "Good", {
          browseFirst: true,
        }),
      );
    }
    const repeatedWord = await answerLevelTwoRecall(page, "Good", {
      repeated: true,
    });
    const remainingConfirmations: string[] = [];
    for (let index = 0; index < 4; index += 1) {
      remainingConfirmations.push(
        await answerLevelTwoRecall(page, "Good", {
          repeated: true,
        }),
      );
    }

    expect(firstWord).toBe("book");
    expect(questionsBetween).toHaveLength(4);
    expect(questionsBetween).not.toContain(firstWord);
    expect(repeatedWord).toBe(firstWord);
    expect(remainingConfirmations).toEqual(questionsBetween);
    await expect(
      page.getByRole("heading", { level: 1, name: "セッションを終えました" }),
    ).toBeVisible();
    await expect(
      page
        .getByText("回答数", { exact: true })
        .locator("..")
        .getByText("10回", { exact: true }),
    ).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await expect
      .poll(async () => {
        const attempts = (await readObjectStore(page, "attempts"))
          .filter(
            (record) =>
              typeof record.itemKey === "string" && record.itemKey.startsWith("vocab:"),
          )
          .sort((left, right) => attemptSequence(left) - attemptSequence(right));
        const repeatedIndexes = attempts.flatMap((record, index) =>
          record.itemKey === attempts[0]?.itemKey ? [index] : [],
        );
        return {
          attemptCount: attempts.length,
          firstRating: attempts[0]?.finalRating,
          firstLevel: attempts[0]?.exerciseId,
          repeatedRating: attempts[5]?.finalRating,
          repeatedLevel: attempts[5]?.exerciseId,
          questionsBetween:
            repeatedIndexes.length === 2
              ? repeatedIndexes[1] - repeatedIndexes[0] - 1
              : -1,
        };
      })
      .toEqual({
        attemptCount: 10,
        firstRating: "again",
        firstLevel: "vocabulary-question:vocab-s0-book:level-1",
        repeatedRating: "good",
        repeatedLevel: "vocabulary-question:vocab-s0-book:level-2",
        questionsBetween: 4,
      });
  });

  test("vocabulary Quick Sort: 全件を混在分類しunknown→unsure→known順で実確認する", async ({
    page,
  }) => {
    const classificationPlan: readonly QuickSortResult[] = [
      "known",
      "unsure",
      "unknown",
      "known",
      "unsure",
      "unknown",
      "known",
      "unsure",
      "unknown",
      "known",
    ];
    const classifiedWords: Record<QuickSortResult, string[]> = {
      known: [],
      unsure: [],
      unknown: [],
    };

    await disableWebSpeech(page);
    await startQuickSortSession(page);

    for (const [index, result] of classificationPlan.entries()) {
      const card = page.getByRole("article");
      await expect(
        card.getByText(`自己分類 ${index + 1} / 10`, { exact: true }),
      ).toBeVisible();
      const word = (await card.getByRole("heading", { level: 2 }).innerText()).trim();
      expect(
        NEW_WORD_ANSWERS[word],
        `${word}の正答をE2Eデータへ登録してください。`,
      ).toBeDefined();
      classifiedWords[result].push(word);

      if (index === classificationPlan.length - 1) {
        expect(await readObjectStore(page, "attempts")).toHaveLength(0);
      }
      await card
        .getByRole("button", {
          name: QUICK_SORT_BUTTON_LABEL[result],
          exact: true,
        })
        .click();
    }

    expect(classifiedWords.unknown).toHaveLength(3);
    expect(classifiedWords.unsure).toHaveLength(3);
    expect(classifiedWords.known).toHaveLength(4);
    await expect.poll(async () => readObjectStore(page, "attempts")).toHaveLength(0);

    const expectedVerificationOrder = [
      ...[...classifiedWords.unknown].sort((left, right) =>
        left.localeCompare(right, "en"),
      ),
      ...[...classifiedWords.unsure].sort((left, right) =>
        left.localeCompare(right, "en"),
      ),
      ...[...classifiedWords.known].sort((left, right) =>
        left.localeCompare(right, "en"),
      ),
    ];
    const verifiedWords: string[] = [];
    for (let index = 0; index < expectedVerificationOrder.length; index += 1) {
      const expectedWord = expectedVerificationOrder[index];
      const result =
        index < classifiedWords.unknown.length
          ? "unknown"
          : index < classifiedWords.unknown.length + classifiedWords.unsure.length
            ? "unsure"
            : "known";
      const verifiedWord =
        result === "unsure"
          ? await answerLevelTwoRecall(page, "Good", { repeated: false })
          : await answerLevelOneChoice(page, "Good", {
              browseFirst: false,
            });
      expect(verifiedWord).toBe(expectedWord);
      verifiedWords.push(verifiedWord);
    }

    expect(verifiedWords).toEqual(expectedVerificationOrder);
    await expect(
      page.getByRole("heading", { level: 1, name: "セッションを終えました" }),
    ).toBeVisible();
    await expect(
      page
        .getByText("学習語数", { exact: true })
        .locator("..")
        .getByText("10語", { exact: true }),
    ).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await expect
      .poll(async () => {
        const attempts = await readObjectStore(page, "attempts");
        return {
          attemptCount: attempts.length,
          uniqueItemCount: new Set(attempts.map((record) => record.itemKey)).size,
          recognitionChecks: attempts.filter(
            (record) => record.mode === "recognitionChoice",
          ).length,
          recallChecks: attempts.filter((record) => record.mode === "selfRecall")
            .length,
          ratingsAreGood: attempts.every((record) => record.finalRating === "good"),
        };
      })
      .toEqual({
        attemptCount: 10,
        uniqueItemCount: 10,
        recognitionChecks: 7,
        recallChecks: 3,
        ratingsAreGood: true,
      });
  });

  test("vocabulary Hubで検索・絞り込みを行い、お気に入りとメモをreload後も保持する", async ({
    page,
  }) => {
    const memo = "次は borrow と lend の主語に注意する";
    const itemKey = "vocab:vocab-s2-borrow";
    await disableWebSpeech(page);
    await page.goto("/#/vocabulary");

    await expect(
      page.getByRole("heading", { level: 1, name: "今日の単語メニュー" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "単語一覧" }).click();

    await expect(
      page.getByRole("heading", { level: 1, name: "単語一覧" }),
    ).toBeVisible();
    await page
      .getByRole("searchbox", { name: "単語・意味・メモを検索" })
      .fill("borrow");
    await page.getByRole("combobox", { name: "ステージ" }).selectOption("2");
    await page.getByRole("combobox", { name: "品詞" }).selectOption("verb");
    await expect(
      page.getByRole("status").filter({ hasText: "1語を表示しています。" }),
    ).toHaveText("1語を表示しています。");

    const borrowCard = page.getByRole("article").filter({
      has: page.getByRole("heading", {
        level: 2,
        name: "borrow",
        exact: true,
      }),
    });
    await expect(borrowCard).toBeVisible();
    await borrowCard.getByRole("button", { name: "詳細を見る" }).click();

    await expect(
      page.getByRole("heading", { level: 1, name: "borrow", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("音声を使えないため英文を表示します", {
        exact: true,
      }),
    ).toBeVisible();
    await page.getByRole("checkbox", { name: "お気に入りにする" }).check();
    await page
      .getByRole("textbox", { name: "自分のメモ（プレーンテキスト）" })
      .fill(memo);
    await page.getByRole("button", { name: "メモを保存" }).click();
    await expect(page.getByText("お気に入りとメモを保存しました。")).toBeVisible();

    await expect
      .poll(async () => {
        const records = await readObjectStore(page, "vocabularyUserStates");
        return records.find((record) => record.itemKey === itemKey);
      })
      .toMatchObject({
        itemKey,
        favorite: true,
        note: memo,
      });

    await page.reload();

    await expect(
      page.getByRole("heading", { level: 1, name: "borrow", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("checkbox", { name: "お気に入りにする" }),
    ).toBeChecked();
    await expect(
      page.getByRole("textbox", { name: "自分のメモ（プレーンテキスト）" }),
    ).toHaveValue(memo);

    await page.getByRole("button", { name: "一覧へ戻る" }).click();
    await page
      .getByRole("searchbox", { name: "単語・意味・メモを検索" })
      .fill("borrow");
    await page.getByRole("checkbox", { name: "お気に入りだけ" }).check();
    await expect(
      page.getByRole("status").filter({ hasText: "1語を表示しています。" }),
    ).toHaveText("1語を表示しています。");
    await expect(
      page.getByRole("article").filter({
        has: page.getByRole("heading", {
          level: 2,
          name: "borrow",
          exact: true,
        }),
      }),
    ).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
