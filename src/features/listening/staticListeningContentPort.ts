import type { ListeningContentPort } from "./types";

export function createStaticListeningContentPort(
  sets: readonly unknown[],
): ListeningContentPort {
  return {
    listListeningSets: () => Promise.resolve(sets),
  };
}
