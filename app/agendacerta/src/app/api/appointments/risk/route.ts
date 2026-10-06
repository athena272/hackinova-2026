import { NextResponse } from "next/server";
import { scoreAppointmentsRisk } from "@/application/score-appointments-risk";
import { requireClinicSession } from "@/lib/auth/require-session";
import { createAppointmentRepository } from "@/repository/create-appointment-repository";
import { createPatientRepository } from "@/repository/create-patient-repository";

export async function GET(request: Request) {
  const sessionCheck = await requireClinicSession(request);
  if (!sessionCheck.ok) return sessionCheck.response;

  try {
    const risks = await scoreAppointmentsRisk(
      createAppointmentRepository(),
      createPatientRepository(),
    );
    return NextResponse.json({ risks });
  } catch (error) {
    console.error("[GET /api/appointments/risk]", error);
    const reason =
      error instanceof Error && error.message.trim()
        ? error.message.trim()
        : "erro interno";
    return NextResponse.json(
      { error: `Falha ao calcular risco: ${reason}` },
      { status: 500 },
    );
  }
}
