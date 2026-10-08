import { NextResponse } from "next/server";
import { createRecoveryMetricsDeps } from "@/application/recovery-metrics/deps";
import { getRecoveryMetrics } from "@/application/recovery-metrics/get-recovery-metrics";
import { isMetricsPeriodKind, parseReferenceDate } from "@/domain/recovery-metrics";
import { requireClinicSession } from "@/lib/auth/require-session";

function badRequest(error: string, code: string) {
  return NextResponse.json({ error, code }, { status: 400 });
}

/** GET ?period=semana|mes&reference=YYYY-MM-DD (reference opcional: padrão é hoje). */
export async function GET(request: Request) {
  const sessionCheck = await requireClinicSession(request);
  if (!sessionCheck.ok) return sessionCheck.response;

  const params = new URL(request.url).searchParams;
  const kind = params.get("period") ?? "semana";
  if (!isMetricsPeriodKind(kind)) {
    return badRequest('Período inválido: use "semana" ou "mes".', "INVALID_PERIOD");
  }

  const reference = params.get("reference");
  const referenceDate = reference === null ? undefined : parseReferenceDate(reference);
  if (referenceDate === null) {
    return badRequest("Data de referência inválida: use o formato AAAA-MM-DD.", "INVALID_REFERENCE_DATE");
  }

  try {
    return NextResponse.json(await getRecoveryMetrics(createRecoveryMetricsDeps(), { kind, referenceDate }));
  } catch (error) {
    console.error("[GET /api/recovery-metrics]", error);
    return NextResponse.json({ error: "Erro interno ao calcular os indicadores." }, { status: 500 });
  }
}
