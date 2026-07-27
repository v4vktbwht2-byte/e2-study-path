/* eslint-disable react-refresh/only-export-components -- Provider専用hooksを同じ公開面で提供する。 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  UpdateSafetyRegistry,
  detectInstallEnvironment,
  isBeforeInstallPromptEvent,
  registerPwaServiceWorker,
  type BeforeInstallPromptEventLike,
  type PwaServiceWorkerHandle,
  type PwaServiceWorkerRegistrar,
  type UpdateParticipant,
} from "../../infrastructure/pwa";

export type PwaUpdateFlow = "idle" | "blocked" | "flushing" | "applying" | "failed";

export type PwaInstallAvailability =
  "installed" | "prompt" | "ios-help" | "unavailable";

export type UpdateRequestResult =
  | { readonly status: "no-update" }
  | { readonly status: "blocked"; readonly activeParticipantIds: readonly string[] }
  | {
      readonly status: "flush-failed";
      readonly failedParticipantIds: readonly string[];
    }
  | { readonly status: "applying" }
  | { readonly status: "apply-failed"; readonly error: unknown };

export interface PwaContextValue {
  readonly online: boolean;
  readonly offlineReady: boolean;
  readonly updateAvailable: boolean;
  readonly showUpdateNotice: boolean;
  readonly updateFlow: PwaUpdateFlow;
  readonly updateMessage: string | undefined;
  readonly activeStudyCount: number;
  readonly registrationError: string | undefined;
  readonly installAvailability: PwaInstallAvailability;
  readonly lastInstallOutcome: "accepted" | "dismissed" | undefined;
  readonly registerUpdateParticipant: (participant: UpdateParticipant) => () => void;
  readonly refreshActiveStudyState: () => void;
  readonly requestUpdate: () => Promise<UpdateRequestResult>;
  readonly dismissUpdateNotice: () => void;
  readonly dismissOfflineReadyNotice: () => void;
  readonly promptInstall: () => Promise<"accepted" | "dismissed" | "unavailable">;
}

const PwaContext = createContext<PwaContextValue | undefined>(undefined);

function browserReload() {
  window.location.reload();
}

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

const ACTIVE_UPDATE_MESSAGE = "学習中のため、更新を保留しました。";
const SAVE_FAILURE_MESSAGE =
  "保存を完了できなかったため、更新していません。通信状態を確認してもう一度お試しください。";

export interface PwaProviderProps {
  readonly children: ReactNode;
  readonly serviceWorkerRegistrar?: PwaServiceWorkerRegistrar;
  readonly updateSafetyRegistry?: UpdateSafetyRegistry;
  readonly reloadPage?: () => void;
}

export function PwaProvider({
  children,
  serviceWorkerRegistrar = registerPwaServiceWorker,
  updateSafetyRegistry,
  reloadPage = browserReload,
}: PwaProviderProps) {
  const [registry] = useState(() => updateSafetyRegistry ?? new UpdateSafetyRegistry());
  const [online, setOnline] = useState(
    () => typeof navigator === "undefined" || navigator.onLine,
  );
  const [offlineReady, setOfflineReady] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateDismissed, setUpdateDismissed] = useState(false);
  const [updateFlow, setUpdateFlow] = useState<PwaUpdateFlow>("idle");
  const [updateMessage, setUpdateMessage] = useState<string>();
  const [activeParticipantIds, setActiveParticipantIds] = useState<readonly string[]>(
    [],
  );
  const [registrationError, setRegistrationError] = useState<string>();
  const [installEnvironment, setInstallEnvironment] = useState(() =>
    detectInstallEnvironment(),
  );
  const [installPromptAvailable, setInstallPromptAvailable] = useState(false);
  const [lastInstallOutcome, setLastInstallOutcome] = useState<
    "accepted" | "dismissed"
  >();
  const serviceWorkerHandleRef = useRef<PwaServiceWorkerHandle | undefined>(undefined);
  const installPromptRef = useRef<BeforeInstallPromptEventLike | undefined>(undefined);
  const reloadApprovedRef = useRef(false);
  const reloadPendingRef = useRef(false);

  const refreshActiveStudyState = useCallback(() => {
    const activeIds = registry.getActiveParticipantIds();
    setActiveParticipantIds(activeIds);
    if (activeIds.length === 0) {
      setUpdateFlow((current) => (current === "blocked" ? "idle" : current));
      setUpdateMessage((current) =>
        current === ACTIVE_UPDATE_MESSAGE ? undefined : current,
      );
    }
  }, [registry]);

  const registerUpdateParticipant = useCallback(
    (participant: UpdateParticipant) => {
      const unregister = registry.register(participant);
      refreshActiveStudyState();
      return () => {
        unregister();
        refreshActiveStudyState();
      };
    },
    [refreshActiveStudyState, registry],
  );

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    globalThis.addEventListener?.("online", handleOnline);
    globalThis.addEventListener?.("offline", handleOffline);
    return () => {
      globalThis.removeEventListener?.("online", handleOnline);
      globalThis.removeEventListener?.("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      if (!isBeforeInstallPromptEvent(event)) {
        return;
      }
      event.preventDefault();
      installPromptRef.current = event;
      setInstallPromptAvailable(true);
      setLastInstallOutcome(undefined);
    };
    const handleInstalled = () => {
      installPromptRef.current = undefined;
      setInstallPromptAvailable(false);
      setInstallEnvironment((current) => ({ ...current, installed: true }));
      setLastInstallOutcome("accepted");
    };

    globalThis.addEventListener?.("beforeinstallprompt", handleBeforeInstallPrompt);
    globalThis.addEventListener?.("appinstalled", handleInstalled);
    return () => {
      globalThis.removeEventListener?.(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      globalThis.removeEventListener?.("appinstalled", handleInstalled);
    };
  }, []);

  const prepareControllerReload = useCallback(async () => {
    reloadPendingRef.current = true;
    setUpdateAvailable(true);
    setUpdateDismissed(false);
    if (!reloadApprovedRef.current) {
      return;
    }

    setUpdateFlow("flushing");
    setUpdateMessage("更新前の保存状態を再確認しています…");
    const preparation = await registry.prepare();
    refreshActiveStudyState();

    if (preparation.status === "blocked") {
      reloadApprovedRef.current = false;
      setUpdateFlow("blocked");
      setUpdateMessage(ACTIVE_UPDATE_MESSAGE);
      return;
    }

    if (preparation.status === "flush-failed") {
      reloadApprovedRef.current = false;
      setUpdateFlow("failed");
      setUpdateMessage(SAVE_FAILURE_MESSAGE);
      return;
    }

    reloadPendingRef.current = false;
    reloadPage();
  }, [refreshActiveStudyState, registry, reloadPage]);

  useEffect(() => {
    const handle = serviceWorkerRegistrar({
      onUpdateAvailable() {
        setUpdateAvailable(true);
        setUpdateDismissed(false);
        setUpdateFlow("idle");
        setUpdateMessage(undefined);
      },
      onOfflineReady() {
        setOfflineReady(true);
      },
      onReloadRequired() {
        void prepareControllerReload();
      },
      onError(error) {
        setRegistrationError(toErrorMessage(error));
      },
    });
    serviceWorkerHandleRef.current = handle;
    return () => {
      handle.dispose();
      if (serviceWorkerHandleRef.current === handle) {
        serviceWorkerHandleRef.current = undefined;
      }
    };
  }, [prepareControllerReload, serviceWorkerRegistrar]);

  const requestUpdate = useCallback(async (): Promise<UpdateRequestResult> => {
    if (!updateAvailable) {
      return { status: "no-update" };
    }

    setUpdateFlow("flushing");
    setUpdateMessage("学習内容を保存しています…");
    const preparation = await registry.prepare();
    refreshActiveStudyState();

    if (preparation.status === "blocked") {
      setUpdateFlow("blocked");
      setUpdateMessage(ACTIVE_UPDATE_MESSAGE);
      return {
        status: "blocked",
        activeParticipantIds: preparation.activeParticipantIds,
      };
    }

    if (preparation.status === "flush-failed") {
      setUpdateFlow("failed");
      setUpdateMessage(SAVE_FAILURE_MESSAGE);
      return {
        status: "flush-failed",
        failedParticipantIds: preparation.failedParticipantIds,
      };
    }

    reloadApprovedRef.current = true;
    setUpdateFlow("applying");
    setUpdateMessage("更新を適用しています…");
    if (reloadPendingRef.current) {
      reloadPendingRef.current = false;
      reloadPage();
      return { status: "applying" };
    }

    const handle = serviceWorkerHandleRef.current;
    if (!handle) {
      reloadApprovedRef.current = false;
      const error = new Error("Service Workerの更新準備ができていません。");
      setUpdateFlow("failed");
      setUpdateMessage(error.message);
      return { status: "apply-failed", error };
    }

    try {
      await handle.applyUpdate();
      return { status: "applying" };
    } catch (error) {
      reloadApprovedRef.current = false;
      setUpdateFlow("failed");
      setUpdateMessage(
        `更新を適用できませんでした。学習データは保持されています。${toErrorMessage(error)}`,
      );
      return { status: "apply-failed", error };
    }
  }, [refreshActiveStudyState, registry, reloadPage, updateAvailable]);

  const promptInstall = useCallback(async () => {
    const event = installPromptRef.current;
    if (!event) {
      return "unavailable" as const;
    }

    await event.prompt();
    const choice = await event.userChoice;
    installPromptRef.current = undefined;
    setInstallPromptAvailable(false);
    setLastInstallOutcome(choice.outcome);
    if (choice.outcome === "accepted") {
      setInstallEnvironment((current) => ({ ...current, installed: true }));
    }
    return choice.outcome;
  }, []);

  const installAvailability: PwaInstallAvailability =
    installEnvironment.installed || lastInstallOutcome === "accepted"
      ? "installed"
      : installPromptAvailable
        ? "prompt"
        : installEnvironment.ios
          ? "ios-help"
          : "unavailable";

  const value = useMemo<PwaContextValue>(
    () => ({
      online,
      offlineReady,
      updateAvailable,
      showUpdateNotice: updateAvailable && !updateDismissed,
      updateFlow,
      updateMessage,
      activeStudyCount: activeParticipantIds.length,
      registrationError,
      installAvailability,
      lastInstallOutcome,
      registerUpdateParticipant,
      refreshActiveStudyState,
      requestUpdate,
      dismissUpdateNotice: () => setUpdateDismissed(true),
      dismissOfflineReadyNotice: () => setOfflineReady(false),
      promptInstall,
    }),
    [
      activeParticipantIds.length,
      installAvailability,
      lastInstallOutcome,
      offlineReady,
      online,
      promptInstall,
      registerUpdateParticipant,
      registrationError,
      requestUpdate,
      refreshActiveStudyState,
      updateAvailable,
      updateDismissed,
      updateFlow,
      updateMessage,
    ],
  );

  return <PwaContext.Provider value={value}>{children}</PwaContext.Provider>;
}

export function usePwa() {
  const value = useContext(PwaContext);
  if (!value) {
    throw new Error("usePwaはPwaProviderの内側で使用してください。");
  }
  return value;
}

export interface UsePwaUpdateParticipantOptions {
  readonly id: string;
  readonly active: boolean;
  readonly flush: () => Promise<void>;
}

export function usePwaUpdateParticipant({
  id,
  active,
  flush,
}: UsePwaUpdateParticipantOptions) {
  const { registerUpdateParticipant, refreshActiveStudyState } = usePwa();
  const activeRef = useRef(active);
  const flushRef = useRef(flush);
  activeRef.current = active;
  flushRef.current = flush;

  useEffect(
    () =>
      registerUpdateParticipant({
        id,
        isActive: () => activeRef.current,
        flush: () => flushRef.current(),
      }),
    [id, registerUpdateParticipant],
  );

  useEffect(() => {
    refreshActiveStudyState();
  }, [active, refreshActiveStudyState]);
}
