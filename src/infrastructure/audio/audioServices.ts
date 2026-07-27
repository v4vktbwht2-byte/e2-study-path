import {
  AudioPlaybackError,
  type AudioAvailability,
  type AudioPlaybackRequest,
  type AudioService,
} from "./types";

type AudioElementFactory = (source: string) => HTMLAudioElement;
type AssetUrlResolver = (source: string) => string;
type SpeechSynthesisLike = Pick<SpeechSynthesis, "cancel" | "speak">;
type UtteranceFactory = (text: string) => SpeechSynthesisUtterance;

function defaultCreateAudio(source: string): HTMLAudioElement {
  return new Audio(source);
}

export function resolveAppAssetUrl(
  source: string,
  baseUrl: string = import.meta.env.BASE_URL,
): string {
  if (!source.startsWith("/") || baseUrl === "/") {
    return source;
  }

  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return `${normalizedBase}${source.slice(1)}`;
}

function defaultSpeechSynthesis(): SpeechSynthesisLike | undefined {
  return typeof window === "undefined" ? undefined : window.speechSynthesis;
}

function defaultCreateUtterance(text: string): SpeechSynthesisUtterance {
  return new SpeechSynthesisUtterance(text);
}

function defaultIsOnline(): boolean {
  return typeof navigator === "undefined" || navigator.onLine;
}

export class AssetAudioService implements AudioService {
  private currentAudio?: HTMLAudioElement;

  constructor(
    private readonly createAudio: AudioElementFactory = defaultCreateAudio,
    private readonly resolveUrl: AssetUrlResolver = resolveAppAssetUrl,
    private readonly isOnline: () => boolean = defaultIsOnline,
  ) {}

  availability(request: AudioPlaybackRequest): AudioAvailability {
    return request.assetUrl
      ? {
          available: true,
          strategy: "asset",
          messageJa: "端末に保存された教材音声を再生します。",
        }
      : {
          available: false,
          strategy: "unsupported",
          messageJa: "この教材には音声ファイルがありません。",
        };
  }

  async play(request: AudioPlaybackRequest): Promise<void> {
    if (!request.assetUrl) {
      throw new AudioPlaybackError(
        "NO_AUDIO",
        "この教材には再生できる音声ファイルがありません。",
      );
    }

    this.stop();
    const audio = this.createAudio(this.resolveUrl(request.assetUrl));
    this.currentAudio = audio;
    audio.playbackRate = request.rate;

    await new Promise<void>((resolve, reject) => {
      const finish = () => {
        cleanup();
        if (this.currentAudio === audio) {
          this.currentAudio = undefined;
        }
        resolve();
      };
      const fail = () => {
        cleanup();
        if (this.currentAudio === audio) {
          this.currentAudio = undefined;
        }
        reject(
          new AudioPlaybackError(
            this.isOnline() ? "PLAYBACK_FAILED" : "OFFLINE",
            this.isOnline()
              ? "教材音声を再生できませんでした。下の英文で学習できます。"
              : "この音声はまだ端末に保存されていません。通信が戻った後に再取得してください。",
          ),
        );
      };
      const cleanup = () => {
        audio.removeEventListener("ended", finish);
        audio.removeEventListener("error", fail);
      };

      audio.addEventListener("ended", finish, { once: true });
      audio.addEventListener("error", fail, { once: true });
      try {
        const playResult = audio.play();
        void playResult?.catch(fail);
      } catch (error) {
        cleanup();
        reject(
          new AudioPlaybackError(
            "PLAYBACK_FAILED",
            "教材音声を再生できませんでした。",
            { cause: error },
          ),
        );
      }
    });
  }

  stop(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = undefined;
    }
  }
}

export class WebSpeechAudioService implements AudioService {
  private cancelPending?: () => void;

  constructor(
    private readonly synthesis:
      SpeechSynthesisLike | undefined = defaultSpeechSynthesis(),
    private readonly createUtterance: UtteranceFactory = defaultCreateUtterance,
    private readonly isOnline: () => boolean = defaultIsOnline,
  ) {}

  availability(_request: AudioPlaybackRequest): AudioAvailability {
    void _request;
    if (!this.isOnline()) {
      return {
        available: false,
        strategy: "unsupported",
        messageJa:
          "オフラインのため読み上げ音声を利用できません。スクリプト学習へ切り替えられます。",
      };
    }
    if (!this.synthesis) {
      return {
        available: false,
        strategy: "unsupported",
        messageJa:
          "このブラウザーは読み上げ音声に対応していません。スクリプト学習へ切り替えられます。",
      };
    }
    return {
      available: true,
      strategy: "webSpeech",
      messageJa:
        "端末のWeb Speechで読み上げます。声や発音の品質は環境により異なります。",
    };
  }

