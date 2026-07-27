import { expect, test } from "@playwright/test";

test.describe("app shell", () => {
  test("全主要タブと説明付き画面を移動できる", async ({ page }) => {
    await page.goto("/#/vocabulary");

    await expect(page.getByRole("heading", { level: 1, name: "単語" })).toBeVisible();

    const navigation = page.getByRole("navigation", { name: "メインメニュー" });
    await expect(navigation.getByRole("link")).toHaveCount(5);

    await navigation.getByRole("link", { name: "コース" }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "ステージマップ" }),
    ).toBeVisible();

    await navigation.getByRole("link", { name: "単語" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "単語" })).toBeVisible();

    await navigation.getByRole("link", { name: "練習" }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "技能練習" }),
    ).toBeVisible();

    await navigation.getByRole("link", { name: "記録" }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "学習記録" }),
    ).toBeVisible();
  });

  test("キーボードで下部ナビゲーションを操作できる", async ({ page }) => {
    await page.goto("/#/vocabulary");
    await expect(page.getByRole("heading", { level: 1, name: "単語" })).toBeFocused();

    const courseLink = page
      .getByRole("navigation", { name: "メインメニュー" })
      .getByRole("link", { name: "コース" });

    await courseLink.focus();
    await expect(courseLink).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#\/course$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "ステージマップ" }),
    ).toBeFocused();
  });

  test("長い画面から移動したとき先頭見出しを表示する", async ({ page }) => {
    await page.goto("/#/course");
    await expect(
      page.getByRole("heading", { level: 1, name: "ステージマップ" }),
    ).toBeVisible();
    const main = page.getByRole("main", { name: "学習コンテンツ" });
    await main.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    expect(await main.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);

    await page
      .getByRole("navigation", { name: "メインメニュー" })
      .getByRole("link", { name: "単語" })
      .click();

    const heading = page.getByRole("heading", { level: 1, name: "単語" });
    await expect(heading).toBeFocused();
    expect(await main.evaluate((element) => element.scrollTop)).toBe(0);
    await expect(heading).toBeInViewport();
  });

  test("320px幅でも横スクロールなく主要操作を表示する", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto("/#/vocabulary");

    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));

    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
    await expect(
      page.getByRole("navigation", { name: "メインメニュー" }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: "単語" })).toBeVisible();
  });

  test("未知のURLに復旧導線を表示する", async ({ page }) => {
    await page.goto("/#/route-that-does-not-exist");

    await expect(
      page.getByRole("heading", { level: 1, name: "ページが見つかりません" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "今日の学習へ" })).toBeVisible();
  });

  test("system dark themeと動きの軽減を反映する", async ({ page }) => {
    await page.emulateMedia({
      colorScheme: "dark",
      reducedMotion: "reduce",
    });
    await page.goto("/#/vocabulary");
    await page.getByRole("navigation", { name: "メインメニュー" }).waitFor();

    const visualSettings = await page.evaluate(() => {
      const rootStyle = getComputedStyle(document.documentElement);
      const navigationLink = document.querySelector<HTMLElement>(
        'nav[aria-label="メインメニュー"] a',
      );
      return {
        colorScheme: rootStyle.colorScheme,
        transitionSeconds: navigationLink
          ? Number.parseFloat(getComputedStyle(navigationLink).transitionDuration)
          : Number.NaN,
      };
    });

    expect(visualSettings.colorScheme).toBe("dark");
    expect(visualSettings.transitionSeconds).toBeLessThanOrEqual(0.001);
  });
});
