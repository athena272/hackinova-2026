import { NextResponse } from "next/server";
import { hasSupabaseConfig } from "@/lib/supabase/admin";
import { createAppointmentRepository } from "@/repository/create-appointment-repository";

export async function GET() {
  const source = hasSupabaseConfig() ? "supabase" : "memory";
  const repo = createAppointmentRepository();
  const appointments = await repo.list();
  return NextResponse.json({ appointments, source });
}
