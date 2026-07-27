import { describe, expect, it, vi } from "vitest";
import {
  clearOptionalAudioCache,
  inspectApplicationCaches,
  recoverApplicationCaches,
} from "./cacheManagement";
import { OPTIONAL_AUDIO_RUNTIME_CACHE } from "./cacheNames";
import {
  getScopedRelativePath,
  isOptionalAudioRequest,
  isVersionedContentRequest,
} from "./cacheRoutes";
import { detectInstallEnvironment, isIosInstallEnvironment } from "./installPrompt";
import {
  formatStorageBytes,
  inspectStorage,
  requestPersistentStorage,
} from "./storageManagement";

describe("PWA runtime cache判定", () => {
  const scope = new URL("https://example.com/study/");

  it("base path内のversioned JSONだけを教材cache対象にする", () => {
    expect(
      isVersionedContentRequest(
        new URL(
          "https://example.com/study/content/pilot-core-ja-original/0.6.0/index.json",
        ),
        scope,
      ),
    ).toBe(true);
    expect(
      isVersionedContentRequest(
        new URL("https://example.com/content/pilot-core-ja-original/0.6.0/index.json"),
        scope,
      ),
    ).toBe(false);
    expect(
      isVersionedContentRequest(
        new URL(
          "https://example.com/study/content/pilot-core-ja-original/latest/index.json",
        ),
        scope,
      ),
    ).toBe(false);
  });

  it("同一scopeのoptional audioだけをon-demand cache対象にする", () => {
    expect(
      isOptionalAudioRequest(
        new URL("https://example.com/study/audio/original.ogg"),
        scope,
      ),
    ).toBe(true);
    expect(
      isOptionalAudioRequest(
        new URL("https://example.com/study/assets/audio/original.mp3"),
        scope,
      ),
    ).toBe(true);
    expect(
      isOptionalAudioRequest(
        new URL("https://cdn.example.com/study/audio/original.ogg"),
        scope,
      ),
    ).toBe(false);
    expect(
      getScopedRelativePath(new URL("https://example.com/study/image/card.svg"), scope),
    ).toBe("image/card.svg");
  });
});

describe("install環境判定", () => {
  it("iPhoneとtouch対応iPadOSをiOS手順対象にする", () => {
    expect(
      isIosInstallEnvironment({
        userAgent: "Mozilla/5.0 (iPhone) AppleWebKit Safari",
        platform: "iPhone",
      }),
    ).toBe(true);
    expect(
      isIosInstallEnvironment({
        userAgent: "Mozilla/5.0 (Macintosh) AppleWebKit Safari",
        platform: "MacIntel",
        maxTouchPoints: 5,
      }),
    ).toBe(true);
    expect(
      isIosInstallEnvironment({
        userAgent: "Mozilla/5.0 (Windows NT 10.0) Chrome",
        platform: "Win32",
      }),
    ).toBe(false);
  });

  it("display-modeまたはiOS standaloneをインストール済みと判定する", () => {
    expect(
      detectInstallEnvironment({ userAgent: "Chrome", platform: "Win32" }, true),
    ).toEqual({ installed: true, ios: false });
    expect(
      detectInstallEnvironment(
        {
          userAgent: "Mozilla/5.0 (iPhone) Safari",
          platform: "iPhone",
          standalone: true,
        },
        false,
      ),
    ).toEqual({ installed: true, ios: true });
  });
});

describe("Storage API", () => {
  it("estimateと永続化状態を取得し、ユーザー操作時だけpersistを要求する", async () => {
    const storage = {
      estimate: vi.fn(() => Promise.resolve({ usage: 1_500_000, quota: 5_000_000 })),
      persisted: vi.fn(() => Promise.resolve(false)),
      persist: vi.fn(() => Promise.resolve(true)),
    };

    await expect(inspectStorage(storage)).resolves.toEqual({
      estimateSupported: true,
      persistenceSupported: true,
      usage: 1_500_000,
      quota: 5_000_000,
      persisted: false,
    });
    expect(storage.persist).not.toHaveBeenCalled();
    await expect(requestPersistentStorage(storage)).resolves.toEqual({
      supported: true,
      persisted: true,
    });
  });

  it("非対応環境と容量表示を安全にfallbackする", async () => {
    await expect(inspectStorage(undefined)).resolves.toEqual({
      estimateSupported: false,
      persistenceSupported: false,
    });
    expect(formatStorageBytes(undefined)).toBe("不明");
    expect(formatStorageBytes(1536)).toBe("1.5 KB");
    expect(formatStorageBytes(2 * 1024 * 1024)).toBe("2.0 MB");
  });
});

