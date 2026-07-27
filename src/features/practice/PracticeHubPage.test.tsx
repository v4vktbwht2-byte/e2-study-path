import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { mockPracticeSets } from "../../content/pilot/practiceMock";
import { speakingPracticeSets } from "../../content/pilot/practiceSpeaking";
import { PracticeHubPage } from "./PracticeHubPage";

describe("技能練習ハブ", () => {
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

    expect(
      await screen.findByRole("heading", { name: "技能練習" }),
    ).toBeInTheDocument();
    expect(screen.getByText("4セット")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "読解練習を選ぶ" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "面接練習を選ぶ" }));
    expect(onOpen).toHaveBeenCalledWith("speaking");
  });
});
