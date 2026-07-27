import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import type { DiagnosticStage } from "../../domain/diagnostic";
import type { UserProfile } from "../../domain/models";
import type { ProfileRepository } from "../../domain/repositories";
import { DiagnosticPage } from "./DiagnosticPage";
import {
  createDiagnosticPlacement,
  createDiagnosticRun,
  getFirstDiagnosticLessons,
  isCorrectDiagnosticAnswer,
  loadOrCreateDiagnosticRun,
  recordAndSaveDiagnosticResponse,
  saveDiagnosticPlacement,
  validateDiagnosticQuestions,
} from "./service";
import type {
  DiagnosticLessonSummary,
  DiagnosticMode,
  DiagnosticQuestionContent,
  DiagnosticSessionStore,
  SavedDiagnosticRun,
} from "./types";

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

class MemoryDiagnosticSessionStore implements DiagnosticSessionStore {
  runs = new Map<DiagnosticMode, SavedDiagnosticRun>();

  load(mode: DiagnosticMode) {
    const run = this.runs.get(mode);
    return Promise.resolve(run ? structuredClone(run) : undefined);
  }

  save(run: SavedDiagnosticRun) {
    this.runs.set(run.mode, structuredClone(run));
    return Promise.resolve();
  }

  clear(mode: DiagnosticMode) {
    this.runs.delete(mode);
    return Promise.resolve();
  }
}

const FIXED_DATE = new Date("2026-07-27T00:00:00.000Z");

function createProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: "local-user",
    createdAt: "2026-07-26T00:00:00.000Z",
    updatedAt: "2026-07-26T00:00:00.000Z",
    goals: ["relearn"],
    dailyMinutes: 15,
    recommendedStage: 0,
    selectedStage: 3,
    onboardingCompleted: false,
    ...overrides,
  };
}

function question(
  id: string,
  prompt: string,
  sequence: number,
  stage: DiagnosticStage = 0,
): DiagnosticQuestionContent {
  return {
    id,
    prompt,
    sequence,
    stage,
    area: sequence === 1 ? "alphabet" : "basicVocabulary",
    level: "foundation",
    kind: "singleChoice",
    choices: [
      { value: "yes", label: "はい" },
      { value: "no", label: "いいえ" },
    ],
    acceptedAnswers: ["yes"],
  };
}

const QUESTIONS = [
  question("q-1", "最初の問題", 1),
  question("q-2", "2問目", 2),
  question("q-3", "3問目", 3),
] as const;

const LESSONS: readonly DiagnosticLessonSummary[] = [
  { id: "lesson-3", stage: 0, order: 3, titleJa: "短い単語を読む" },
  { id: "lesson-1", stage: 0, order: 1, titleJa: "アルファベット" },
  { id: "lesson-2", stage: 0, order: 2, titleJa: "文字と音" },
  { id: "lesson-4", stage: 0, order: 4, titleJa: "4件目" },
];

describe("診断feature service", () => {
  it("表記ゆれを吸収して入力回答を判定する", () => {
    const textQuestion: DiagnosticQuestionContent = {
      ...question("text", "be動詞を入力", 1),
      kind: "textInput",
      choices: undefined,
      acceptedAnswers: ["I am"],
    };

    expect(isCorrectDiagnosticAnswer(textQuestion, "  Ｉ　ＡＭ。 ")).toBe(true);
    expect(isCorrectDiagnosticAnswer(textQuestion, "I is")).toBe(false);
  });

  it("回答ごとに途中状態を保存し、同じmodeで再開する", async () => {
    const store = new MemoryDiagnosticSessionStore();
    const created = await loadOrCreateDiagnosticRun(
      store,
      "initial",
      FIXED_DATE.toISOString(),
    );
    const answered = await recordAndSaveDiagnosticResponse(
      store,
      created.run,
      QUESTIONS[0],
      "correct",
      "2026-07-27T00:01:00.000Z",
    );
    const restored = await loadOrCreateDiagnosticRun(
      store,
      "initial",
      "2026-07-27T00:02:00.000Z",
    );

    expect(answered.session.answers).toHaveLength(1);
    expect(restored).toMatchObject({
      resumed: true,
      run: {
        updatedAt: "2026-07-27T00:01:00.000Z",
        session: { answers: [{ questionId: "q-1", response: "correct" }] },
      },
    });
  });

  it("再診断では既存履歴と選択ステージを保ち、提案だけ更新する", async () => {
    const repository = new MemoryProfileRepository(
      createProfile({
        onboardingCompleted: true,
        selectedStage: 3,
      }),
    );
    const run = createDiagnosticRun("reassessment", FIXED_DATE.toISOString());
    const placement = createDiagnosticPlacement(run);

    const profile = await saveDiagnosticPlacement(
      repository,
      placement,
      "reassessment",
      FIXED_DATE.toISOString(),
    );

    expect(profile).toMatchObject({
      selectedStage: 3,
      recommendedStage: 0,
      onboardingCompleted: true,
      diagnosticCompletedAt: FIXED_DATE.toISOString(),
    });
  });

  it("選択ステージの先頭3レッスンをorder順で返す", () => {
    expect(getFirstDiagnosticLessons(LESSONS, 0).map((lesson) => lesson.id)).toEqual([
      "lesson-1",
      "lesson-2",
      "lesson-3",
    ]);
  });

  it("聞き取り問題に音声も代替文もなければ教材エラーにする", () => {
    const listeningQuestion: DiagnosticQuestionContent = {
      ...question("listening", "聞こえた文を選ぶ", 1),
      kind: "listeningChoice",
    };

    expect(validateDiagnosticQuestions([listeningQuestion])).toContain(
      "listening: 音声または代替スクリプトのどちらかが必要です。",
    );
  });
});

