import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { PronunciationButton } from "./PronunciationButton";

afterEach(() => {
  vi.unstubAllGlobals();
});

it("Web Speech非対応時は英文フォールバックを明示する", () => {
  vi.stubGlobal("speechSynthesis", undefined);
  vi.stubGlobal("SpeechSynthesisUtterance", undefined);

  render(<PronunciationButton text="hello" />);

  expect(screen.getByText("音声を使えないため英文を表示します")).toBeInTheDocument();
  expect(screen.getByText("hello")).toHaveAttribute("lang", "en");
});

it("Web Speech対応時は指定された英文を再生する", async () => {
  const speak = vi.fn();
  const cancel = vi.fn();
  class FakeUtterance {
    lang = "";
    rate = 1;

    constructor(readonly text: string) {}
  }
  vi.stubGlobal("speechSynthesis", { speak, cancel });
  vi.stubGlobal("SpeechSynthesisUtterance", FakeUtterance);

  render(<PronunciationButton text="hello" speechRate={1.25} />);
  await userEvent.setup().click(screen.getByRole("button", { name: "helloを聞く" }));

  expect(cancel).toHaveBeenCalledTimes(1);
  expect(speak).toHaveBeenCalledWith(
    expect.objectContaining({ text: "hello", lang: "en-US", rate: 1.25 }),
  );
});
