import { render, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { PwaProvider } from "../features/pwa";
import { UpdateSafetyRegistry } from "../infrastructure/pwa";
import { AppLayout } from "./AppLayout";

function renderLayoutAt(path: string, registry: UpdateSafetyRegistry) {
  const router = createMemoryRouter(
    [
      {
        path: "/",
        Component: AppLayout,
        children: [
          {
            path: "*",
            Component: () => <p>テスト画面</p>,
          },
        ],
      },
    ],
    { initialEntries: [path] },
  );

  return render(
    <PwaProvider
      updateSafetyRegistry={registry}
      serviceWorkerRegistrar={() => ({
        applyUpdate: vi.fn(),
        dispose: vi.fn(),
      })}
    >
      <RouterProvider router={router} />
    </PwaProvider>,
  );
}

describe("AppLayoutの更新安全制御", () => {
  it("学習セッション画面を更新中として登録する", async () => {
    const registry = new UpdateSafetyRegistry();

    renderLayoutAt("/practice/writing", registry);

    await waitFor(() => {
      expect(registry.getActiveParticipantIds()).toEqual(["active-study-route"]);
    });
  });

  it("初回設定の入力途中も更新中として登録する", async () => {
    const registry = new UpdateSafetyRegistry();

    renderLayoutAt("/Onboarding/", registry);

    await waitFor(() => {
      expect(registry.getActiveParticipantIds()).toEqual(["active-study-route"]);
    });
  });

  it("設定画面では安全な更新準備を許可する", async () => {
    const registry = new UpdateSafetyRegistry();

    renderLayoutAt("/settings", registry);

    await waitFor(() => {
      expect(registry.getActiveParticipantIds()).toEqual([]);
    });
    await expect(registry.prepare()).resolves.toMatchObject({ status: "ready" });
  });
});
