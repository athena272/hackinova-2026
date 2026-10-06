/** Lê o corpo como JSON; evita "Unexpected end of JSON input" em 500 vazios. */
export async function readResponseJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text.trim()) {
    throw new Error(
      `Resposta vazia da API (HTTP ${response.status}). Confira a DATABASE_URL na Vercel e se as migrations rodaram no projeto cloud.`,
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

export type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;

/** GET sem cache. Resposta de erro vira Error com a mensagem que a API mandou. */
export async function getApiJson<T extends object>(
  url: string,
  fallbackError: string,
  fetcher: Fetcher = fetch,
): Promise<T> {
  const response = await fetcher(url, { cache: "no-store" });
  const payload = await readResponseJson<T & { error?: string }>(response);
  if (!response.ok) {
    throw new Error(payload.error ?? fallbackError);
  }
  return payload;
}
