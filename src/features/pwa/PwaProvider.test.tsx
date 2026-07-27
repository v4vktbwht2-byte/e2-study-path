import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  flushPendingUpdateWrites,
  trackPendingUpdateWrite,
  type PwaServiceWorkerCallbacks,
  type PwaServiceWorkerRegistrar,
} from "../../infrastructure/pwa";
import { PwaInstallPanel } from "./PwaInstallPanel";
import { PwaProvider, usePwa, usePwaUpdateParticipant } from "./PwaProvider";
import { PwaStatusRegion } from "./PwaStatusRegion";

function createServiceWorkerHarness() {
  let callbacks: PwaServiceWorkerCallbacks | undefined;
  const applyUpdate = vi.fn(() => Promise.resolve());
  const dispose = vi.fn();
  const registrar: PwaServiceWorkerRegistrar = (nextCallbacks) => {
    callbacks = nextCallbacks;
    return { applyUpdate, dispose };
  };

  return {
    registrar,
    applyUpdate,
    dispose,
    callbacks: () => {
      if (!callbacks) {
        throw new Error("Service Worker callbacks are not registered.");
      }
      return callbacks;
    },
  };
}

function UpdateHarness({
  initialActive = false,
  flush,
}: {
  readonly initialActive?: boolean;
  readonly flush: () => Promise<void>;
}) {
  const [active, setActive] = useState(initialActive);
  const pwa = usePwa();
  usePwaUpdateParticipant({ id: "test-study", active, flush });

  return (
    <>
      <output data-testid="update-flow">{pwa.updateFlow}</output>
      <output data-testid="active-count">{pwa.activeStudyCount}</output>
      <PwaStatusRegion />
      <button type="button" onClick={() => void pwa.requestUpdate()}>
        更新
      </button>
      <button type="button" onClick={() => setActive(false)}>
        学習終了
      </button>
      <button type="button" onClick={() => setActive(true)}>
        学習開始
      </button>
    </>
  );
}

describe("PwaProvider update safety", () => {
  it("active study中は更新を適用せず、終了後にflushして適用する", async () => {
    const serviceWorker = createServiceWorkerHarness();
    const flush = vi.fn(() => Promise.resolve());
    const user = userEvent.setup();

    render(
      <PwaProvider serviceWorkerRegistrar={serviceWorker.registrar}>
        <UpdateHarness initialActive flush={flush} />
      </PwaProvider>,
    );
    act(() => serviceWorker.callbacks().onUpdateAvailable());
    expect(screen.getByRole("button", { name: "学習を終えて更新" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "更新" }));

    await waitFor(() =>
      expect(screen.getByTestId("update-flow")).toHaveTextContent("blocked"),
    );
    expect(flush).not.toHaveBeenCalled();
    expect(serviceWorker.applyUpdate).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "学習終了" }));
    await waitFor(() =>
      expect(screen.getByTestId("active-count")).toHaveTextContent("0"),
    );
    await user.click(screen.getByRole("button", { name: "更新" }));

    await waitFor(() => expect(serviceWorker.applyUpdate).toHaveBeenCalledTimes(1));
    expect(flush).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("update-flow")).toHaveTextContent("applying");
  });

  it("flush失敗時はService Workerへ更新適用を指示しない", async () => {
    const serviceWorker = createServiceWorkerHarness();
    const flush = vi.fn(() => Promise.reject(new Error("保存失敗")));
    const user = userEvent.setup();

    render(
      <PwaProvider serviceWorkerRegistrar={serviceWorker.registrar}>
        <UpdateHarness flush={flush} />
      </PwaProvider>,
    );
    act(() => serviceWorker.callbacks().onUpdateAvailable());
    await user.click(screen.getByRole("button", { name: "更新" }));

    await waitFor(() =>
      expect(screen.getByTestId("update-flow")).toHaveTextContent("failed"),
    );
    expect(serviceWorker.applyUpdate).not.toHaveBeenCalled();
  });

  it("保留中の実書込みPromiseが完了するまで更新を適用しない", async () => {
    const serviceWorker = createServiceWorkerHarness();
    const user = userEvent.setup();
    let finishWrite: (() => void) | undefined;
    const write = new Promise<void>((resolve) => {
      finishWrite = resolve;
    });
    void trackPendingUpdateWrite("provider-test-write", () => write);

    render(
      <PwaProvider serviceWorkerRegistrar={serviceWorker.registrar}>
        <UpdateHarness flush={flushPendingUpdateWrites} />
      </PwaProvider>,
    );
    act(() => serviceWorker.callbacks().onUpdateAvailable());
    await user.click(screen.getByRole("button", { name: "更新" }));

    await waitFor(() =>
      expect(screen.getByTestId("update-flow")).toHaveTextContent("flushing"),
    );
    expect(serviceWorker.applyUpdate).not.toHaveBeenCalled();

    finishWrite?.();
    await waitFor(() => expect(serviceWorker.applyUpdate).toHaveBeenCalledOnce());
  });

  it("承認前のcontroller切替はreloadせず、保存確認後だけreloadする", async () => {
    const serviceWorker = createServiceWorkerHarness();
    const reload = vi.fn();
    const user = userEvent.setup();

    render(
      <PwaProvider serviceWorkerRegistrar={serviceWorker.registrar} reloadPage={reload}>
        <UpdateHarness flush={() => Promise.resolve()} />
      </PwaProvider>,
    );

    act(() => serviceWorker.callbacks().onReloadRequired());
    expect(reload).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "更新" }));
    await waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
    expect(serviceWorker.applyUpdate).not.toHaveBeenCalled();
  });

  it("flush待機中に学習が始まった場合は更新を保留する", async () => {
    const serviceWorker = createServiceWorkerHarness();
    const user = userEvent.setup();
    let finishFlush: (() => void) | undefined;
    const flush = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finishFlush = resolve;
        }),
    );

    render(
      <PwaProvider serviceWorkerRegistrar={serviceWorker.registrar}>
        <UpdateHarness flush={flush} />
      </PwaProvider>,
    );
    act(() => serviceWorker.callbacks().onUpdateAvailable());
    await user.click(screen.getByRole("button", { name: "更新" }));
    await user.click(screen.getByRole("button", { name: "学習開始" }));
    finishFlush?.();

    await waitFor(() =>
      expect(screen.getByTestId("update-flow")).toHaveTextContent("blocked"),
    );
    expect(serviceWorker.applyUpdate).not.toHaveBeenCalled();
  });

  it("controller切替後に学習が始まった場合もreloadを保留し、終了後に再確認する", async () => {
    const serviceWorker = createServiceWorkerHarness();
    const reload = vi.fn();
    const user = userEvent.setup();

    render(
      <PwaProvider serviceWorkerRegistrar={serviceWorker.registrar} reloadPage={reload}>
        <UpdateHarness flush={() => Promise.resolve()} />
      </PwaProvider>,
    );
    act(() => serviceWorker.callbacks().onUpdateAvailable());
    await user.click(screen.getByRole("button", { name: "更新" }));
    await waitFor(() => expect(serviceWorker.applyUpdate).toHaveBeenCalledTimes(1));

    await user.click(screen.getByRole("button", { name: "学習開始" }));
    act(() => serviceWorker.callbacks().onReloadRequired());
    await waitFor(() =>
      expect(screen.getByTestId("update-flow")).toHaveTextContent("blocked"),
    );
    expect(reload).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "学習終了" }));
    await waitFor(() =>
      expect(screen.getByTestId("active-count")).toHaveTextContent("0"),
    );
    await user.click(screen.getByRole("button", { name: "更新" }));

    await waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
    expect(serviceWorker.applyUpdate).toHaveBeenCalledTimes(1);
  });
});

