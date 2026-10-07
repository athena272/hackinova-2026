export type OverbookingErrorCode =
  | "NOT_HIGH_RISK"
  | "LIMIT_REACHED"
  | "ALREADY_REFUSED"
  | "NO_CANDIDATES"
  | "ANCHOR_NOT_ACTIVE"
  | "ANCHOR_IS_ENCAIXE";

export class OverbookingError extends Error {
  readonly code: OverbookingErrorCode;

  constructor(code: OverbookingErrorCode, message: string) {
    super(message);
    this.name = "OverbookingError";
    this.code = code;
  }
}
