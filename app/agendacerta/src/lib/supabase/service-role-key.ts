/**
 * Validação defensiva da service role (sem verificar assinatura JWT).
 * Evita configurar a anon/publishable em SUPABASE_SERVICE_ROLE_KEY.
 */
export function assertServiceRoleKey(key: string): void {
  const trimmed = key.trim();

  if (!trimmed) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY vazia. Use a secret/service_role do projeto Supabase.",
    );
  }

  if (
    trimmed.startsWith("sb_publishable_") ||
    trimmed.startsWith("sb_anon_")
  ) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY parece ser a chave anon/publishable. Use a secret/service_role no servidor.",
    );
  }

  if (trimmed.startsWith("eyJ")) {
    const role = peekJwtRole(trimmed);
    if (role === "anon") {
      throw new Error(
        "SUPABASE_SERVICE_ROLE_KEY é um JWT com role anon. Use o JWT service_role (ou sb_secret_).",
      );
    }
  }
}

function peekJwtRole(jwt: string): string | null {
  try {
    const [, payload] = jwt.split(".");
    if (!payload) {
      return null;
    }
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const pad = "=".repeat((4 - (normalized.length % 4)) % 4);
    const json = Buffer.from(normalized + pad, "base64").toString("utf8");
    const parsed = JSON.parse(json) as { role?: unknown };
    return typeof parsed.role === "string" ? parsed.role : null;
  } catch {
    return null;
  }
}
