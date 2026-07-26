import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { StartupSnapshot } from "./initializeApplication";
import { StartupGate } from "./StartupGate";

const snapshot: StartupSnapshot = {
  contentSeedResult: "installed",
  contentVersion: "0.1.0",
  dbVersion: 1,
  incompleteSessionCount: 0,
};

describe("StartupGate", () => {
  it("初期化中の状態を表示してからアプリを表示する", async () => {
    let resolve: (value: StartupSnapshot) => void = () => undefined;
    const initializer = () =>
      new Promise<StartupSnapshot>((done) => {
        resolve = done;
      });

    render(
      <StartupGate initializer={initializer}>
        <p>アプリ本体</p>
      </StartupGate>,
    );

    expect(screen.getByRole("status")).toHaveTextContent("確認しています");
    resolve(snapshot);
    expect(await screen.findByText("アプリ本体")).toBeInTheDocument();
  });

  it("失敗を握りつぶさず再試行できる", async () => {
    const initializer = vi
      .fn<() => Promise<StartupSnapshot>>()
      .mockRejectedValueOnce(new Error("DB open failed"))
      .mockResolvedValueOnce(snapshot);
    const user = userEvent.setup();

    render(
      <StartupGate initializer={initializer}>
        <p>復旧後のアプリ</p>
      </StartupGate>,
    );

    expect(
      await screen.findByRole("heading", {
        name: "学習データを準備できませんでした",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("学習データは削除されていません")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "もう一度試す" }));
    expect(await screen.findByText("復旧後のアプリ")).toBeInTheDocument();
    expect(initializer).toHaveBeenCalledTimes(2);
  });
});
