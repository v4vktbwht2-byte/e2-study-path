import { useEffect } from "react";
import { useLocation } from "react-router-dom";

function focusRouteHeading(main: HTMLElement): HTMLHeadingElement | null {
  const heading = main.querySelector<HTMLHeadingElement>("h1");
  if (!heading) {
    return null;
  }

  if (!heading.hasAttribute("tabindex")) {
    heading.setAttribute("tabindex", "-1");
  }
  main.scrollTop = 0;
  main.scrollLeft = 0;
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  heading.focus({ preventScroll: true });
  return heading;
}

/**
 * lazy routeの描画完了後も含め、画面遷移時に最初の主見出しへフォーカスする。
 * 問題切替など同じURL内の細かなフォーカス管理は各featureへ任せる。
 */
export function RouteFocusManager({ mainId = "main-content" }: { mainId?: string }) {
  const { pathname, search } = useLocation();

  useEffect(() => {
    const main = document.getElementById(mainId);
    if (!main) {
      return;
    }
    let routeHeading = focusRouteHeading(main);

    const observer = new MutationObserver(() => {
      const currentHeading = main.querySelector<HTMLHeadingElement>("h1");
      if (!currentHeading || routeHeading?.isConnected) {
        return;
      }

      const activeElement = document.activeElement;
      const focusWasLost =
        activeElement === document.body ||
        activeElement === main ||
        !(activeElement instanceof HTMLElement) ||
        !activeElement.isConnected;
      if (focusWasLost) {
        routeHeading = focusRouteHeading(main);
      } else {
        // feature側が次の問題や見出しへfocus済みなら、その判断を優先する。
        routeHeading = currentHeading;
      }
    });
    observer.observe(main, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [mainId, pathname, search]);

  return null;
}
