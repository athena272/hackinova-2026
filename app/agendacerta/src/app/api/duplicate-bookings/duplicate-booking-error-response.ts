import { NextResponse } from "next/server";
import { DuplicateBookingError } from "@/domain/duplicate-booking";
import {
  AppointmentNotFoundError,
  DuplicateCheckConflictError,
  DuplicateCheckNotFoundError,
} from "@/repository/errors";

/** Mesmo padrão das outras rotas: 404, 400 com código, 409 na corrida e 500. */
export function duplicateBookingErrorResponse(
  error: unknown,
  logTag: string,
  fallbackMessage: string,
): NextResponse {
  if (error instanceof AppointmentNotFoundError || error instanceof DuplicateCheckNotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  if (error instanceof DuplicateBookingError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
  }
  if (error instanceof DuplicateCheckConflictError) {
    return NextResponse.json(
      { error: error.message, code: "DUPLICATE_CHECK_CONFLICT" },
      { status: 409 },
    );
  }
  console.error(logTag, error);
  return NextResponse.json({ error: fallbackMessage }, { status: 500 });
}
