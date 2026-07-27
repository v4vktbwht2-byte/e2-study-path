import {
  MAX_BACKUP_FILE_BYTES,
  assertCompatibleBackupVersion,
  parseBackupEnvelope,
  type BackupEnvelope,
} from "../../domain/backup";
import { BackupError } from "../../domain/backup";

export interface BackupFileLike {
  readonly size: number;
  text(): Promise<string>;
}

function assertFileSize(size: number): void {
  if (!Number.isSafeInteger(size) || size < 0 || size > MAX_BACKUP_FILE_BYTES) {
    throw new BackupError(
      "FILE_TOO_LARGE",
      "バックアップファイルは20 MiB以下にしてください。",
    );
  }
}

export function parseBackupText(text: string): BackupEnvelope {
  assertFileSize(new TextEncoder().encode(text).byteLength);
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (error) {
    throw new BackupError("INVALID_JSON", "バックアップJSONを読み取れませんでした。", {
      cause: error,
    });
  }
  const envelope = parseBackupEnvelope(value);
  assertCompatibleBackupVersion(envelope);
  return envelope;
}

export async function parseBackupFile(file: BackupFileLike): Promise<BackupEnvelope> {
  assertFileSize(file.size);
  return parseBackupText(await file.text());
}
