import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS } from "../../infrastructure/db/repositories";
import { PwaProvider } from "../pwa";
import type { SettingsPort, SettingsPreferences, SettingsSnapshot } from "./types";
import { SettingsPage } from "./SettingsPage";

const initialPreferences: SettingsPreferences = {
  dailyMinutes: 15,
  appSettings: { ...DEFAULT_SETTINGS },
};

function createSnapshot(
  preferences: SettingsPreferences = initialPreferences,
  profileAvailable = true,
): SettingsSnapshot {
  return {
    preferences,
    profileAvailable,
    appInformation: {
      appVersion: "0.1.0",
      contentVersion: "0.6.0",
      databaseVersion: 2,
    },
  };
}

function renderSettings(port: SettingsPort) {
  return render(
    <MemoryRouter>
      <PwaProvider
        serviceWorkerRegistrar={() => ({
          applyUpdate: vi.fn(),
          dispose: vi.fn(),
        })}
      >
        <SettingsPage port={port} />
      </PwaProvider>
    </MemoryRouter>,
  );
}

describe("SettingsPage", () => {
  it("保存済み設定とアプリ情報、関連画面への導線を表示する", async () => {
    const port: SettingsPort = {
      load: vi.fn().mockResolvedValue(createSnapshot()),
      save: vi.fn().mockResolvedValue(undefined),
    };

    renderSettings(port);

    const heading = await screen.findByRole("heading", { level: 1, name: "設定" });
    await waitFor(() => {
      expect(heading).toHaveFocus();
    });
    expect(
      screen.getByRole("heading", { level: 2, name: "学習設定" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "表示設定" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "端末へ追加" }),
    ).toBeInTheDocument();
    expect(screen.getByText("0.6.0")).toBeInTheDocument();
    expect(screen.getByText("非公式の自己学習アプリです")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "保存容量とデータ管理を開く" }),
    ).toHaveAttribute("href", "/settings/data");
  });

  it("全設定を操作直後に反映し、最新状態を順番に保存する", async () => {
    const user = userEvent.setup();
    const save = vi.fn<SettingsPort["save"]>().mockResolvedValue(undefined);
    const port: SettingsPort = {
      load: vi.fn().mockResolvedValue(createSnapshot()),
      save,
    };

    renderSettings(port);
    await screen.findByRole("heading", { level: 2, name: "学習設定" });

    const dailyMinutes = screen.getByLabelText("1日の学習時間");
    await user.clear(dailyMinutes);
    await user.type(dailyMinutes, "30");
    const newLimit = screen.getByLabelText("1日の新しい単語の上限");
    await user.clear(newLimit);
    await user.type(newLimit, "12");
    await user.selectOptions(screen.getByLabelText("復習の強さ"), "strong");
    await user.selectOptions(screen.getByLabelText("英語音声の速さ"), "1.25");
    await user.click(screen.getByRole("radio", { name: /^ダーク/ }));
    await user.click(screen.getByRole("radio", { name: "大きめ（115%）" }));
    await user.click(screen.getByRole("checkbox", { name: /画面の動きを減らす/ }));

    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    expect(document.documentElement).toHaveAttribute("data-reduced-motion", "true");
    expect(document.documentElement.style.fontSize).toBe("115%");

    await waitFor(() => {
      expect(screen.getByRole("status", { name: "設定の保存状態" })).toHaveTextContent(
        "設定をこの端末に保存しました",
      );
    });
    expect(save).toHaveBeenLastCalledWith({
      dailyMinutes: 30,
      appSettings: {
        ...DEFAULT_SETTINGS,
        dailyNewVocabularyLimit: 12,
        reviewIntensity: "strong",
        speechRate: 1.25,
        theme: "dark",
        fontScale: 1.15,
        reducedMotion: true,
      },
    });
  });

  it("保存失敗を画面内に残し、現在値で再試行できる", async () => {
    const user = userEvent.setup();
    const save = vi
      .fn<SettingsPort["save"]>()
      .mockRejectedValueOnce(new Error("保存領域へ書き込めません。"))
      .mockResolvedValueOnce(undefined);
    const port: SettingsPort = {
      load: vi.fn().mockResolvedValue(createSnapshot()),
      save,
    };

    renderSettings(port);
    await screen.findByRole("heading", { level: 2, name: "表示設定" });
    await user.click(screen.getByRole("radio", { name: /^ダーク/ }));

    expect(await screen.findByText("設定を保存できませんでした")).toBeInTheDocument();
    expect(screen.getByText("保存領域へ書き込めません。")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "保存を再試行" }));
    await waitFor(() => {
      expect(screen.getByRole("status", { name: "設定の保存状態" })).toHaveTextContent(
        "設定をこの端末に保存しました",
      );
    });
    expect(save).toHaveBeenCalledTimes(2);
    expect(save.mock.calls.at(-1)?.[0].appSettings.theme).toBe("dark");
  });

  it("入力範囲外では保存せず、理由を入力欄へ関連付ける", async () => {
    const user = userEvent.setup();
    const save = vi.fn<SettingsPort["save"]>().mockResolvedValue(undefined);
    const port: SettingsPort = {
      load: vi.fn().mockResolvedValue(createSnapshot()),
      save,
    };

    renderSettings(port);
    const dailyMinutes = await screen.findByLabelText("1日の学習時間");
    await user.clear(dailyMinutes);
    await user.type(dailyMinutes, "3");

    expect(dailyMinutes).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("5〜180分の整数で入力してください。")).toHaveAttribute(
      "role",
      "alert",
    );
    expect(save).not.toHaveBeenCalled();
  });

  it("設定読込に失敗した場合は再試行して復旧できる", async () => {
    const user = userEvent.setup();
    const load = vi
      .fn<SettingsPort["load"]>()
      .mockRejectedValueOnce(new Error("DBを開けません。"))
      .mockResolvedValueOnce(createSnapshot());
    const port: SettingsPort = {
      load,
      save: vi.fn().mockResolvedValue(undefined),
    };

    renderSettings(port);
    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: "設定を読み込めませんでした",
      }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "もう一度試す" }));
    expect(
      await screen.findByRole("heading", { level: 2, name: "学習設定" }),
    ).toBeInTheDocument();
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("初回設定前は学習時間だけを変更不可にする", async () => {
    const port: SettingsPort = {
      load: vi.fn().mockResolvedValue(createSnapshot(initialPreferences, false)),
      save: vi.fn().mockResolvedValue(undefined),
    };

    renderSettings(port);

    expect(await screen.findByLabelText("1日の学習時間")).toBeDisabled();
    expect(screen.getByLabelText("1日の新しい単語の上限")).toBeEnabled();
    expect(
      screen.getByText("1日の学習時間は初回設定後に変更できます"),
    ).toBeInTheDocument();
  });
});
