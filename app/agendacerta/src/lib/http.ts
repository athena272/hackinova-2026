/** Lê o corpo como JSON; evita "Unexpected end of JSON input" em 500 vazios. */
export async function readResponseJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text.trim()) {
    throw new Error(
      `Resposta vazia da API (HTTP ${response.status}). Confira as env vars do Supabase na Vercel e se a migration rodou no projeto cloud.`,
    );
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      `Resposta inválida da API (HTTP ${response.status}).`,
    );
  }
}
