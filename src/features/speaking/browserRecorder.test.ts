import { afterEach, describe, expect, it, vi } from "vitest";
import { BrowserSpeakingRecorder } from "./browserRecorder";

class FakeMediaRecorder {
  static lastInstance?: FakeMediaRecorder;

  state: RecordingState = "inactive";
  mimeType = "audio/webm";
  failOnStop = false;
  private readonly listeners = new Map<string, Array<(event: Event) => void>>();

  constructor(_stream: MediaStream) {
    void _stream;
    FakeMediaRecorder.lastInstance = this;
  }

  addEventListener(event: string, listener: EventListenerOrEventListenerObject) {
    const callback =
      typeof listener === "function"
        ? (emitted: Event) => listener(emitted)
        : (emitted: Event) => listener.handleEvent(emitted);
    this.listeners.set(event, [...(this.listeners.get(event) ?? []), callback]);
  }

  start() {
    this.state = "recording";
  }

  stop() {
    this.state = "inactive";
    this.emit(this.failOnStop ? "error" : "stop");
  }

  emitData(data: Blob) {
    this.emit("dataavailable", Object.assign(new Event("dataavailable"), { data }));
  }

  private emit(event: string, payload = new Event(event)) {
    for (const listener of this.listeners.get(event) ?? []) {
      listener(payload);
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
  FakeMediaRecorder.lastInstance = undefined;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: undefined,
  });
});

describe("BrowserSpeakingRecorder", () => {
  it("mediaDevicesまたはMediaRecorder非対応時は録音を開始しない", async () => {
    const recorder = new BrowserSpeakingRecorder();

    expect(recorder.isSupported()).toBe(false);
    await expect(recorder.start()).rejects.toThrow(
      "このブラウザーは録音に対応していません。",
    );

    const getUserMedia = vi.fn();
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia },
    });
    vi.stubGlobal("MediaRecorder", undefined);

    expect(recorder.isSupported()).toBe(false);
    await expect(recorder.start()).rejects.toThrow(
      "このブラウザーは録音に対応していません。",
    );
    expect(getUserMedia).not.toHaveBeenCalled();
  });

  it("録音開始前のstopを識別可能なエラーとして拒否する", async () => {
    const recorder = new BrowserSpeakingRecorder();
    await expect(recorder.stop()).rejects.toThrow("録音は開始されていません。");
  });

  it("MediaRecorder初期化失敗時は取得済みstreamを必ず停止する", async () => {
    const captured = fakeStream();
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: vi.fn(() => Promise.resolve(captured.stream)) },
    });
    vi.stubGlobal(
      "MediaRecorder",
      class {
        constructor() {
          throw new Error("codec unavailable");
        }
      },
    );
    const recorder = new BrowserSpeakingRecorder();

    await expect(recorder.start()).rejects.toThrow("録音を開始できませんでした。");
    expect(captured.stop).toHaveBeenCalledOnce();
    await expect(recorder.stop()).rejects.toThrow("録音は開始されていません。");
  });

  it("録音chunk・経過時間・MIME typeを停止時に確定してstreamを解放する", async () => {
    const captured = fakeStream();
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: vi.fn(() => Promise.resolve(captured.stream)) },
    });
    vi.stubGlobal("MediaRecorder", FakeMediaRecorder);
    const now = vi.spyOn(Date, "now").mockReturnValue(1_000);
    const recorder = new BrowserSpeakingRecorder();

    await recorder.start();
    FakeMediaRecorder.lastInstance?.emitData(
      new Blob([new Uint8Array([1, 2, 3])], { type: "audio/webm" }),
    );
    now.mockReturnValue(1_750);
    const result = await recorder.stop();

    expect(result).toMatchObject({
      durationMs: 750,
      mimeType: "audio/webm",
    });
    expect(result.blob.size).toBe(3);
    expect(captured.stop).toHaveBeenCalledOnce();
  });

  it("録音終了イベントの失敗時もstreamを解放し、空の録音を返さない", async () => {
    const captured = fakeStream();
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: vi.fn(() => Promise.resolve(captured.stream)) },
    });
    vi.stubGlobal("MediaRecorder", FakeMediaRecorder);
    const recorder = new BrowserSpeakingRecorder();

    await recorder.start();
    FakeMediaRecorder.lastInstance!.failOnStop = true;

    await expect(recorder.stop()).rejects.toThrow("録音を終了できませんでした。");
    expect(captured.stop).toHaveBeenCalledOnce();
    await expect(recorder.stop()).rejects.toThrow("録音は開始されていません。");
  });

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
