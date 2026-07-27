import type { PracticeSet } from "../../infrastructure/content/schemas";

export type PracticeModule = "reading" | "listening" | "writing" | "speaking" | "mock";

export interface PracticeHubPort {
  loadSets(): Promise<readonly PracticeSet[]>;
}

export interface PracticeHubPageProps {
  port: PracticeHubPort;
  onOpen: (module: PracticeModule, setId?: string) => void;
}
