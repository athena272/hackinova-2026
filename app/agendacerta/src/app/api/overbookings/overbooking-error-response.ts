import { NextResponse } from "next/server";
import { OverbookingError } from "@/domain/overbooking";
import {
  AppointmentNotFoundError,
  OverbookingConflictError,
  WaitlistNotFoundError,
} from "@/repository/errors";

/** Mesmo padrão das outras rotas: 404, 400 com código, 409 na corrida pelo índice único e 500. */
export function overbookingErrorResponse(
  error: unknown,
  logTag: string,
  fallbackMessage: string,
): NextResponse {
  if (error instanceof AppointmentNotFoundError || error instanceof WaitlistNotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  if (error instanceof OverbookingError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
  }
  if (error instanceof OverbookingConflictError) {
    return NextResponse.json(
      { error: error.message, code: "OVERBOOKING_CONFLICT" },
      { status: 409 },
    );
  }
  console.error(logTag, error);
  return NextResponse.json({ error: fallbackMessage }, { status: 500 });
}