describe("Cache Storage管理", () => {
  it("音声cacheだけを削除する", async () => {
    const deleteCache = vi.fn(() => Promise.resolve(true));
    const cacheStorage = {
      delete: deleteCache,
      keys: vi.fn(() => Promise.resolve([])),
    };

    await expect(clearOptionalAudioCache(cacheStorage)).resolves.toBe(true);
    expect(deleteCache).toHaveBeenCalledWith(OPTIONAL_AUDIO_RUNTIME_CACHE);
  });

  it("entry数とResponse clone/blobサイズをアプリcacheだけ集計する", async () => {
    const pageRequest = new Request("https://example.com/index.html");
    const audioRequest = new Request("https://example.com/audio/a.ogg");
    const caches = new Map([
      [
        "e2-study-path-pages-v1",
        {
          keys: vi.fn(() => Promise.resolve([pageRequest])),
          match: vi.fn(() => Promise.resolve(new Response("12345"))),
        },
      ],
      [
        OPTIONAL_AUDIO_RUNTIME_CACHE,
        {
          keys: vi.fn(() => Promise.resolve([audioRequest])),
          match: vi.fn(() => Promise.resolve(new Response("1234567890"))),
        },
      ],
    ]);
    const cacheStorage = {
      keys: vi.fn(() => Promise.resolve([...caches.keys(), "another-app-cache"])),
      delete: vi.fn(() => Promise.resolve(true)),
      open: vi.fn((name: string) => {
        const cache = caches.get(name);
        if (!cache) {
          return Promise.reject(new Error("unknown cache"));
        }
        return Promise.resolve(cache);
      }),
    };

    await expect(inspectApplicationCaches(cacheStorage)).resolves.toMatchObject({
      supported: true,
      entryCount: 2,
      estimatedBytes: 15,
      audioEntryCount: 1,
      audioEstimatedBytes: 10,
    });
    expect(cacheStorage.open).not.toHaveBeenCalledWith("another-app-cache");
  });

  it("online時に当アプリscopeのSWとcacheだけを解除する", async () => {
    const deleteCache = vi.fn(() => Promise.resolve(true));
    const unregisterApp = vi.fn(() => Promise.resolve(true));
    const unregisterOther = vi.fn(() => Promise.resolve(true));

    await expect(
      recoverApplicationCaches({
        online: true,
        scopeUrl: "https://example.com/study/",
        cacheStorage: {
          keys: vi.fn(() =>
            Promise.resolve(["e2-study-path-pages-v1", "another-app-cache"]),
          ),
          delete: deleteCache,
        },
        serviceWorker: {
          getRegistrations: vi.fn(() =>
            Promise.resolve([
              {
                scope: "https://example.com/study/",
                unregister: unregisterApp,
              },
              {
                scope: "https://example.com/other/",
                unregister: unregisterOther,
              },
            ]),
          ),
        },
      }),
    ).resolves.toEqual({
      deletedCacheNames: ["e2-study-path-pages-v1"],
      unregisteredWorkerCount: 1,
    });
    expect(deleteCache).toHaveBeenCalledWith("e2-study-path-pages-v1");
    expect(deleteCache).not.toHaveBeenCalledWith("another-app-cache");
    expect(unregisterApp).toHaveBeenCalledTimes(1);
    expect(unregisterOther).not.toHaveBeenCalled();
  });

  it("offlineでapp cacheを消さない", async () => {
    const deleteCache = vi.fn(() => Promise.resolve(true));
    await expect(
      recoverApplicationCaches({
        online: false,
        cacheStorage: {
          keys: vi.fn(() => Promise.resolve(["e2-study-path-pages-v1"])),
          delete: deleteCache,
        },
      }),
    ).rejects.toMatchObject({ code: "OFFLINE_RECOVERY" });
    expect(deleteCache).not.toHaveBeenCalled();
  });
});
