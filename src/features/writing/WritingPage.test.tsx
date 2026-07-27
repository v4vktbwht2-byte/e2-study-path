import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { pilotWritingPracticeSets } from "../../content/pilot/practiceWriting";
import type { PracticeSet } from "../../infrastructure/content/schemas";
import { WritingPage } from "./WritingPage";
import type {
  WritingCommitInput,
  WritingCommitResult,
  WritingLearningPort,
  WritingSubmissionRecord,
} from "./types";

const NOW = new Date("2026-07-27T01:00:00.000Z");
const CLOCK = { now: () => new Date(NOW) };
const STUDY_DAY_RESOLVER = () => ({
  studyDate: "2026-07-27",
  studyDayStartMs: new Date("2026-07-26T19:00:00.000Z").getTime(),
});
const WRITING_SETS = pilotWritingPracticeSets
  .slice(0, 1)
  .concat(pilotWritingPracticeSets.filter((set) => set.type === "opinion").slice(0, 1));

class MemoryWritingPort implements WritingLearningPort {
  readonly records = new Map<string, WritingSubmissionRecord>();
  failLoad = false;
  failSave = false;
  commits: WritingCommitInput[] = [];

  listSubmissions(promptId: string) {
    if (this.failLoad) {
      return Promise.reject(new Error("履歴を読み込めません"));
    }
    return Promise.resolve(
      [...this.records.values()].filter(
        (submission) => submission.promptId === promptId,
      ),
    );
  }

  saveDraft(submission: WritingSubmissionRecord) {
    if (this.failSave) {
      return Promise.reject(new Error("下書き保存を利用できません"));
    }
    this.records.set(submission.id, submission);
    return Promise.resolve();
  }

  commitSubmission(input: WritingCommitInput): Promise<WritingCommitResult> {
    this.commits.push(input);
    this.records.set(input.submission.id, input.submission);
    return Promise.resolve({
      submission: input.submission,
      attempt: input.attempt,
      session: input.session,
    });
  }
}

function renderWriting(
  port: MemoryWritingPort,
  overrides: Partial<React.ComponentProps<typeof WritingPage>> = {},
) {
  return render(
    <WritingPage
      practiceSets={WRITING_SETS}
      port={port}
      clock={CLOCK}
      studyDayResolver={STUDY_DAY_RESOLVER}
      autosaveDelayMs={10}
      {...overrides}
    />,
  );
}

