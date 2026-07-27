import { afterEach, describe, expect, it, vi } from "vitest";
import { BrowserSpeakingRecorder } from "./browserRecorder";

class FakeMediaRecorder {
  state: RecordingState = "inactive";
  mimeType = "audio/webm";
  private readonly listeners = new Map<string, Array<() => void>>();

  constructor(_stream: MediaStream) {
    void _stream;
  }

  addEventListener(event: string, listener: EventListenerOrEventListenerObject) {
    const callback =
      typeof listener === "function"
        ? () => listener(new Event(event))
        : () => listener.handleEvent(new Event(event));
    this.listeners.set(event, [...(this.listeners.get(event) ?? []), callback]);
  }

  start() {
    this.state = "recording";
  }

  stop() {
    this.state = "inactive";
    for (const listener of this.listeners.get("stop") ?? []) {
      listener();
    }
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });
  return { promise, resolve };
}

function fakeStream() {
  const stop = vi.fn();
  return {
    stream: {
      getTracks: () => [{ stop }],
    } as unknown as MediaStream,
    stop,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: undefined,
  });
});

describe("BrowserSpeakingRecorder", () => {
  it("権限待機中の二重startを1回のgetUserMediaへまとめる", async () => {
    const permission = deferred<MediaStream>();
    const getUserMedia = vi.fn(() => permission.promise);
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia },
    });
    vi.stubGlobal("MediaRecorder", FakeMediaRecorder);
    const recorder = new BrowserSpeakingRecorder();
    const first = recorder.start();
    const second = recorder.start();
    const captured = fakeStream();

    permission.resolve(captured.stream);
    await Promise.all([first, second]);

    expect(getUserMedia).toHaveBeenCalledOnce();
    recorder.dispose();
    expect(captured.stop).toHaveBeenCalledOnce();
  });

  it("権限待機中にdisposeされたら、後から得たstreamを停止する", async () => {
    const permission = deferred<MediaStream>();
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: vi.fn(() => permission.promise) },
    });
    vi.stubGlobal("MediaRecorder", FakeMediaRecorder);
    const recorder = new BrowserSpeakingRecorder();
    const starting = recorder.start();
    const captured = fakeStream();

    recorder.dispose();
    permission.resolve(captured.stream);

    await expect(starting).rejects.toThrow("取り消しました");
    expect(captured.stop).toHaveBeenCalledOnce();
  });
});
