const VERSIONED_CONTENT_PATH =
  /^content\/[a-z0-9][a-z0-9._-]*\/\d+\.\d+\.\d+\/[^?#]+\.json$/iu;
const OPTIONAL_AUDIO_PATH =
  /^(?:audio|assets\/audio)\/[^?#]+\.(?:aac|m4a|mp3|oga|ogg|wav|webm)$/iu;

function ensureTrailingSlash(pathname: string) {
  return pathname.endsWith("/") ? pathname : `${pathname}/`;
}

export function getScopedRelativePath(url: URL, scopeUrl: URL) {
  if (url.origin !== scopeUrl.origin) {
    return undefined;
  }

  const scopePath = ensureTrailingSlash(scopeUrl.pathname);
  if (!url.pathname.startsWith(scopePath)) {
    return undefined;
  }

  return url.pathname.slice(scopePath.length);
}

export function isVersionedContentRequest(url: URL, scopeUrl: URL) {
  const relativePath = getScopedRelativePath(url, scopeUrl);
  return relativePath !== undefined && VERSIONED_CONTENT_PATH.test(relativePath);
}

export function isOptionalAudioRequest(url: URL, scopeUrl: URL) {
  const relativePath = getScopedRelativePath(url, scopeUrl);
  return relativePath !== undefined && OPTIONAL_AUDIO_PATH.test(relativePath);
}

export function isScopedRequest(url: URL, scopeUrl: URL) {
  return getScopedRelativePath(url, scopeUrl) !== undefined;
}
