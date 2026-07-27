import { OPTIONAL_AUDIO_RUNTIME_CACHE, isApplicationCacheName } from "./cacheNames";

type CacheStoragePort = Pick<CacheStorage, "delete" | "keys">;
type CacheInspectionPort = Pick<Cache, "keys" | "match">;
type InspectableCacheStoragePort = CacheStoragePort & {
  open(cacheName: string): Promise<CacheInspectionPort>;
};
type ServiceWorkerRegistrationPort = Pick<
  ServiceWorkerRegistration,
  "scope" | "unregister"
>;
type ServiceWorkerContainerPort = {
  getRegistrations(): Promise<readonly ServiceWorkerRegistrationPort[]>;
};

export class CacheManagementError extends Error {
  constructor(
    readonly code: "CACHE_UNSUPPORTED" | "OFFLINE_RECOVERY",
    message: string,
  ) {
    super(message);
    this.name = "CacheManagementError";
  }
}

function getBrowserCacheStorage() {
  return typeof globalThis.caches === "undefined" ? undefined : globalThis.caches;
}

function getBrowserServiceWorkerContainer() {
  return typeof navigator === "undefined" || !("serviceWorker" in navigator)
    ? undefined
    : navigator.serviceWorker;
}

export async function clearOptionalAudioCache(
  cacheStorage: CacheStoragePort | undefined = getBrowserCacheStorage(),
) {
  if (cacheStorage === undefined) {
    throw new CacheManagementError(
      "CACHE_UNSUPPORTED",
      "このブラウザーでは音声キャッシュを管理できません。",
    );
  }

  return cacheStorage.delete(OPTIONAL_AUDIO_RUNTIME_CACHE);
}

export interface ApplicationCacheDetail {
  readonly cacheName: string;
  readonly entryCount: number;
  readonly estimatedBytes: number;
}

export interface CacheStorageSummary {
  readonly supported: boolean;
  readonly entryCount: number;
  readonly estimatedBytes: number;
  readonly audioEntryCount: number;
  readonly audioEstimatedBytes: number;
  readonly caches: readonly ApplicationCacheDetail[];
}

async function estimateResponseBytes(response: Response | undefined) {
  if (!response) {
    return 0;
  }
  try {
    return (await response.clone().blob()).size;
  } catch {
    return 0;
  }
}

export async function inspectApplicationCaches(
  cacheStorage: InspectableCacheStoragePort | undefined = getBrowserCacheStorage(),
): Promise<CacheStorageSummary> {
  if (cacheStorage === undefined) {
    return {
      supported: false,
      entryCount: 0,
      estimatedBytes: 0,
      audioEntryCount: 0,
      audioEstimatedBytes: 0,
      caches: [],
    };
  }

  const cacheNames = (await cacheStorage.keys()).filter(isApplicationCacheName);
  const details = await Promise.all(
    cacheNames.map(async (cacheName): Promise<ApplicationCacheDetail> => {
      const cache = await cacheStorage.open(cacheName);
      const requests = await cache.keys();
      const responses = await Promise.all(
        requests.map((request) => cache.match(request)),
      );
      const byteCounts = await Promise.all(responses.map(estimateResponseBytes));
      return {
        cacheName,
        entryCount: requests.length,
        estimatedBytes: byteCounts.reduce((total, bytes) => total + bytes, 0),
      };
    }),
  );
  const audio = details.find(
    (detail) => detail.cacheName === OPTIONAL_AUDIO_RUNTIME_CACHE,
  );

  return {
    supported: true,
    entryCount: details.reduce((total, detail) => total + detail.entryCount, 0),
    estimatedBytes: details.reduce((total, detail) => total + detail.estimatedBytes, 0),
    audioEntryCount: audio?.entryCount ?? 0,
    audioEstimatedBytes: audio?.estimatedBytes ?? 0,
    caches: details,
  };
}

export interface RecoverApplicationCachesOptions {
  readonly cacheStorage?: CacheStoragePort;
  readonly serviceWorker?: ServiceWorkerContainerPort;
  readonly online?: boolean;
  readonly scopeUrl?: string;
}

export interface CacheRecoveryResult {
  readonly deletedCacheNames: readonly string[];
  readonly unregisteredWorkerCount: number;
}

/**
 * IndexedDBへ触れず、当アプリのSWとCache Storageだけを初期化する。
 * 呼出し後にonlineのままreloadすると、新しいSWがapp shellを再構築する。
 */
export async function recoverApplicationCaches({
  cacheStorage = getBrowserCacheStorage(),
  serviceWorker = getBrowserServiceWorkerContainer(),
  online = typeof navigator === "undefined" ? true : navigator.onLine,
  scopeUrl = typeof location === "undefined"
    ? import.meta.env.BASE_URL
    : new URL(import.meta.env.BASE_URL, location.origin).href,
}: RecoverApplicationCachesOptions = {}): Promise<CacheRecoveryResult> {
  if (!online) {
    throw new CacheManagementError(
      "OFFLINE_RECOVERY",
      "アプリキャッシュの再構築は、通信が戻ってから実行してください。",
    );
  }

  const registrations = serviceWorker
    ? await serviceWorker.getRegistrations()
    : ([] as const);
  const appRegistrations = registrations.filter(
    (registration) => registration.scope === scopeUrl,
  );
  const unregisterResults = await Promise.all(
    appRegistrations.map((registration) => registration.unregister()),
  );

  if (cacheStorage === undefined) {
    return {
      deletedCacheNames: [],
      unregisteredWorkerCount: unregisterResults.filter(Boolean).length,
    };
  }

  const cacheNames = await cacheStorage.keys();
  const appCacheNames = cacheNames.filter(isApplicationCacheName);
  const deleteResults = await Promise.all(
    appCacheNames.map((cacheName) => cacheStorage.delete(cacheName)),
  );

  return {
    deletedCacheNames: appCacheNames.filter((_, index) => deleteResults[index]),
    unregisteredWorkerCount: unregisterResults.filter(Boolean).length,
  };
}
