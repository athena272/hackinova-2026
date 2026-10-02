import { NextResponse } from "next/server";
import type { ClinicSession, SessionCheck } from "./require-session";

/** Helpers para testes de rota que mockam `requireClinicSession`. */
export function authorizedSessionCheck(): SessionCheck {
  return {
    ok: true,
    session: {
      session: { id: "ses-test", userId: "usr-test" },
      user: { id: "usr-test", email: "clinica@exemplo.com" },
    } as unknown as ClinicSession,
  };
}

export function unauthorizedSessionCheck(): SessionCheck {
  return {
    ok: false,
    response: NextResponse.json(
      { error: "Sessão expirada. Faça login novamente." },
      { status: 401 },
    ),
  };
}
