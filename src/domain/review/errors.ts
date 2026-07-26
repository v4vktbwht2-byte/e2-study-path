export type ReviewDomainErrorCode =
  "INVALID_DATE" | "INVALID_NUMBER" | "INVALID_STATE" | "INVALID_TIME_ZONE";

export class ReviewDomainError extends Error {
  readonly code: ReviewDomainErrorCode;

  constructor(code: ReviewDomainErrorCode, message: string) {
    super(message);
    this.name = "ReviewDomainError";
    this.code = code;
  }
}
