export type DuplicateBookingErrorCode =
  | "NOT_A_DUPLICATE_GROUP"
  | "ALREADY_SENT"
  | "CHECK_NOT_OPEN"
  | "APPOINTMENT_NOT_IN_CHECK"
  | "APPOINTMENT_NOT_ACTIVE"
  | "GROUP_DISSOLVED";

export class DuplicateBookingError extends Error {
  readonly code: DuplicateBookingErrorCode;

  constructor(code: DuplicateBookingErrorCode, message: string) {
    super(message);
    this.name = "DuplicateBookingError";
    this.code = code;
  }
}
