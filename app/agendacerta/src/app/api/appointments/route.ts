import { NextResponse } from "next/server";
import { hasSupabaseConfig } from "@/lib/supabase/admin";
import { createAppointmentRepository } from "@/repository/create-appointment-repository";

export async function GET() {
  const source = hasSupabaseConfig() ? "supabase" : "memory";
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
