import { Suspense } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AppShell, BottomNavigation, Card, TopBar } from "../shared/components";
import styles from "./AppLayout.module.css";

type MainTabId = "today" | "course" | "vocabulary" | "practice" | "progress";

function getCurrentTab(pathname: string): MainTabId | undefined {
  if (pathname === "/") {
    return "today";
  }

  if (pathname.startsWith("/course") || pathname.startsWith("/lesson")) {
    return "course";
  }

  if (pathname.startsWith("/vocabulary") || pathname.startsWith("/review")) {
    return "vocabulary";
  }

  if (pathname.startsWith("/practice") || pathname.startsWith("/mock")) {
    return "practice";
  }

  if (pathname.startsWith("/progress")) {
    return "progress";
  }

  return undefined;
}

function RouteLoadingState() {
  return (
    <Card as="section" className={styles.loading} aria-live="polite">
      <p role="status">画面を読み込んでいます…</p>
    </Card>
  );
}

export function AppLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const currentTab = getCurrentTab(pathname);
  const navigationItems = [
    { id: "today", label: "今日", href: "#/", isCurrent: currentTab === "today" },
    {
      id: "course",
      label: "コース",
      href: "#/course",
      isCurrent: currentTab === "course",
    },
    {
      id: "vocabulary",
      label: "単語",
      href: "#/vocabulary",
      isCurrent: currentTab === "vocabulary",
    },
    {
      id: "practice",
      label: "練習",
      href: "#/practice",
      isCurrent: currentTab === "practice",
    },
    {
      id: "progress",
      label: "記録",
      href: "#/progress",
      isCurrent: currentTab === "progress",
    },
  ] satisfies Parameters<typeof BottomNavigation>[0]["items"];

  const topActions = (
    <nav className={styles.topActions} aria-label="補助メニュー">
      <Link className={styles.topLink} to="/help">
        ヘルプ
      </Link>
      <Link className={styles.topLink} to="/settings">
        設定
      </Link>
    </nav>
  );

  return (
    <AppShell
      mainId="main-content"
      mainAriaLabel="学習コンテンツ"
      topBar={
        <TopBar
          title="E2 Study Path"
          subtitle="英語を、基礎から少しずつ"
          actions={topActions}
          headingLevel="none"
        />
      }
      bottomNavigation={
        <BottomNavigation
          ariaLabel="メインメニュー"
          items={navigationItems}
          onItemSelect={(item) => {
            void navigate(item.href.replace(/^#/u, ""));
          }}
        />
      }
    >
      <Suspense fallback={<RouteLoadingState />}>
        <Outlet />
      </Suspense>
    </AppShell>
  );
}
