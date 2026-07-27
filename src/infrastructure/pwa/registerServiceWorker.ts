export interface PwaServiceWorkerCallbacks {
  readonly onUpdateAvailable: () => void;
  readonly onOfflineReady: () => void;
  readonly onReloadRequired: () => void;
  readonly onRegistered?: (registration: ServiceWorkerRegistration) => void;
  readonly onError: (error: unknown) => void;
}

export interface PwaServiceWorkerHandle {
  readonly applyUpdate: () => Promise<void>;
  readonly dispose: () => void;
}

export type PwaServiceWorkerRegistrar = (
  callbacks: PwaServiceWorkerCallbacks,
) => PwaServiceWorkerHandle;

export const registerPwaServiceWorker: PwaServiceWorkerRegistrar = (callbacks) => {
  let active = true;
  let applyRegisteredUpdate: (() => Promise<void>) | undefined;

  const ifActive = (callback: () => void) => {
    if (active) {
      callback();
    }
  };
  const registration = import("virtual:pwa-register")
    .then(({ registerSW }) => {
      if (!active) {
        return;
      }
      applyRegisteredUpdate = registerSW({
        immediate: true,
        onNeedRefresh: () => ifActive(callbacks.onUpdateAvailable),
        onOfflineReady: () => ifActive(callbacks.onOfflineReady),
        onNeedReload: () => ifActive(callbacks.onReloadRequired),
        onRegisteredSW: (_scriptUrl, workerRegistration) => {
          if (active && workerRegistration) {
            callbacks.onRegistered?.(workerRegistration);
          }
        },
        onRegisterError: (error) => {
          if (active) {
            callbacks.onError(error);
          }
        },
      });
    })
    .catch((error: unknown) => {
      if (active) {
        callbacks.onError(error);
      }
    });

  return {
    async applyUpdate() {
      await registration;
      if (!applyRegisteredUpdate) {
        throw new Error("Service Workerの更新準備ができていません。");
      }
      await applyRegisteredUpdate();
    },
    dispose() {
      active = false;
    },
  };
};
