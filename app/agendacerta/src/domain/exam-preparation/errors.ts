export type PreparationErrorCode =
  | "NO_PREPARATION_REQUIRED"
  | "SLOT_NOT_ACTIVE"
  | "ALREADY_ANSWERED"
  | "INVALID_ANSWERS"
  | "PREPARATION_NOT_MISSED";

export class PreparationError extends Error {
  readonly code: PreparationErrorCode;

  constructor(code: PreparationErrorCode, message: string) {
    super(message);
    this.name = "PreparationError";
    this.code = code;
  }
}
