import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DataManagementPage } from "./DataManagementPage";
import type {
  BackupPreview,
  DataManagementOverview,
  DataManagementPort,
} from "./types";

const DEFAULT_OVERVIEW: DataManagementOverview = {
  storageEstimate: {
    status: "available",
    usageBytes: 2 * 1024 * 1024,
    quotaBytes: 100 * 1024 * 1024,
  },
  persistentStorage: {
    status: "available",
    persisted: false,
  },
  recordings: {
    count: 2,
    bytes: 3 * 1024 * 1024,
  },
  audioCache: {
    status: "available",
    entryCount: 4,
    bytes: 5 * 1024 * 1024,
  },
  appCache: {
    status: "available",
    entryCount: 12,
    bytes: 7 * 1024 * 1024,
  },
};

const DEFAULT_PREVIEW: BackupPreview = {
  schemaVersion: "1.0.0",
  appVersion: "0.1.0",
  exportedAt: "2026-07-27T03:04:00.000Z",
  contentVersions: {
    "pilot-core-ja-original": "0.6.0",
  },
  counts: {
    profiles: 1,
    settings: 1,
    reviewStates: 12,
    mastery: 10,
    vocabularyUserStates: 3,
    lessonProgress: 4,
    attempts: 20,
    sessions: 5,
    dailyPlans: 2,
    writingSubmissions: 1,
    speakingRecordings: 2,
  },
  recordingBytes: 3 * 1024 * 1024,
  warnings: ["このバックアップには録音が含まれます。"],
};

function createPort(overrides: Partial<DataManagementPort> = {}): DataManagementPort {
  return {
    loadOverview: vi.fn<DataManagementPort["loadOverview"]>(() =>
      Promise.resolve(DEFAULT_OVERVIEW),
    ),
    requestPersistentStorage: vi.fn<DataManagementPort["requestPersistentStorage"]>(
      () => Promise.resolve({ status: "granted" }),
    ),
    exportBackup: vi.fn<DataManagementPort["exportBackup"]>(() =>
      Promise.resolve({
        fileName: "e2-study-path-backup.json",
        recordCount: 59,
        recordingCount: 0,
        sizeBytes: 4096,
      }),
    ),
    inspectBackup: vi.fn<DataManagementPort["inspectBackup"]>(() =>
      Promise.resolve(DEFAULT_PREVIEW),
    ),
    restoreBackup: vi.fn<DataManagementPort["restoreBackup"]>((input) =>
      Promise.resolve({
        mode: input.mode,
        restoredRecordCount: 61,
        ...(input.createSafetyBackup
          ? { safetyBackupFileName: "safety-backup.json" }
          : {}),
      }),
    ),
    deleteRecordings: vi.fn<DataManagementPort["deleteRecordings"]>(() =>
      Promise.resolve({
        affectedCount: 2,
        freedBytes: 3 * 1024 * 1024,
      }),
    ),
    clearAudioCache: vi.fn<DataManagementPort["clearAudioCache"]>(() =>
      Promise.resolve({
        affectedCount: 4,
        freedBytes: 5 * 1024 * 1024,
      }),
    ),
    rebuildAppCache: vi.fn<DataManagementPort["rebuildAppCache"]>(() =>
      Promise.resolve({
        affectedCount: 12,
        freedBytes: 7 * 1024 * 1024,
      }),
    ),
    deleteAllUserData: vi.fn<DataManagementPort["deleteAllUserData"]>(() =>
      Promise.resolve({
        affectedCount: 59,
        freedBytes: 8 * 1024 * 1024,
      }),
    ),
    ...overrides,
  };
}

function setOnline(value: boolean) {
  Object.defineProperty(navigator, "onLine", {
    configurable: true,
    value,
  });
}

afterEach(() => {
  setOnline(true);
});

