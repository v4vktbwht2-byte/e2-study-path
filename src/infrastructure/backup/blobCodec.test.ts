import { describe, expect, it } from "vitest";
import {
  deserializeSpeakingRecording,
  serializeSpeakingRecording,
  speakingRecordingsEqual,
} from "./blobCodec";

describe("speaking recording backup codec", () => {
  it("BlobをBase64へ変換してbytesとMIMEを往復する", async () => {
    const original = {
      id: "recording-1",
      promptId: "speaking-1",
      createdAt: "2026-07-27T00:00:00.000Z",
      durationMs: 1800,
      mimeType: "audio/webm",
      blob: new Blob([new Uint8Array([1, 2, 3, 254])], {
        type: "audio/webm",
      }),
      selfAssessment: { pronunciation: 3, checked: true },
    };
    const serialized = await serializeSpeakingRecording(original);
    expect(serialized).toMatchObject({
      sizeBytes: 4,
      dataBase64: "AQID/g==",
      mimeType: "audio/webm",
    });
    const restored = deserializeSpeakingRecording(serialized);
    expect(await speakingRecordingsEqual(original, restored)).toBe(true);
  });
});