describe("診断画面", () => {
  it("分からない回答を途中保存し、結果・3レッスン・手動変更を完了する", async () => {
    const user = userEvent.setup();
    const repository = new MemoryProfileRepository(createProfile());
    const store = new MemoryDiagnosticSessionStore();
    const onComplete = vi.fn();

    render(
      <MemoryRouter>
        <DiagnosticPage
          questions={QUESTIONS}
          lessons={LESSONS}
          profileRepository={repository}
          sessionStore={store}
          now={() => FIXED_DATE}
          onComplete={onComplete}
        />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "初期診断を準備しています",
      }),
    ).toBeInTheDocument();
    const firstQuestionHeading = await screen.findByRole("heading", {
      level: 2,
      name: "最初の問題",
    });
    await waitFor(() => expect(firstQuestionHeading).toHaveFocus());
    await user.click(screen.getByRole("button", { name: "分からない" }));
    const secondQuestionHeading = await screen.findByRole("heading", {
      level: 2,
      name: "2問目",
    });
    await waitFor(() => expect(secondQuestionHeading).toHaveFocus());
    await user.click(screen.getByRole("button", { name: "分からない" }));
    const thirdQuestionHeading = await screen.findByRole("heading", {
      level: 2,
      name: "3問目",
    });
    await waitFor(() => expect(thirdQuestionHeading).toHaveFocus());
    await user.click(screen.getByRole("button", { name: "分からない" }));

    const resultHeading = await screen.findByRole("heading", {
      level: 1,
      name: "おすすめの開始地点",
    });
    await waitFor(() => expect(resultHeading).toHaveFocus());
    const lessonsSection = screen
      .getByRole("heading", { level: 2, name: "最初の3レッスン" })
      .closest("section");
    expect(lessonsSection).not.toBeNull();
    expect(within(lessonsSection!).getByText("アルファベット")).toBeInTheDocument();
    expect(within(lessonsSection!).getByText("文字と音")).toBeInTheDocument();
    expect(within(lessonsSection!).getByText("短い単語を読む")).toBeInTheDocument();

    await user.selectOptions(
      screen.getByRole("combobox", { name: /開始ステージを手動で変更/ }),
      "2",
    );
    await user.click(
      screen.getByRole("button", {
        name: "このステージから始める",
      }),
    );

    expect(onComplete).toHaveBeenCalledWith(
      { selectedStage: 2, recommendedStage: 0 },
      expect.objectContaining({ selectedStage: 2, onboardingCompleted: true }),
    );
    expect(store.runs.has("initial")).toBe(false);
  });

  it("保存済み回答から自動で再開する", async () => {
    const store = new MemoryDiagnosticSessionStore();
    const fresh = createDiagnosticRun("initial", FIXED_DATE.toISOString());
    await recordAndSaveDiagnosticResponse(
      store,
      fresh,
      QUESTIONS[0],
      "correct",
      FIXED_DATE.toISOString(),
    );

    render(
      <MemoryRouter>
        <DiagnosticPage
          questions={QUESTIONS}
          profileRepository={new MemoryProfileRepository(createProfile())}
          sessionStore={store}
          now={() => FIXED_DATE}
        />
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole("heading", { level: 2, name: "2問目" }),
    ).toBeInTheDocument();
    expect(screen.getByText("前回の続きから再開しました")).toBeInTheDocument();
    expect(screen.getByText(/1問目までの回答/)).toBeInTheDocument();
  });

  it("問題を飛ばした回答も途中状態へ保存する", async () => {
    const user = userEvent.setup();
    const store = new MemoryDiagnosticSessionStore();

    render(
      <MemoryRouter>
        <DiagnosticPage
          questions={QUESTIONS}
          profileRepository={new MemoryProfileRepository(createProfile())}
          sessionStore={store}
          now={() => FIXED_DATE}
        />
      </MemoryRouter>,
    );

    await screen.findByRole("heading", { level: 2, name: "最初の問題" });
    await user.click(screen.getByRole("button", { name: "この問題を飛ばす" }));

    expect((await store.load("initial"))?.session.answers[0]).toMatchObject({
      questionId: "q-1",
      response: "skipped",
    });
  });

  it("問題が未注入なら安全な空状態を表示する", async () => {
    render(
      <MemoryRouter>
        <DiagnosticPage
          profileRepository={new MemoryProfileRepository(createProfile())}
          sessionStore={new MemoryDiagnosticSessionStore()}
        />
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: "診断問題を読み込めませんでした",
      }),
    ).toBeInTheDocument();
  });
});
