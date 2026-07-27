import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { mockPracticeSets } from "../../content/pilot/practiceMock";
import { speakingPracticeSets } from "../../content/pilot/practiceSpeaking";
import { PracticeHubPage } from "./PracticeHubPage";

describe("技能練習ハブ", () => {
  it("ページを置き換える空・エラー状態を主見出しとして伝える", async () => {
    const empty = render(
      <PracticeHubPage
        port={{ loadSets: vi.fn().mockResolvedValue([]) }}
        onOpen={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "技能練習を準備しています",
      }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "技能別の教材がありません",
      }),
    ).toBeInTheDocument();
    empty.unmount();

    render(
      <PracticeHubPage
        port={{
          loadSets: vi.fn().mockRejectedValue(new Error("教材を読めません")),
        }}
        onOpen={vi.fn()}
      />,
    );
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "技能練習を開けませんでした",
      }),
    ).toBeInTheDocument();
  });

  it("教材数を表示し、利用可能な技能へ移動できる", async () => {
    const onOpen = vi.fn();
    const user = userEvent.setup();
    render(
      <PracticeHubPage
        port={{
          loadSets: vi
            .fn()
            .mockResolvedValue([...speakingPracticeSets, ...mockPracticeSets]),
        }}
        onOpen={onOpen}
      />,
    );

    expect(await screen.findByText("4セット")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "技能練習" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "読解練習を選ぶ" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "面接練習を選ぶ" }));
    expect(onOpen).toHaveBeenCalledWith("speaking");
  });
});
