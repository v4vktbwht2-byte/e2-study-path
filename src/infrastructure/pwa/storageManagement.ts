export interface StorageSnapshot {
  readonly estimateSupported: boolean;
  readonly persistenceSupported: boolean;
  readonly usage?: number;
  readonly quota?: number;
  readonly persisted?: boolean;
}

type StorageManagerPort = Pick<StorageManager, "estimate"> &
  Partial<Pick<StorageManager, "persist" | "persisted">>;

function getBrowserStorageManager() {
  return typeof navigator === "undefined" ? undefined : navigator.storage;
}

export async function inspectStorage(
  storage: StorageManagerPort | undefined = getBrowserStorageManager(),
): Promise<StorageSnapshot> {
  if (storage === undefined || typeof storage.estimate !== "function") {
    return {
      estimateSupported: false,
      persistenceSupported: false,
    };
  }

  const estimate = await storage.estimate();
  const persistenceSupported =
    typeof storage.persist === "function" && typeof storage.persisted === "function";
  const persisted = persistenceSupported ? await storage.persisted?.() : undefined;

  return {
    estimateSupported: true,
    persistenceSupported,
    ...(estimate.usage === undefined ? {} : { usage: estimate.usage }),
    ...(estimate.quota === undefined ? {} : { quota: estimate.quota }),
    ...(persisted === undefined ? {} : { persisted }),
  };
}

export async function requestPersistentStorage(
  storage: StorageManagerPort | undefined = getBrowserStorageManager(),
) {
  if (storage === undefined || typeof storage.persist !== "function") {
    return { supported: false, persisted: false } as const;
  }

  return {
    supported: true,
    persisted: await storage.persist(),
  } as const;
}

export function formatStorageBytes(bytes: number | undefined) {
  if (bytes === undefined || !Number.isFinite(bytes) || bytes < 0) {
    return "不明";
  }
  if (bytes < 1024) {
    return `${Math.round(bytes)} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
