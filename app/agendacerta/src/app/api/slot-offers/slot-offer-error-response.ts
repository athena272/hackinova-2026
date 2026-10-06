import { NextResponse } from "next/server";
import { OfferSlotError } from "@/domain/offer-slot";
import { SlotOfferError } from "@/domain/slot-offer";
import {
  AppointmentNotFoundError,
  SlotOfferConflictError,
  SlotOfferNotFoundError,
  WaitlistNotFoundError,
} from "@/repository/errors";

/** Mesmo padrão das outras rotas: 404, 400 com código, 409 na corrida pelo índice único e 500. */
export function slotOfferErrorResponse(
  error: unknown,
  logTag: string,
  fallbackMessage: string,
): NextResponse {
  if (
    error instanceof AppointmentNotFoundError ||
    error instanceof WaitlistNotFoundError ||
    error instanceof SlotOfferNotFoundError
  ) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  if (error instanceof SlotOfferError || error instanceof OfferSlotError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
  }
  if (error instanceof SlotOfferConflictError) {
    return NextResponse.json(
      { error: error.message, code: "OFFER_CONFLICT" },
      { status: 409 },
    );
  }
  console.error(logTag, error);
  return NextResponse.json({ error: fallbackMessage }, { status: 500 });
}

/** Lê o corpo JSON; devolve a resposta 400 pronta quando ele é inválido. */
export async function readJsonBody(
  request: Request,
): Promise<{ ok: true; body: unknown } | { ok: false; response: NextResponse }> {
  try {
    return { ok: true, body: await request.json() };
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "JSON inválido no corpo da requisição." },
        { status: 400 },
      ),
    };
  }
}

export function fieldOf(body: unknown, field: string): unknown {
  return typeof body === "object" && body !== null
    ? (body as Record<string, unknown>)[field]
    : undefined;
}
