export type SlotOfferErrorCode =
  | "SLOT_NOT_REUSABLE"
  | "CASCADE_ALREADY_ACTIVE"
  | "NO_CANDIDATES"
  | "INVALID_TIMEOUT"
  | "OFFER_NOT_PENDING"
  | "OFFER_EXPIRED";

export class SlotOfferError extends Error {
  readonly code: SlotOfferErrorCode;

  constructor(code: SlotOfferErrorCode, message: string) {
    super(message);
    this.name = "SlotOfferError";
    this.code = code;
  }
}
