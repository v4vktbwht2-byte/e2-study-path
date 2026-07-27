import { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  AppShell,
  BottomNavigation,
  Button,
  Dialog,
  EmptyState,
  ErrorState,
  InlineAlert,
  ProgressBar,
  TopBar,
} from "./index";

describe("共通UIコンポーネント", () => {
  it("処理中のボタンを操作不可にし、状態を名前で伝える", () => {
    render(<Button isLoading>保存する</Button>);

    const button = screen.getByRole("button", { name: "処理中" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });

  it("進捗値を範囲内に補正し、テキストでも通知する", () => {
    render(<ProgressBar label="今日の進み具合" value={12} max={10} />);

    const progressBar = screen.getByRole("progressbar", {
      name: "今日の進み具合",
    });
    expect(progressBar).toHaveAttribute("aria-valuemin", "0");
    expect(progressBar).toHaveAttribute("aria-valuemax", "10");
    expect(progressBar).toHaveAttribute("aria-valuenow", "10");
    expect(progressBar).toHaveAttribute("aria-valuetext", "10 / 10");
  });

  it("現在地と利用不可項目を下部ナビゲーションで区別する", () => {
    render(
      <BottomNavigation
        items={[
          {
            id: "today",
            label: "今日",
            href: "#/",
            isCurrent: true,
          },
          {
            id: "course",
            label: "コース",
            href: "#/course",
            disabled: true,
          },
        ]}
      />,
    );

    expect(
      screen.getByRole("navigation", { name: "メインナビゲーション" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "今日" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.queryByRole("link", { name: "コース" })).not.toBeInTheDocument();
    expect(screen.getByText("コース").closest("[aria-disabled]")).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("Hash Routerを変更せずに本文へフォーカスを移動する", () => {
    render(
      <AppShell mainId="study-main" mainAriaLabel="学習内容">
        <p>本文</p>
      </AppShell>,
    );

    const main = screen.getByRole("main", { name: "学習内容" });
    expect(main).toHaveAttribute("tabindex", "-1");
    fireEvent.click(screen.getByRole("button", { name: "本文へ移動" }));
    expect(main).toHaveFocus();
  });

  it("危険な通知をalertとして読み上げ対象にする", () => {
    render(
      <InlineAlert tone="danger" title="保存できませんでした">
        端末の空き容量を確認してください。
      </InlineAlert>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("保存できませんでした");
    expect(screen.getByRole("alert")).toHaveTextContent("エラー");
  });

  it("空・エラー状態の見出し階層を表示場所に合わせて選べる", () => {
    render(
      <>
        <EmptyState title="一覧内の空状態" />
        <ErrorState title="ページ全体のエラー" headingLevel={1} />
      </>,
    );

    expect(
      screen.getByRole("heading", { level: 2, name: "一覧内の空状態" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "ページ全体のエラー" }),
    ).toBeInTheDocument();
  });

  it("TopBarのブランド名をページ見出しとして強制しない", () => {
    render(<TopBar title="E2 Study Path" headingLevel="none" />);

    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    expect(screen.getByText("E2 Study Path")).toBeInTheDocument();
  });

  it("DialogをEscapeで閉じ、起点へフォーカスを戻す", async () => {
    const user = userEvent.setup();

    function DialogHarness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <Button onClick={() => setOpen(true)}>確認を開く</Button>
          <Dialog open={open} title="確認" onClose={() => setOpen(false)}>
            <p>内容</p>
          </Dialog>
        </>
      );
    }

    render(<DialogHarness />);
    const trigger = screen.getByRole("button", { name: "確認を開く" });
    await user.click(trigger);

    const dialog = screen.getByRole("dialog", { name: "確認" });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "ダイアログを閉じる" })).toHaveFocus();
    });

    fireEvent(dialog, new Event("cancel", { cancelable: true }));

    await waitFor(() => {
      expect(trigger).toHaveFocus();
      expect(dialog).not.toHaveAttribute("open");
    });
  });
});
