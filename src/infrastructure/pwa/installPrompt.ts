export interface BeforeInstallPromptEventLike extends Event {
  readonly userChoice: Promise<{
    readonly outcome: "accepted" | "dismissed";
    readonly platform: string;
  }>;
  prompt(): Promise<void>;
}

export interface InstallEnvironment {
  readonly installed: boolean;
  readonly ios: boolean;
}

interface NavigatorInstallHints {
  readonly userAgent?: string;
  readonly platform?: string;
  readonly maxTouchPoints?: number;
  readonly standalone?: boolean;
}

export function isIosInstallEnvironment({
  userAgent = "",
  platform = "",
  maxTouchPoints = 0,
}: NavigatorInstallHints) {
  const reportsIosDevice = /iPad|iPhone|iPod/iu.test(userAgent);
  const reportsTouchMac =
    /Mac/iu.test(platform) && maxTouchPoints > 1 && /Safari/iu.test(userAgent);
  return reportsIosDevice || reportsTouchMac;
}

export function detectInstallEnvironment(
  navigatorHints: NavigatorInstallHints | undefined = typeof navigator === "undefined"
    ? undefined
    : navigator,
  standaloneMediaMatches = typeof globalThis.matchMedia === "function"
    ? globalThis.matchMedia("(display-mode: standalone)").matches
    : false,
): InstallEnvironment {
  if (navigatorHints === undefined) {
    return { installed: false, ios: false };
  }

  return {
    installed: standaloneMediaMatches || navigatorHints.standalone === true,
    ios: isIosInstallEnvironment(navigatorHints),
  };
}

export function isBeforeInstallPromptEvent(
  event: Event,
): event is BeforeInstallPromptEventLike {
  const candidate = event as Partial<BeforeInstallPromptEventLike>;
  return (
    typeof candidate.prompt === "function" && candidate.userChoice instanceof Promise
  );
}
