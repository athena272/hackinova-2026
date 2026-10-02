import { NextResponse } from "next/server";
import { AuthConfigError } from "./env";
import { getAuth, type Auth } from "./server";

export type ClinicSession = NonNullable<
  Awaited<ReturnType<Auth["api"]["getSession"]>>
>;

export type SessionResolution =
  | { status: "authenticated"; session: ClinicSession }
  | { status: "anonymous" }
  | { status: "unavailable" };

export type SessionCheck =
  | { ok: true; session: ClinicSession }
  | { ok: false; response: NextResponse };

export const SESSION_EXPIRED_MESSAGE = "Sessão expirada. Faça login novamente.";
export const AUTH_UNAVAILABLE_MESSAGE =
  "Autenticação indisponível no servidor. Verifique DATABASE_URL e BETTER_AUTH_SECRET.";

/** Valida a sessão (cookie + banco) sem lançar exceção. */
export async function resolveClinicSession(
  headers: Headers,
): Promise<SessionResolution> {
  try {
    const session = await getAuth().api.getSession({ headers });
    return session ? { status: "authenticated", session } : { status: "anonymous" };
  } catch (error) {
    if (!(error instanceof AuthConfigError)) {
      console.error("[auth] falha ao validar sessão", error);
    }
    return { status: "unavailable" };
  }
}

/**
 * Guard das rotas de API da clínica.
 * Quando `ok` for false, a rota deve devolver `response` sem seguir adiante.
 */
export async function requireClinicSession(
  request: Request,
): Promise<SessionCheck> {
  const resolution = await resolveClinicSession(request.headers);
  switch (resolution.status) {
    case "authenticated":
      return { ok: true, session: resolution.session };
    case "anonymous":
      return {
        ok: false,
        response: NextResponse.json(
          { error: SESSION_EXPIRED_MESSAGE },
          { status: 401 },
        ),
      };
    case "unavailable":
      return {
        ok: false,
        response: NextResponse.json(
          { error: AUTH_UNAVAILABLE_MESSAGE },
          { status: 503 },
        ),
      };
  }
}
