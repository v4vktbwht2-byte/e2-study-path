import type { CapturedSpeakingRecording, SpeakingRecorder } from "./types";

export class BrowserSpeakingRecorder implements SpeakingRecorder {
  private stream?: MediaStream;
  private mediaRecorder?: MediaRecorder;
  private chunks: Blob[] = [];
  private startedAt = 0;
  private requestGeneration = 0;
  private startPromise?: Promise<void>;

  isSupported(): boolean {
    return (
      typeof navigator !== "undefined" &&
      navigator.mediaDevices?.getUserMedia !== undefined &&
      typeof MediaRecorder !== "undefined"
    );
  }

  async start(): Promise<void> {
    if (!this.isSupported()) {
      throw new Error("このブラウザーは録音に対応していません。");
    }
    if (this.mediaRecorder?.state === "recording") {
      return;
    }
    if (this.startPromise !== undefined) {
      return this.startPromise;
    }
    const operation = this.beginStart();
    this.startPromise = operation;
    try {
      await operation;
    } finally {
      if (this.startPromise === operation) {
        this.startPromise = undefined;
      }
    }
  }

  private async beginStart(): Promise<void> {
    this.dispose();
    const requestGeneration = ++this.requestGeneration;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    if (requestGeneration !== this.requestGeneration) {
      stream.getTracks().forEach((track) => track.stop());
      throw new Error("録音開始を取り消しました。");
    }
    try {
      this.stream = stream;
      this.chunks = [];
      this.mediaRecorder = new MediaRecorder(stream);
      this.mediaRecorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) {
          this.chunks.push(event.data);
        }
      });
      this.startedAt = Date.now();
      this.mediaRecorder.start();
    } catch (error: unknown) {
      stream.getTracks().forEach((track) => track.stop());
      this.stream = undefined;
      this.mediaRecorder = undefined;
      this.chunks = [];
      throw new Error("録音を開始できませんでした。", { cause: error });
    }
  }

  stop(): Promise<CapturedSpeakingRecording> {
    const recorder = this.mediaRecorder;
    if (recorder === undefined || recorder.state !== "recording") {
      return Promise.reject(new Error("録音は開始されていません。"));
    }
    return new Promise((resolve, reject) => {
      const onStop = () => {
        const mimeType = recorder.mimeType || "audio/webm";
        const captured = {
          blob: new Blob(this.chunks, { type: mimeType }),
          durationMs: Math.max(0, Date.now() - this.startedAt),
          mimeType,
        };
        this.stopTracks();
        this.mediaRecorder = undefined;
        resolve(captured);
      };
      recorder.addEventListener("stop", onStop, { once: true });
      recorder.addEventListener(
        "error",
        () => {
          this.stopTracks();
          this.mediaRecorder = undefined;
          this.chunks = [];
          reject(new Error("録音を終了できませんでした。"));
        },
        { once: true },
      );
      recorder.stop();
    });
  }

  dispose(): void {
    this.requestGeneration += 1;
    if (this.mediaRecorder?.state === "recording") {
      this.mediaRecorder.stop();
    }
    this.stopTracks();
    this.mediaRecorder = undefined;
    this.chunks = [];
  }

  private stopTracks() {
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = undefined;
  }
}
