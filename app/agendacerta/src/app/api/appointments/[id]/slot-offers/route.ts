import { NextResponse } from "next/server";
import { createSlotOfferDeps } from "@/application/slot-offers/deps";
import { startSlotOffer } from "@/application/slot-offers/start-slot-offer";
import { requireClinicSession } from "@/lib/auth/require-session";
import {
  fieldOf,
  readJsonBody,
  slotOfferErrorResponse,
} from "../../../slot-offers/slot-offer-error-response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const sessionCheck = await requireClinicSession(request);
  if (!sessionCheck.ok) return sessionCheck.response;

  const { id } = await context.params;

  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;

  try {
    const offer = await startSlotOffer(
      createSlotOfferDeps(),
      id,
      fieldOf(parsed.body, "timeoutMinutes"),
    );
    return NextResponse.json({ offer }, { status: 201 });
  } catch (error) {
    return slotOfferErrorResponse(
      error,
      "[POST /api/appointments/:id/slot-offers]",
      "Erro interno ao iniciar a oferta da vaga.",
    );
  }
}
