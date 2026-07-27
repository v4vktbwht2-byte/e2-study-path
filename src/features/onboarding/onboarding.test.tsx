import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import type { UserProfile } from "../../domain/models";
import type { ProfileRepository } from "../../domain/repositories";
import { OnboardingPage } from "./OnboardingPage";
import {
  completeOnboardingWithoutDiagnostic,
  OnboardingValidationError,
  saveOnboardingDraft,
} from "./service";

class MemoryProfileRepository implements ProfileRepository {
  profile?: UserProfile;

  constructor(profile?: UserProfile) {
    this.profile = profile;
  }

  get() {
    return Promise.resolve(this.profile);
  }

  save(profile: UserProfile) {
    this.profile = structuredClone(profile);
    return Promise.resolve();
  }
}

const FIXED_NOW = new Date("2026-07-27T00:00:00.000Z");

describe("オンボーディング保存サービス", () => {
  it("目標・学習時間・任意受験日を未完了プロフィールとして保存する", async () => {
    const repository = new MemoryProfileRepository();

    await expect(
      saveOnboardingDraft(
        repository,
        {
          goals: ["grade2", "relearn", "grade2"],
          dailyMinutes: 30,
          targetExamDate: "2027-01-24",
        },
        FIXED_NOW.toISOString(),
      ),
    ).resolves.toMatchObject({
      id: "local-user",
      goals: ["grade2", "relearn"],
      dailyMinutes: 30,
      targetExamDate: "2027-01-24",
      onboardingCompleted: false,
    });
  });

  it("診断をあとにしても選んだ開始ステージで完了できる", async () => {
    const repository = new MemoryProfileRepository();

    const profile = await completeOnboardingWithoutDiagnostic(
      repository,
      {
        goals: ["vocabulary"],
        dailyMinutes: 5,
        selectedStage: 1,
      },
      FIXED_NOW.toISOString(),
    );

    expect(profile).toMatchObject({
      selectedStage: 1,
      recommendedStage: 0,
      onboardingCompleted: true,
    });
  });

  it("目標なしや範囲外の学習時間を保存しない", async () => {
    const repository = new MemoryProfileRepository();

    await expect(
      saveOnboardingDraft(repository, {
        goals: [],
        dailyMinutes: 15,
      }),
    ).rejects.toBeInstanceOf(OnboardingValidationError);
    await expect(
      saveOnboardingDraft(repository, {
        goals: ["relearn"],
        dailyMinutes: 181,
      }),
    ).rejects.toThrow("5〜180分");
    expect(repository.profile).toBeUndefined();
  });
});

describe("オンボーディング画面", () => {
  it("Welcomeから設定し、診断をあとにして初回設定を完了する", async () => {
    const user = userEvent.setup();
    const repository = new MemoryProfileRepository();
    const onComplete = vi.fn();

    render(
      <MemoryRouter>
        <OnboardingPage
          profileRepository={repository}
          now={() => FIXED_NOW}
          onComplete={onComplete}
        />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "初回設定を準備しています",
      }),
    ).toBeInTheDocument();
    await user.click(
      await screen.findByRole("button", {
        name: "設定を始める",
      }),
    );
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "続けやすい学び方を決めましょう",
      }),
    ).toHaveFocus();

    await user.click(screen.getByRole("checkbox", { name: /英検2級を目指す/ }));
    await user.click(screen.getByRole("radio", { name: "30分" }));
    await user.type(screen.getByLabelText(/英検の受験予定日/), "2027-01-24");
    await user.click(screen.getByRole("button", { name: "次へ" }));

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "最初の学習地点を選びます",
      }),
    ).toHaveFocus();
    await user.selectOptions(
      screen.getByRole("combobox", {
        name: /診断をあとにする場合の開始ステージ/,
      }),
      "2",
    );
    await user.click(screen.getByRole("button", { name: "診断はあとで" }));

    expect(onComplete).toHaveBeenCalledOnce();
    expect(repository.profile).toMatchObject({
      goals: ["relearn", "grade2"],
      dailyMinutes: 30,
      targetExamDate: "2027-01-24",
      selectedStage: 2,
      onboardingCompleted: true,
    });
  });

  it("プロフィールを保存して診断開始callbackへ渡す", async () => {
    const user = userEvent.setup();
    const repository = new MemoryProfileRepository();
    const onStartDiagnostic = vi.fn();

    render(
      <MemoryRouter>
        <OnboardingPage
          profileRepository={repository}
          now={() => FIXED_NOW}
          onStartDiagnostic={onStartDiagnostic}
        />
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole("button", { name: "設定を始める" }));
    await user.click(screen.getByRole("button", { name: "次へ" }));
    await user.click(
      await screen.findByRole("button", {
        name: "診断を始める",
      }),
    );

    expect(onStartDiagnostic).toHaveBeenCalledWith(
      expect.objectContaining({
        dailyMinutes: 15,
        onboardingCompleted: false,
      }),
    );
  });
});