  async play(request: AudioPlaybackRequest): Promise<void> {
    const availability = this.availability(request);
    if (!availability.available || !this.synthesis) {
      throw new AudioPlaybackError(
        this.isOnline() ? "UNSUPPORTED" : "OFFLINE",
        availability.messageJa,
      );
    }

    const synthesis = this.synthesis;
    this.stop();
    await new Promise<void>((resolve, reject) => {
      let utterance: SpeechSynthesisUtterance;
      try {
        utterance = this.createUtterance(request.text);
      } catch (error) {
        reject(
          new AudioPlaybackError(
            "PLAYBACK_FAILED",
            "読み上げ音声の準備に失敗しました。",
            { cause: error },
          ),
        );
        return;
      }
      utterance.lang = request.language;
      utterance.rate = request.rate;
      let settled = false;
      const settle = (action: () => void) => {
        if (settled) {
          return;
        }
        settled = true;
        this.cancelPending = undefined;
        action();
      };
      this.cancelPending = () =>
        settle(() =>
          reject(
            new AudioPlaybackError("PLAYBACK_FAILED", "読み上げ音声を停止しました。"),
          ),
        );
      utterance.onend = () => settle(resolve);
      utterance.onerror = () =>
        settle(() =>
          reject(
            new AudioPlaybackError(
              "PLAYBACK_FAILED",
              "読み上げ音声を再生できませんでした。",
            ),
          ),
        );
      synthesis.speak(utterance);
    });
  }

  stop(): void {
    this.synthesis?.cancel();
    this.cancelPending?.();
    this.cancelPending = undefined;
  }
}

export class UnsupportedAudioService implements AudioService {
  constructor(
    private readonly messageJa = "この環境では音声を再生できません。スクリプト学習を利用してください。",
  ) {}

  availability(_request: AudioPlaybackRequest): AudioAvailability {
    void _request;
    return {
      available: false,
      strategy: "unsupported",
      messageJa: this.messageJa,
    };
  }

  play(_request: AudioPlaybackRequest): Promise<void> {
    void _request;
    return Promise.reject(new AudioPlaybackError("UNSUPPORTED", this.messageJa));
  }

  stop(): void {
    // 再生手段がないため停止処理は不要。
  }
}

/**
 * assetを優先し、assetが失敗した場合だけWeb Speechを試す。
 * どちらも使えない場合はUIがスクリプト自己練習へ切り替えられるエラーを返す。
 */
export class FallbackAudioService implements AudioService {
  constructor(
    private readonly asset: AudioService,
    private readonly webSpeech: AudioService,
    private readonly unsupported: AudioService,
  ) {}

  availability(request: AudioPlaybackRequest): AudioAvailability {
    const assetAvailability = this.asset.availability(request);
    if (assetAvailability.available) {
      return assetAvailability;
    }
    const speechAvailability = this.webSpeech.availability(request);
    return speechAvailability.available
      ? speechAvailability
      : this.unsupported.availability(request);
  }

  async play(request: AudioPlaybackRequest): Promise<void> {
    let assetFailure: unknown;
    if (this.asset.availability(request).available) {
      try {
        await this.asset.play(request);
        return;
      } catch (error: unknown) {
        assetFailure = error;
        // assetの読込失敗時だけ、同じscriptをWeb Speechで読み上げる。
      }
    }

    if (this.webSpeech.availability(request).available) {
      await this.webSpeech.play(request);
      return;
    }

    if (assetFailure !== undefined) {
      if (assetFailure instanceof Error) {
        throw assetFailure;
      }
      throw new AudioPlaybackError(
        "PLAYBACK_FAILED",
        "教材音声を再生できませんでした。下の英文で学習できます。",
        { cause: assetFailure },
      );
    }

    await this.unsupported.play(request);
  }

  stop(): void {
    this.asset.stop();
    this.webSpeech.stop();
    this.unsupported.stop();
  }
}

export function createBrowserAudioService(): AudioService {
  return new FallbackAudioService(
    new AssetAudioService(),
    new WebSpeechAudioService(),
    new UnsupportedAudioService(),
  );
}
