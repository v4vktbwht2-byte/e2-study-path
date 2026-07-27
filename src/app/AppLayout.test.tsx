import { act, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { createMemoryRouter, RouterProvider, useLocation } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { PwaProvider } from "../features/pwa";
import { UpdateSafetyRegistry } from "../infrastructure/pwa";
import { AppLayout } from "./AppLayout";

function TestRouteHeading() {
  const { pathname } = useLocation();
  return <h1>{pathname}</h1>;
}

function SwappingRouteHeading() {
  const [ready, setReady] = useState(false);
  return ready ? (
    <h1>読み込み完了</h1>
  ) : (
    <>
      <h1>読み込み中</h1>
      <button type="button" onClick={() => setReady(true)}>
        読み込みを完了
      </button>
    </>
  );
}

function renderLayoutAt(path: string, registry: UpdateSafetyRegistry) {
  const router = createMemoryRouter(
    [
      {
        path: "/",
        Component: AppLayout,
        children: [
          {
            path: "swap",
            Component: SwappingRouteHeading,
          },
          {
            path: "*",
            Component: TestRouteHeading,
          },
        ],
      },
    ],
    { initialEntries: [path] },
  );

  const rendered = render(
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
  return { ...rendered, router };
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

  it("route遷移後にlazy描画された主見出しへフォーカスする", async () => {
    const registry = new UpdateSafetyRegistry();
    const { router } = renderLayoutAt("/settings", registry);

    await waitFor(() => {
      expect(document.querySelector("h1")).toHaveFocus();
    });
    await act(async () => {
      await router.navigate("/help");
    });

    await waitFor(() => {
      expect(document.querySelector("h1")).toHaveTextContent("/help");
      expect(document.querySelector("h1")).toHaveFocus();
    });
  });

  it("同じrouteでloading見出しが差し替わっても新しいh1へフォーカスする", async () => {
    const registry = new UpdateSafetyRegistry();
    renderLayoutAt("/swap", registry);

    await waitFor(() => {
      expect(document.querySelector("h1")).toHaveTextContent("読み込み中");
      expect(document.querySelector("h1")).toHaveFocus();
    });
    act(() => {
      screen.getByRole("button", { name: "読み込みを完了" }).click();
    });

    await waitFor(() => {
      expect(document.querySelector("h1")).toHaveTextContent("読み込み完了");
      expect(document.querySelector("h1")).toHaveFocus();
    });
  });
});
