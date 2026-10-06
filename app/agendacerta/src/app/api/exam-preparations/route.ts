import { NextResponse } from "next/server";
import { requireClinicSession } from "@/lib/auth/require-session";
import { createExamPreparationRepository } from "@/repository/create-exam-preparation-repository";

export async function GET(request: Request) {
  const sessionCheck = await requireClinicSession(request);
  if (!sessionCheck.ok) return sessionCheck.response;

  try {
    const preparations = await createExamPreparationRepository().list();
    return NextResponse.json({ preparations });
  } catch (error) {
    console.error("[GET /api/exam-preparations]", error);
    const message =
      error instanceof Error && error.message.trim()
        ? error.message.trim()
        : "Falha ao listar preparos: erro interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
