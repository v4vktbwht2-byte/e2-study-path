export type AudioStrategy = "asset" | "webSpeech" | "unsupported";

export interface AudioPlaybackRequest {
  text: string;
  language: string;
  rate: 0.75 | 1 | 1.25;
  assetUrl?: string;
}

export interface AudioAvailability {
  available: boolean;
  strategy: AudioStrategy;
  messageJa: string;
}

export interface AudioService {
  availability(request: AudioPlaybackRequest): AudioAvailability;
  play(request: AudioPlaybackRequest): Promise<void>;
  stop(): void;
}

export type AudioPlaybackErrorCode =
  "OFFLINE" | "UNSUPPORTED" | "NO_AUDIO" | "PLAYBACK_FAILED";

export class AudioPlaybackError extends Error {
  constructor(
    readonly code: AudioPlaybackErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "AudioPlaybackError";
  }
}
