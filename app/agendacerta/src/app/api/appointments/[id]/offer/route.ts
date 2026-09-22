import { NextResponse } from "next/server";
import { offerWaitlistSlot } from "@/application/offer-waitlist-slot";
import { OfferSlotError } from "@/domain/offer-slot";
import { createAppointmentRepository } from "@/repository/create-appointment-repository";
import {
  AppointmentNotFoundError,
  WaitlistNotFoundError,
} from "@/repository/errors";
import { createWaitlistRepository } from "@/repository/create-waitlist-repository";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "JSON inválido no corpo da requisição." },
      { status: 400 },
    );
  }

  const waitlistId =
    typeof body === "object" &&
    body !== null &&
    "waitlistId" in body &&
    typeof (body as { waitlistId: unknown }).waitlistId === "string"
      ? (body as { waitlistId: string }).waitlistId.trim()
      : "";

  if (!waitlistId) {
    return NextResponse.json(
      { error: 'Informe "waitlistId" no corpo da requisição.' },
      { status: 400 },
    );
  }

  try {
    const result = await offerWaitlistSlot(
      createAppointmentRepository(),
      createWaitlistRepository(),
      id,
      waitlistId,
    );
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AppointmentNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof WaitlistNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof OfferSlotError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 400 },
      );
    }
    console.error("[POST /api/appointments/:id/offer]", error);
    return NextResponse.json(
      { error: "Erro interno ao oferecer vaga." },
      { status: 500 },
    );
  }
}
