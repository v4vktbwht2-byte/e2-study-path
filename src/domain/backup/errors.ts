export type BackupErrorCode =
  | "FILE_TOO_LARGE"
  | "EXPORT_TOO_LARGE"
  | "INVALID_JSON"
  | "INVALID_SCHEMA"
  | "INCOMPATIBLE_VERSION"
  | "INVALID_REFERENCE"
  | "ATTEMPT_CONFLICT"
  | "RECORDING_CONFLICT";

export class BackupError extends Error {
  constructor(
    readonly code: BackupErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "BackupError";
  }
}
