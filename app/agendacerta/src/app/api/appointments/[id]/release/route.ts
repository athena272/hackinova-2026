import { NextResponse } from "next/server";
import { releaseSlotForMissedPreparation } from "@/application/release-slot-for-missed-preparation";
import { PreparationError } from "@/domain/exam-preparation";
import { requireClinicSession } from "@/lib/auth/require-session";
import { createAppointmentRepository } from "@/repository/create-appointment-repository";
import { AppointmentNotFoundError } from "@/repository/errors";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const sessionCheck = await requireClinicSession(request);
  if (!sessionCheck.ok) return sessionCheck.response;

  const { id } = await context.params;

  try {
    const appointment = await releaseSlotForMissedPreparation(
      createAppointmentRepository(),
      id,
    );
    return NextResponse.json({ appointment });
  } catch (error) {
    if (error instanceof AppointmentNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof PreparationError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 400 },
      );
    }
    console.error("[POST /api/appointments/:id/release]", error);
    return NextResponse.json(
      { error: "Erro interno ao liberar vaga." },
      { status: 500 },
    );
  }
}
