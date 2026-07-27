import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelpPage } from "./HelpPage";

describe("HelpPage", () => {
  it("iOS手順、offline、更新、backup、マイクの案内を表示する", () => {
    render(
      <MemoryRouter>
        <HelpPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { level: 1, name: "ヘルプ" })).toBeVisible();
    expect(
      screen.getByRole("heading", { level: 2, name: "iPhone・iPadへ追加する" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { level: 2, name: "オフラインで使う" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { level: 2, name: "安全に更新する" }),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "データ管理を開く" })).toHaveAttribute(
      "href",
      "/settings/data",
    );
    expect(
      screen.getByRole("heading", { level: 2, name: "音声とマイク" }),
    ).toBeVisible();
  });
});