describe("DataManagementPage", () => {
  it("読込中を通知し、保存容量と既定録音OFFのバックアップを書き出す", async () => {
    let resolveOverview: ((overview: DataManagementOverview) => void) | undefined;
    const exportBackup = vi.fn<DataManagementPort["exportBackup"]>(() =>
      Promise.resolve({
        fileName: "e2-study-path-backup.json",
        recordCount: 59,
        recordingCount: 0,
        sizeBytes: 4096,
      }),
    );
    const port = createPort({
      loadOverview: vi.fn(
        () =>
          new Promise<DataManagementOverview>((resolve) => {
            resolveOverview = resolve;
          }),
      ),
      exportBackup,
    });
    const user = userEvent.setup();

    render(<DataManagementPage port={port} />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "データ管理を準備しています",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "保存容量とデータの状態を確認しています",
    );

    resolveOverview?.(DEFAULT_OVERVIEW);

    const storageProgress = await screen.findByRole("progressbar", {
      name: "このサイトが利用している保存容量の目安",
    });
    expect(screen.getByRole("heading", { name: "データ管理" })).toBeInTheDocument();
    expect(storageProgress).toHaveAttribute(
      "aria-valuetext",
      "2 MB / 利用可能な目安 100 MB",
    );

    const recordingsOption = screen.getByRole("checkbox", {
      name: /スピーキング録音も含める/u,
    });
    expect(recordingsOption).not.toBeChecked();

    await user.click(screen.getByRole("button", { name: "JSONを書き出す" }));

    expect(exportBackup).toHaveBeenCalledWith({
      includeRecordings: false,
    });
    expect(await screen.findByText("バックアップを書き出しました")).toBeInTheDocument();
  });

  it("読込失敗を表示し、再試行できる", async () => {
    const loadOverview = vi
      .fn<DataManagementPort["loadOverview"]>()
      .mockRejectedValueOnce(new Error("容量を読み込めません。"))
      .mockResolvedValue(DEFAULT_OVERVIEW);
    const port = createPort({ loadOverview });
    const user = userEvent.setup();

    render(<DataManagementPage port={port} />);

    expect(
      await screen.findByRole("heading", {
        name: "データ管理を開けませんでした",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("容量を読み込めません。")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "もう一度試す" }));

    expect(
      await screen.findByRole("heading", { name: "保存容量" }),
    ).toBeInTheDocument();
    expect(loadOverview).toHaveBeenCalledTimes(2);
  });

  it("非対応の容量・永続保存・Cache APIを説明し、操作を無効にする", async () => {
    const unsupportedOverview: DataManagementOverview = {
      storageEstimate: {
        status: "unsupported",
        message: "このブラウザーでは容量を取得できません。",
      },
      persistentStorage: {
        status: "unsupported",
        message: "永続保存APIに対応していません。",
      },
      recordings: { count: 0, bytes: 0 },
      audioCache: {
        status: "unsupported",
        message: "音声キャッシュを確認できません。",
      },
      appCache: {
        status: "unsupported",
        message: "アプリキャッシュを確認できません。",
      },
    };
    const port = createPort({
      loadOverview: vi.fn(() => Promise.resolve(unsupportedOverview)),
    });

    render(<DataManagementPage port={port} />);

    expect(await screen.findByText("容量の推定に対応していません")).toBeInTheDocument();
    expect(screen.getByText("永続保存APIに対応していません。")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "録音だけ削除" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "音声キャッシュを削除" })).toBeDisabled();
    expect(
      screen.getByRole("button", {
        name: "アプリキャッシュを再構築",
      }),
    ).toBeDisabled();
  });

  it("JSONを検証し、version・件数・録音容量・警告をpreviewして安全backup付き置換を確認する", async () => {
    let resolveInspection: ((preview: BackupPreview) => void) | undefined;
    const inspectBackup = vi.fn(
      () =>
        new Promise<BackupPreview>((resolve) => {
          resolveInspection = resolve;
        }),
    );
    const restoreBackup = vi.fn<DataManagementPort["restoreBackup"]>((input) =>
      Promise.resolve({
        mode: input.mode,
        restoredRecordCount: 61,
        safetyBackupFileName: "safety-backup.json",
      }),
    );
    const port = createPort({ inspectBackup, restoreBackup });
    const user = userEvent.setup();
    const file = new File(["{}"], "learning-backup.json", {
      type: "application/json",
    });

    render(<DataManagementPage port={port} />);
    await screen.findByRole("heading", { name: "データ管理" });

    await user.upload(screen.getByLabelText("バックアップJSON"), file);
    expect(screen.getByText("バックアップを検証しています")).toBeInTheDocument();

    resolveInspection?.(DEFAULT_PREVIEW);

    const preview = await screen.findByRole("heading", {
      name: "復元する内容",
    });
    const previewSection = preview.closest("section");
    expect(previewSection).not.toBeNull();
    const previewQueries = within(previewSection!);
    expect(previewQueries.getByText("1.0.0")).toBeInTheDocument();
    expect(previewQueries.getByText("0.1.0")).toBeInTheDocument();
    expect(
      previewQueries.getByText("pilot-core-ja-original: 0.6.0"),
    ).toBeInTheDocument();
    expect(previewQueries.getByText("回答履歴")).toBeInTheDocument();
    expect(previewQueries.getByText("20件")).toBeInTheDocument();
    expect(previewQueries.getByText("3 MB")).toBeInTheDocument();
    expect(
      previewQueries.getByText("このバックアップには録音が含まれます。"),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: /現在のデータを置換/u }));
    const safetyBackup = screen.getByRole("checkbox", {
      name: /置換前に現在の安全バックアップを書き出す/u,
    });
    expect(safetyBackup).toBeChecked();

    await user.click(screen.getByRole("button", { name: "復元内容を最終確認" }));
    const dialog = screen.getByRole("dialog", {
      name: "バックアップで置き換えますか",
    });
    expect(dialog).toHaveTextContent("安全バックアップ: 作成する");

    await user.click(within(dialog).getByRole("button", { name: "置換して復元" }));

    await waitFor(() => {
      expect(restoreBackup).toHaveBeenCalledWith({
        file,
        mode: "replace",
        createSafetyBackup: true,
      });
    });
    expect(await screen.findByText("バックアップで置き換えました")).toBeInTheDocument();
  });

  it("破損したJSONはerror表示に留め、復元操作を出さない", async () => {
    const restoreBackup = vi.fn<DataManagementPort["restoreBackup"]>();
    const port = createPort({
      inspectBackup: vi.fn(() =>
        Promise.reject(new Error("schema version 9.0.0には対応していません。")),
      ),
      restoreBackup,
    });
    const user = userEvent.setup();

    render(<DataManagementPage port={port} />);
    await screen.findByRole("heading", { name: "データ管理" });

    await user.upload(
      screen.getByLabelText("バックアップJSON"),
      new File(["broken"], "broken.json", { type: "application/json" }),
    );

    expect(
      await screen.findByText("このバックアップは復元できません"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/schema version 9\.0\.0には対応していません/u),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "復元内容を最終確認" }),
    ).not.toBeInTheDocument();
    expect(restoreBackup).not.toHaveBeenCalled();
  });

  it("録音と音声キャッシュを別々の確認後に削除する", async () => {
    const deleteRecordings = vi.fn<DataManagementPort["deleteRecordings"]>(() =>
      Promise.resolve({ affectedCount: 2, freedBytes: 3 * 1024 * 1024 }),
    );
    const clearAudioCache = vi.fn<DataManagementPort["clearAudioCache"]>(() =>
      Promise.resolve({ affectedCount: 4, freedBytes: 5 * 1024 * 1024 }),
    );
    const deleteAllUserData = vi.fn<DataManagementPort["deleteAllUserData"]>();
    const port = createPort({
      deleteRecordings,
      clearAudioCache,
      deleteAllUserData,
    });
    const user = userEvent.setup();

    render(<DataManagementPage port={port} />);
    await screen.findByRole("heading", { name: "データ管理" });

    await user.click(screen.getByRole("button", { name: "録音だけ削除" }));
    const recordingsDialog = screen.getByRole("dialog", {
      name: "保存した録音を削除しますか",
    });
    expect(recordingsDialog).toHaveTextContent("学習履歴とテキスト回答は残ります");
    await user.click(
      within(recordingsDialog).getByRole("button", { name: "録音を削除" }),
    );
    await waitFor(() => expect(deleteRecordings).toHaveBeenCalledOnce());

    await user.click(screen.getByRole("button", { name: "音声キャッシュを削除" }));
    const audioDialog = screen.getByRole("dialog", {
      name: "音声キャッシュを削除しますか",
    });
    expect(audioDialog).toHaveTextContent("学習記録は削除しません");
    await user.click(
      within(audioDialog).getByRole("button", {
        name: "キャッシュを削除",
      }),
    );

    await waitFor(() => expect(clearAudioCache).toHaveBeenCalledOnce());
    expect(deleteAllUserData).not.toHaveBeenCalled();
  });

  it("アプリキャッシュ再構築をオフライン中は無効にし、接続復帰後だけ実行する", async () => {
    setOnline(false);
    const rebuildAppCache = vi.fn<DataManagementPort["rebuildAppCache"]>(() =>
      Promise.resolve({ affectedCount: 12, freedBytes: 7 * 1024 * 1024 }),
    );
    const port = createPort({ rebuildAppCache });
    const user = userEvent.setup();

    render(<DataManagementPage port={port} />);
    await screen.findByRole("heading", { name: "データ管理" });

    const rebuildButton = screen.getByRole("button", {
      name: "アプリキャッシュを再構築",
    });
    expect(rebuildButton).toBeDisabled();
    expect(screen.getByText("オフライン中は再構築できません。")).toBeInTheDocument();

    setOnline(true);
    globalThis.dispatchEvent(new Event("online"));

    await waitFor(() => expect(rebuildButton).toBeEnabled());
    await user.click(rebuildButton);
    const dialog = screen.getByRole("dialog", {
      name: "アプリキャッシュを再構築しますか",
    });
    expect(dialog).toHaveTextContent("IndexedDBの学習記録");
    await user.click(within(dialog).getByRole("button", { name: "再構築する" }));

    await waitFor(() => expect(rebuildAppCache).toHaveBeenCalledOnce());
  });

  it("全利用者データ削除は『削除』の完全一致まで実行できない", async () => {
    const deleteAllUserData = vi.fn<DataManagementPort["deleteAllUserData"]>(() =>
      Promise.resolve({
        affectedCount: 59,
        freedBytes: 8 * 1024 * 1024,
      }),
    );
    const port = createPort({ deleteAllUserData });
    const onAllUserDataDeleted = vi.fn();
    const user = userEvent.setup();

    render(
      <DataManagementPage port={port} onAllUserDataDeleted={onAllUserDataDeleted} />,
    );
    await screen.findByRole("heading", { name: "データ管理" });

    await user.click(
      screen.getByRole("button", { name: "全利用者データの削除へ進む" }),
    );
    const dialog = screen.getByRole("dialog", {
      name: "すべての利用者データを削除しますか",
    });
    const confirmation = within(dialog).getByLabelText("確認のため「削除」と入力");
    const deleteButton = within(dialog).getByRole("button", {
      name: "完全に削除",
    });
    expect(deleteButton).toBeDisabled();

    await user.type(confirmation, "削 除");
    expect(deleteButton).toBeDisabled();
    expect(deleteAllUserData).not.toHaveBeenCalled();

    await user.clear(confirmation);
    await user.type(confirmation, "削除");
    expect(deleteButton).toBeEnabled();
    await user.click(deleteButton);

    await waitFor(() => expect(deleteAllUserData).toHaveBeenCalledOnce());
    expect(onAllUserDataDeleted).toHaveBeenCalledOnce();
  });
});
