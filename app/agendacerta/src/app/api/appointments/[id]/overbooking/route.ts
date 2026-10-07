import { NextResponse } from "next/server";
import { decideOverbooking } from "@/application/overbooking/decide-overbooking";
import { createOverbookingDeps } from "@/application/overbooking/deps";
import { isOverbookingDecisionInput } from "@/domain/overbooking";
import { requireClinicSession } from "@/lib/auth/require-session";
import { overbookingErrorResponse } from "../../../overbookings/overbooking-error-response";
import { fieldOf, readJsonBody } from "../../../slot-offers/slot-offer-error-response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/** `id` é o agendamento de risco alto que motivou a sugestão (a âncora do bloco). */
export async function POST(request: Request, context: RouteContext) {
  const sessionCheck = await requireClinicSession(request);
  if (!sessionCheck.ok) return sessionCheck.response;

  const { id } = await context.params;

  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;

  const decision = fieldOf(parsed.body, "decision");
  if (!isOverbookingDecisionInput(decision)) {
    return NextResponse.json(
      { error: 'Informe "decision" como "aceitar" ou "recusar".' },
      { status: 400 },
    );
  }

  try {
    const result = await decideOverbooking(createOverbookingDeps(), id, decision);
    return NextResponse.json(result, { status: decision === "aceitar" ? 201 : 200 });
  } catch (error) {
    return overbookingErrorResponse(
      error,
      "[POST /api/appointments/:id/overbooking]",
      "Erro interno ao registrar a decisão do encaixe.",
    );
  }
}