describe("PwaStatusRegionとinstall案内", () => {
  it("offline状態と安全な更新案内を共通表示する", () => {
    const serviceWorker = createServiceWorkerHarness();

    render(
      <PwaProvider serviceWorkerRegistrar={serviceWorker.registrar}>
        <PwaStatusRegion />
      </PwaProvider>,
    );
    expect(screen.queryByLabelText("アプリの状態")).not.toBeInTheDocument();

    act(() => {
      globalThis.dispatchEvent(new Event("offline"));
    });
    expect(screen.getByText("オフラインで利用中です")).toBeVisible();

    act(() => serviceWorker.callbacks().onUpdateAvailable());
    expect(screen.getByText("アプリの更新があります")).toBeVisible();
    expect(screen.getByRole("button", { name: "保存して更新" })).toBeVisible();
  });

  it("beforeinstallpromptをユーザー操作まで保留して結果を表示する", async () => {
    const serviceWorker = createServiceWorkerHarness();
    const prompt = vi.fn(() => Promise.resolve());
    const installEvent = new Event("beforeinstallprompt", {
      cancelable: true,
    });
    Object.defineProperties(installEvent, {
      prompt: { value: prompt },
      userChoice: {
        value: Promise.resolve({
          outcome: "accepted",
          platform: "web",
        }),
      },
    });
    const user = userEvent.setup();

    render(
      <PwaProvider serviceWorkerRegistrar={serviceWorker.registrar}>
        <PwaInstallPanel />
      </PwaProvider>,
    );
    act(() => {
      globalThis.dispatchEvent(installEvent);
    });

    const installButton = screen.getByRole("button", { name: "端末へ追加" });
    expect(prompt).not.toHaveBeenCalled();
    await user.click(installButton);

    await waitFor(() => expect(prompt).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("端末へ追加されています")).toBeVisible();
  });

  it("Providerを外すとService Worker callbacksを無効化する", () => {
    const serviceWorker = createServiceWorkerHarness();
    const rendered = render(
      <PwaProvider serviceWorkerRegistrar={serviceWorker.registrar}>
        <span>content</span>
      </PwaProvider>,
    );

    rendered.unmount();
    expect(serviceWorker.dispose).toHaveBeenCalledTimes(1);
  });
});
