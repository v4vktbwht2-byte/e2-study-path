import {
  MAX_SPEAKING_RECORDING_BYTES,
  recordsEqual,
  type SerializedSpeakingRecording,
} from "../../domain/backup";
import type { SpeakingRecording } from "../../domain/models";
import { BackupError } from "../../domain/backup";

const BYTE_CHUNK_SIZE = 0x8000;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += BYTE_CHUNK_SIZE) {
    const chunk = bytes.subarray(offset, offset + BYTE_CHUNK_SIZE);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  let binary: string;
  try {
    binary = atob(value);
  } catch (error) {
    throw new BackupError("INVALID_SCHEMA", "録音のBase64を復号できません。", {
      cause: error,
    });
  }
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export async function serializeSpeakingRecording(
  recording: SpeakingRecording,
): Promise<SerializedSpeakingRecording> {
  if (recording.blob.size > MAX_SPEAKING_RECORDING_BYTES) {
    throw new BackupError(
      "EXPORT_TOO_LARGE",
      `録音「${recording.id}」が1件10 MiBの上限を超えています。`,
    );
  }
  const bytes = new Uint8Array(await recording.blob.arrayBuffer());
  return {
    id: recording.id,
    promptId: recording.promptId,
    createdAt: recording.createdAt,
    durationMs: recording.durationMs,
    mimeType: recording.mimeType,
    sizeBytes: bytes.byteLength,
    dataBase64: bytesToBase64(bytes),
    selfAssessment: { ...recording.selfAssessment },
  };
}

export function deserializeSpeakingRecording(
  recording: SerializedSpeakingRecording,
): SpeakingRecording {
  const bytes = base64ToBytes(recording.dataBase64);
  if (
    bytes.byteLength !== recording.sizeBytes ||
    bytes.byteLength > MAX_SPEAKING_RECORDING_BYTES
  ) {
    throw new BackupError(
      "INVALID_SCHEMA",
      `録音「${recording.id}」のサイズが正しくありません。`,
    );
  }
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return {
    id: recording.id,
    promptId: recording.promptId,
    createdAt: recording.createdAt,
    durationMs: recording.durationMs,
    mimeType: recording.mimeType,
    blob: new Blob([buffer], { type: recording.mimeType }),
    selfAssessment: { ...recording.selfAssessment },
  };
}

export async function speakingRecordingsEqual(
  current: SpeakingRecording,
  incoming: SpeakingRecording,
): Promise<boolean> {
  if (
    current.id !== incoming.id ||
    current.promptId !== incoming.promptId ||
    current.createdAt !== incoming.createdAt ||
    current.durationMs !== incoming.durationMs ||
    current.mimeType !== incoming.mimeType ||
    current.blob.size !== incoming.blob.size ||
    !recordsEqual(current.selfAssessment, incoming.selfAssessment)
  ) {
    return false;
  }
  const [currentBytes, incomingBytes] = await Promise.all([
    current.blob.arrayBuffer(),
    incoming.blob.arrayBuffer(),
  ]);
  const left = new Uint8Array(currentBytes);
  const right = new Uint8Array(incomingBytes);
  return left.every((value, index) => value === right[index]);
}
