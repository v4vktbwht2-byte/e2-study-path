/// <reference lib="webworker" />

import { CacheableResponsePlugin } from "workbox-cacheable-response";
import { cacheNames, clientsClaim, setCacheNameDetails } from "workbox-core";
import { ExpirationPlugin } from "workbox-expiration";
import {
  cleanupOutdatedCaches,
  matchPrecache,
  precacheAndRoute,
  type PrecacheEntry,
} from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from "workbox-strategies";
import {
  APP_CACHE_PREFIX,
  APP_CACHE_SCHEMA_VERSION,
  CONTENT_RUNTIME_CACHE,
  CURRENT_RUNTIME_CACHE_NAMES,
  IMAGE_RUNTIME_CACHE,
  OPTIONAL_AUDIO_RUNTIME_CACHE,
  PAGE_RUNTIME_CACHE,
} from "./cacheNames";
import {
  isOptionalAudioRequest,
  isScopedRequest,
  isVersionedContentRequest,
} from "./cacheRoutes";

type E2ServiceWorkerScope = ServiceWorkerGlobalScope & {
  readonly __WB_MANIFEST: readonly (PrecacheEntry | string)[];
};

declare const self: E2ServiceWorkerScope;

const serviceWorker = self;
const scopeUrl = new URL(serviceWorker.registration.scope);

setCacheNameDetails({
  prefix: APP_CACHE_PREFIX.slice(0, -1),
  suffix: APP_CACHE_SCHEMA_VERSION,
});

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);
clientsClaim();

const successfulResponses = new CacheableResponsePlugin({ statuses: [0, 200] });

const navigationStrategy = new NetworkFirst({
  cacheName: PAGE_RUNTIME_CACHE,
  networkTimeoutSeconds: 4,
  plugins: [successfulResponses],
});

registerRoute(
  ({ request, url }) => request.mode === "navigate" && isScopedRequest(url, scopeUrl),
  async (options) => {
    try {
      return await navigationStrategy.handle(options);
    } catch {
      const appShell = await matchPrecache(
        new URL("index.html", serviceWorker.registration.scope).href,
      );
      if (appShell) {
        return appShell;
      }

      const offlinePage = await matchPrecache(
        new URL("offline.html", serviceWorker.registration.scope).href,
      );
      return (
        offlinePage ??
        new Response("現在オフラインです。通信が戻ってから再読み込みしてください。", {
          status: 503,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        })
      );
    }
  },
);

registerRoute(
  ({ request, url }) =>
    request.method === "GET" && isVersionedContentRequest(url, scopeUrl),
  new CacheFirst({
    cacheName: CONTENT_RUNTIME_CACHE,
    plugins: [
      successfulResponses,
      new ExpirationPlugin({
        maxEntries: 24,
        maxAgeSeconds: 90 * 24 * 60 * 60,
        purgeOnQuotaError: true,
      }),
    ],
  }),
);

registerRoute(
  ({ request, url }) =>
    request.method === "GET" && isOptionalAudioRequest(url, scopeUrl),
  new CacheFirst({
    cacheName: OPTIONAL_AUDIO_RUNTIME_CACHE,
    plugins: [
      successfulResponses,
      new ExpirationPlugin({
        maxEntries: 80,
        maxAgeSeconds: 30 * 24 * 60 * 60,
        purgeOnQuotaError: true,
      }),
    ],
  }),
);

registerRoute(
  ({ request, url }) =>
    request.method === "GET" &&
    request.destination === "image" &&
    isScopedRequest(url, scopeUrl),
  new StaleWhileRevalidate({
    cacheName: IMAGE_RUNTIME_CACHE,
    plugins: [
      successfulResponses,
      new ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 30 * 24 * 60 * 60,
        purgeOnQuotaError: true,
      }),
    ],
  }),
);

serviceWorker.addEventListener("message", (event) => {
  const data = event.data as unknown;
  if (
    typeof data === "object" &&
    data !== null &&
    "type" in data &&
    data.type === "SKIP_WAITING"
  ) {
    void serviceWorker.skipWaiting();
  }
});

serviceWorker.addEventListener("activate", (event) => {
  const allowedCacheNames = new Set<string>([
    cacheNames.precache,
    ...CURRENT_RUNTIME_CACHE_NAMES,
  ]);
  event.waitUntil(
    caches.keys().then(async (names) => {
      await Promise.all(
        names
          .filter(
            (name) => name.startsWith(APP_CACHE_PREFIX) && !allowedCacheNames.has(name),
          )
          .map((name) => caches.delete(name)),
      );
    }),
  );
});
