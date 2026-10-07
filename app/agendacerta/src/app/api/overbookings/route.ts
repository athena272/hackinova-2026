import { NextResponse } from "next/server";
import { createOverbookingDeps } from "@/application/overbooking/deps";
import { listOverbookings } from "@/application/overbooking/list-overbookings";
import { requireClinicSession } from "@/lib/auth/require-session";
import { overbookingErrorResponse } from "./overbooking-error-response";

export async function GET(request: Request) {
  const sessionCheck = await requireClinicSession(request);
  if (!sessionCheck.ok) return sessionCheck.response;

  try {
    return NextResponse.json(await listOverbookings(createOverbookingDeps()));
  } catch (error) {
    return overbookingErrorResponse(
      error,
      "[GET /api/overbookings]",
      "Erro interno ao buscar sugestões de encaixe.",
    );
  }
}
