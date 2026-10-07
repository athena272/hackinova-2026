import { NextResponse } from "next/server";
import { chooseDuplicateBooking } from "@/application/duplicate-bookings/choose-duplicate-booking";
import { createDuplicateBookingDeps } from "@/application/duplicate-bookings/deps";
import { requireClinicSession } from "@/lib/auth/require-session";
import { fieldOf, readJsonBody } from "../../../slot-offers/slot-offer-error-response";
import { duplicateBookingErrorResponse } from "../../duplicate-booking-error-response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/** `id` é a confirmação reforçada; o corpo diz qual horário o paciente quer manter. */
export async function POST(request: Request, context: RouteContext) {
  const sessionCheck = await requireClinicSession(request);
  if (!sessionCheck.ok) return sessionCheck.response;

  const { id } = await context.params;

  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;

  const keepAppointmentId = fieldOf(parsed.body, "keepAppointmentId");
  if (typeof keepAppointmentId !== "string" || keepAppointmentId.trim() === "") {
    return NextResponse.json(
      { error: 'Informe "keepAppointmentId" com o horário que o paciente vai manter.' },
      { status: 400 },
    );
  }

  try {
    const result = await chooseDuplicateBooking(createDuplicateBookingDeps(), id, keepAppointmentId);
    return NextResponse.json(result);
  } catch (error) {
    return duplicateBookingErrorResponse(
      error,
      "[POST /api/duplicate-bookings/:id/choice]",
      "Erro interno ao registrar a escolha do paciente.",
    );
  }
}
