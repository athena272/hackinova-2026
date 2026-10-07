import { NextResponse } from "next/server";
import { createDuplicateBookingDeps } from "@/application/duplicate-bookings/deps";
import { listDuplicateBookings } from "@/application/duplicate-bookings/list-duplicate-bookings";
import { sendDuplicateCheck } from "@/application/duplicate-bookings/send-duplicate-check";
import { requireClinicSession } from "@/lib/auth/require-session";
import { fieldOf, readJsonBody } from "../slot-offers/slot-offer-error-response";
import { duplicateBookingErrorResponse } from "./duplicate-booking-error-response";

function isAppointmentIdList(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    value.every((id) => typeof id === "string" && id.trim() !== "")
  );
}

export async function GET(request: Request) {
  const sessionCheck = await requireClinicSession(request);
  if (!sessionCheck.ok) return sessionCheck.response;

  try {
    return NextResponse.json(await listDuplicateBookings(createDuplicateBookingDeps()));
  } catch (error) {
    return duplicateBookingErrorResponse(
      error,
      "[GET /api/duplicate-bookings]",
      "Erro interno ao buscar possíveis duplicidades.",
    );
  }
}

/** Envia a confirmação reforçada para os horários de uma possível duplicidade. */
export async function POST(request: Request) {
  const sessionCheck = await requireClinicSession(request);
  if (!sessionCheck.ok) return sessionCheck.response;

  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;

  const appointmentIds = fieldOf(parsed.body, "appointmentIds");
  if (!isAppointmentIdList(appointmentIds)) {
    return NextResponse.json(
      { error: 'Informe "appointmentIds" com pelo menos dois agendamentos.' },
      { status: 400 },
    );
  }

  try {
    const check = await sendDuplicateCheck(createDuplicateBookingDeps(), appointmentIds);
    return NextResponse.json({ check }, { status: 201 });
  } catch (error) {
    return duplicateBookingErrorResponse(
      error,
      "[POST /api/duplicate-bookings]",
      "Erro interno ao enviar a confirmação reforçada.",
    );
  }
}
