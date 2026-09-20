import { NextResponse } from "next/server";
import { isConfirmationAction } from "@/domain/appointment";
import { ConfirmationError } from "@/domain/confirmation";
import {
  AppointmentNotFoundError,
  createAppointmentRepository,
} from "@/repository/create-appointment-repository";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
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

  const action =
    typeof body === "object" && body !== null && "action" in body
      ? (body as { action: unknown }).action
      : undefined;

  if (!isConfirmationAction(action)) {
    return NextResponse.json(
      {
        error: 'Ação inválida. Use "SIM", "NAO" ou "REMARCAR".',
      },
      { status: 400 },
    );
  }

  const repo = createAppointmentRepository();

  try {
    const appointment = await repo.confirm(id, action);
    return NextResponse.json({ appointment });
  } catch (error) {
    if (error instanceof AppointmentNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof ConfirmationError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 400 },
      );
    }
    console.error(error);
    return NextResponse.json(
      { error: "Erro interno ao confirmar agendamento." },
      { status: 500 },
    );
  }
}
