import { NextResponse } from "next/server";
import { requireClinicSession } from "@/lib/auth/require-session";
import { hasDatabaseConfig } from "@/lib/database/env";
import { createAppointmentRepository } from "@/repository/create-appointment-repository";

export async function GET(request: Request) {
  const sessionCheck = await requireClinicSession(request);
  if (!sessionCheck.ok) return sessionCheck.response;

  const source = hasDatabaseConfig() ? "supabase" : "memory";
  try {
    const repo = createAppointmentRepository();
    const appointments = await repo.list();
    return NextResponse.json({ appointments, source });
  } catch (error) {
    console.error("[GET /api/appointments]", error);
    const message =
      error instanceof Error ? error.message : "Erro interno ao listar agenda.";
    return NextResponse.json({ error: message, source }, { status: 500 });
  }
}
