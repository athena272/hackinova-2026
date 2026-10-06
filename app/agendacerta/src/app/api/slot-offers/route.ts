import { NextResponse } from "next/server";
import { createSlotOfferDeps } from "@/application/slot-offers/deps";
import { listSlotOffers } from "@/application/slot-offers/list-slot-offers";
import { requireClinicSession } from "@/lib/auth/require-session";
import { slotOfferErrorResponse } from "./slot-offer-error-response";

export async function GET(request: Request) {
  const sessionCheck = await requireClinicSession(request);
  if (!sessionCheck.ok) return sessionCheck.response;

  try {
    const cascades = await listSlotOffers(createSlotOfferDeps());
    return NextResponse.json({ cascades });
  } catch (error) {
    return slotOfferErrorResponse(
      error,
      "[GET /api/slot-offers]",
      "Erro interno ao carregar as ofertas de vaga.",
    );
  }
}
