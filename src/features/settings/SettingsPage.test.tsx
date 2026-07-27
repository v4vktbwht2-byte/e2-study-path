import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { PwaProvider } from "../pwa";
import { SettingsPage } from "./SettingsPage";

describe("SettingsPage", () => {
  it("インストールとデータ管理への導線を表示する", () => {
    render(
      <MemoryRouter>
        <PwaProvider
          serviceWorkerRegistrar={() => ({
            applyUpdate: vi.fn(),
            dispose: vi.fn(),
          })}
        >
          <SettingsPage />
        </PwaProvider>
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { level: 1, name: "設定" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "端末へ追加" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "保存容量とデータ管理を開く" }),
    ).toHaveAttribute("href", "/settings/data");
  });
});
