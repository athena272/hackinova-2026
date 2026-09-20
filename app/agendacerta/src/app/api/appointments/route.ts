import { NextResponse } from "next/server";
import { createAppointmentRepository } from "@/repository/in-memory-appointment-repository";

export async function GET() {
  const repo = createAppointmentRepository();
  const appointments = await repo.list();
  return NextResponse.json({ appointments });
}
