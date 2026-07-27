import { describe, expect, it, vi } from "vitest";
import {
  AssetAudioService,
  FallbackAudioService,
  UnsupportedAudioService,
  WebSpeechAudioService,
} from "./audioServices";
import type { AudioPlaybackRequest, AudioService } from "./types";

const request: AudioPlaybackRequest = {
  text: "Please listen.",
  language: "en-US",
  rate: 1,
};

describe("AudioService", () => {
  it("asset音声へ速度を設定し、終了まで待つ", async () => {
    const listeners = new Map<string, () => void>();
    const audio = {
      playbackRate: 1,
      currentTime: 0,
      pause: vi.fn(),
      addEventListener: vi.fn((event: string, listener: () => void) => {
        listeners.set(event, listener);
      }),
      removeEventListener: vi.fn((event: string) => {
        listeners.delete(event);
      }),
      play: vi.fn(() => {
        listeners.get("ended")?.();
        return Promise.resolve();
      }),
    } as unknown as HTMLAudioElement;
    const service = new AssetAudioService(() => audio);

    await expect(
      service.play({ ...request, rate: 1.25, assetUrl: "/audio/original.ogg" }),
    ).resolves.toBeUndefined();
    expect(audio.playbackRate).toBe(1.25);
  });

  it("Web Speechへ言語と速度を渡す", async () => {
    const utterance = {
      lang: "",
      rate: 1,
      onend: null,
      onerror: null,
    } as unknown as SpeechSynthesisUtterance;
    const synthesis = {
      cancel: vi.fn(),
      speak: vi.fn((value: SpeechSynthesisUtterance) => {
        value.onend?.(new Event("end") as SpeechSynthesisEvent);
      }),
    };
    const service = new WebSpeechAudioService(
      synthesis,
      () => utterance,
      () => true,
    );

    await service.play({ ...request, rate: 0.75 });
    expect(utterance.lang).toBe("en-US");
    expect(utterance.rate).toBe(0.75);
    expect(synthesis.speak).toHaveBeenCalledWith(utterance);
  });

  it("Web Speech停止時に待機中の再生Promiseも終了する", async () => {
    const utterance = {
      lang: "",
      rate: 1,
      onend: null,
      onerror: null,
    } as unknown as SpeechSynthesisUtterance;
    const synthesis = {
      cancel: vi.fn(),
      speak: vi.fn(),
    };
    const service = new WebSpeechAudioService(
      synthesis,
      () => utterance,
      () => true,
    );

    const playback = service.play(request);
    await Promise.resolve();
    service.stop();

    await expect(playback).rejects.toMatchObject({
      code: "PLAYBACK_FAILED",
      message: "読み上げ音声を停止しました。",
    });
  });

  it("オフラインまたは非対応を明示して再生を拒否する", async () => {
    const offline = new WebSpeechAudioService(undefined, undefined, () => false);
    expect(offline.availability(request)).toEqual(
      expect.objectContaining({ available: false, strategy: "unsupported" }),
    );
    await expect(offline.play(request)).rejects.toMatchObject({ code: "OFFLINE" });

    const unsupported = new UnsupportedAudioService("音声なし");
    await expect(unsupported.play(request)).rejects.toMatchObject({
      code: "UNSUPPORTED",
      message: "音声なし",
    });
  });

  it("asset失敗時にWeb Speechへフォールバックする", async () => {
    const assetPlay = vi.fn(() => Promise.reject(new Error("asset error")));
    const speechPlay = vi.fn(() => Promise.resolve());
    const serviceFor = (
      available: boolean,
      play: (value: AudioPlaybackRequest) => Promise<void>,
    ): AudioService => ({
      availability: () => ({
        available,
        strategy: available ? "asset" : "unsupported",
        messageJa: "",
      }),
      play,
      stop: vi.fn(),
    });
    const fallback = new FallbackAudioService(
      serviceFor(true, assetPlay),
      {
        ...serviceFor(true, speechPlay),
        availability: () => ({
          available: true,
          strategy: "webSpeech",
          messageJa: "",
        }),
      },
      serviceFor(
        false,
        vi.fn(() => Promise.reject(new Error("unsupported"))),
      ),
    );

    await fallback.play({ ...request, assetUrl: "/missing.ogg" });
    expect(assetPlay).toHaveBeenCalledOnce();
    expect(speechPlay).toHaveBeenCalledOnce();
  });
});
