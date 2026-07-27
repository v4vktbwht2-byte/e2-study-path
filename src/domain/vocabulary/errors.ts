export type VocabularyDomainErrorCode =
  "INVALID_DATE" | "INVALID_INPUT" | "INVALID_LEVEL" | "INVALID_STATE";

export class VocabularyDomainError extends Error {
  readonly code: VocabularyDomainErrorCode;

  constructor(code: VocabularyDomainErrorCode, message: string) {
    super(message);
    this.name = "VocabularyDomainError";
    this.code = code;
  }
}
