export const APP_CACHE_PREFIX = "e2-study-path-";
export const APP_CACHE_SCHEMA_VERSION = "v1";

export const PAGE_RUNTIME_CACHE = `${APP_CACHE_PREFIX}pages-${APP_CACHE_SCHEMA_VERSION}`;
export const CONTENT_RUNTIME_CACHE = `${APP_CACHE_PREFIX}content-${APP_CACHE_SCHEMA_VERSION}`;
export const OPTIONAL_AUDIO_RUNTIME_CACHE = `${APP_CACHE_PREFIX}optional-audio-${APP_CACHE_SCHEMA_VERSION}`;
export const IMAGE_RUNTIME_CACHE = `${APP_CACHE_PREFIX}images-${APP_CACHE_SCHEMA_VERSION}`;

export const CURRENT_RUNTIME_CACHE_NAMES = [
  PAGE_RUNTIME_CACHE,
  CONTENT_RUNTIME_CACHE,
  OPTIONAL_AUDIO_RUNTIME_CACHE,
  IMAGE_RUNTIME_CACHE,
] as const;

export function isApplicationCacheName(cacheName: string) {
  return cacheName.startsWith(APP_CACHE_PREFIX);
}