describe("WritingPage", () => {
  it("要約の原文・語数目安・自己評価と、意見の6項目構成メモを表示する", async () => {
    const user = userEvent.setup();
    renderWriting(new MemoryWritingPort());

    const editor = await screen.findByLabelText("英文を書く");
    expect(
      screen.getByText("45〜55語は練習の目安です。", { exact: false }),
    ).toBeVisible();
    expect(screen.getAllByRole("checkbox")).toHaveLength(4);
    fireEvent.change(editor, {
      target: {
        value: Array.from({ length: 45 }, () => "word").join(" "),
      },
    });
    expect(screen.getByText("現在45語。目安の45〜55語に入っています。")).toBeVisible();

    await user.click(screen.getByRole("button", { name: /授業の資料/ }));
    await screen.findByRole("heading", {
      name: "授業の資料はデジタル中心がよいか",
    });
    expect(screen.getByLabelText("意見")).toBeVisible();
    expect(screen.getByLabelText("理由1")).toBeVisible();
    expect(screen.getByLabelText("説明1")).toBeVisible();
    expect(screen.getByLabelText("理由2")).toBeVisible();
    expect(screen.getByLabelText("説明2")).toBeVisible();
    expect(screen.getByLabelText("結論")).toBeVisible();
    expect(
      screen.getByText("80〜100語は練習の目安です。", { exact: false }),
    ).toBeVisible();
  });

  it("debounce保存した下書きをreload相当の再描画後に復元する", async () => {
    const port = new MemoryWritingPort();
    const first = renderWriting(port);
    const editor = await screen.findByLabelText("英文を書く");
    fireEvent.change(editor, {
      target: { value: "A saved offline writing draft." },
    });

    await waitFor(() => {
      expect([...port.records.values()][0]?.draft).toBe(
        "A saved offline writing draft.",
      );
    });
    first.unmount();

    renderWriting(port);
    await expect(
      screen.findByDisplayValue("A saved offline writing draft."),
    ).resolves.toBeVisible();
  });

  it("autosave待機中に画面を離れても最新下書きをflushする", async () => {
    const port = new MemoryWritingPort();
    const view = renderWriting(port, { autosaveDelayMs: 60_000 });
    const editor = await screen.findByLabelText("英文を書く");
    fireEvent.change(editor, {
      target: { value: "Save this draft before navigation." },
    });

    view.unmount();

    await waitFor(() => {
      expect([...port.records.values()][0]?.draft).toBe(
        "Save this draft before navigation.",
      );
    });
  });

  it("空の提出を止め、入力後は正誤なしのAttemptと4観点を保存する", async () => {
    const user = userEvent.setup();
    const port = new MemoryWritingPort();
    renderWriting(port, { autosaveDelayMs: 60_000 });

    await user.click(
      await screen.findByRole("button", { name: "自己評価と一緒に提出" }),
    );
    expect(screen.getByText("英文を入力してから提出してください。")).toBeVisible();

    await user.type(
      screen.getByLabelText("英文を書く"),
      "The project helps local people and reduces waste.",
    );
    await user.click(screen.getByRole("checkbox", { name: /内容/ }));
    await user.click(screen.getByRole("checkbox", { name: /構成/ }));
    await user.click(screen.getByRole("button", { name: "自己評価と一緒に提出" }));

    await screen.findByText("作文と自己評価を端末内に保存しました。", {
      exact: false,
    });
    expect(port.commits).toHaveLength(1);
    expect(port.commits[0]?.attempt).toMatchObject({
      correct: null,
      score: 0,
      mode: "writing-summary",
    });
    expect(port.commits[0]?.submission.checklist).toMatchObject({
      content: true,
      organization: true,
      vocabulary: false,
      grammar: false,
    });
    expect(
      screen.getByText("自由作文のため、自動の正誤判定はありません。"),
    ).toBeVisible();
    expect(screen.getByText("1件")).toBeVisible();
  });

  it("autosave失敗時も入力を残し、再試行できる", async () => {
    const user = userEvent.setup();
    const port = new MemoryWritingPort();
    port.failSave = true;
    renderWriting(port);
    const editor = await screen.findByLabelText("英文を書く");
    await user.type(editor, "Draft is still visible.");

    await screen.findByText("下書き保存を利用できません");
    expect(editor).toHaveValue("Draft is still visible.");
    port.failSave = false;
    await user.click(screen.getByRole("button", { name: "保存を再試行" }));
    await screen.findByText("下書きを保存しました");
    expect([...port.records.values()][0]?.draft).toBe("Draft is still visible.");
  });

  it("教材0件、教材不正、DB読込失敗を説明付き状態で表示する", async () => {
    const empty = render(
      <WritingPage practiceSets={[]} port={new MemoryWritingPort()} />,
    );
    expect(
      screen.getByRole("heading", {
        name: "練習できる作文課題がまだありません",
      }),
    ).toBeVisible();
    empty.unmount();

    const invalidSet = {
      ...WRITING_SETS[0],
      payload: {},
    } as PracticeSet;
    const invalid = render(
      <WritingPage practiceSets={[invalidSet]} port={new MemoryWritingPort()} />,
    );
    expect(
      screen.getByRole("heading", { name: "作文課題を開けませんでした" }),
    ).toBeVisible();
    invalid.unmount();

    const failedPort = new MemoryWritingPort();
    failedPort.failLoad = true;
    renderWriting(failedPort);
    expect(
      await screen.findByRole("heading", {
        name: "ライティングを開けませんでした",
      }),
    ).toBeVisible();
    expect(screen.getByText("履歴を読み込めません")).toBeVisible();
    expect(screen.getByRole("button", { name: "もう一度試す" })).toBeEnabled();
  });

  it("日次プランから開いた場合は戻る操作を公開する", async () => {
    const user = userEvent.setup();
    const onReturnToToday = vi.fn();
    renderWriting(new MemoryWritingPort(), { onReturnToToday });

    await user.click(await screen.findByRole("button", { name: "今日の学習へ戻る" }));
    expect(onReturnToToday).toHaveBeenCalledTimes(1);
  });
});
