import { NextResponse } from "next/server";
import { answerPreparationChecklist } from "@/application/answer-preparation-checklist";
import { type ChecklistAnswers, PreparationError } from "@/domain/exam-preparation";
import { requireClinicSession } from "@/lib/auth/require-session";
import { createAppointmentRepository } from "@/repository/create-appointment-repository";
import { createExamPreparationRepository } from "@/repository/create-exam-preparation-repository";
import { AppointmentNotFoundError } from "@/repository/errors";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function readAnswers(body: unknown): ChecklistAnswers | null {
  if (typeof body !== "object" || body === null || !("answers" in body)) {
    return null;
  }
  const { answers } = body as { answers: unknown };
  if (typeof answers !== "object" || answers === null || Array.isArray(answers)) {
    return null;
  }
  return answers as ChecklistAnswers;
}

export async function POST(request: Request, context: RouteContext) {
  const sessionCheck = await requireClinicSession(request);
  if (!sessionCheck.ok) return sessionCheck.response;

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

  const answers = readAnswers(body);
  if (!answers) {
    return NextResponse.json(
      { error: 'Informe "answers" com o id de cada item e true ou false.' },
      { status: 400 },
    );
  }

  try {
    const appointment = await answerPreparationChecklist(
      createAppointmentRepository(),
      createExamPreparationRepository(),
      id,
      answers,
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
    console.error("[POST /api/appointments/:id/preparation]", error);
    return NextResponse.json(
      { error: "Erro interno ao registrar o preparo." },
      { status: 500 },
    );
  }
}
