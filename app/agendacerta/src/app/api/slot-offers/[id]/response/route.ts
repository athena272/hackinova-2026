import { NextResponse } from "next/server";
import { createSlotOfferDeps } from "@/application/slot-offers/deps";
import { respondSlotOffer } from "@/application/slot-offers/respond-slot-offer";
import { isSlotOfferResponse } from "@/domain/slot-offer";
import { requireClinicSession } from "@/lib/auth/require-session";
import {
  fieldOf,
  readJsonBody,
  slotOfferErrorResponse,
} from "../../slot-offer-error-response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const sessionCheck = await requireClinicSession(request);
  if (!sessionCheck.ok) return sessionCheck.response;

  const { id } = await context.params;

  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;

  const response = fieldOf(parsed.body, "response");
  if (!isSlotOfferResponse(response)) {
    return NextResponse.json(
      { error: 'Informe "response" como "aceitar" ou "recusar".' },
      { status: 400 },
    );
  }

  try {
    const result = await respondSlotOffer(createSlotOfferDeps(), id, response);
    return NextResponse.json(result);
  } catch (error) {
    return slotOfferErrorResponse(
      error,
      "[POST /api/slot-offers/:id/response]",
      "Erro interno ao registrar a resposta da oferta.",
    );
  }
}
