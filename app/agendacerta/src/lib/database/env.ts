export class DatabaseConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DatabaseConfigError";
  }
}

export type EnvSource = Record<string, string | undefined>;

const POSTGRES_PROTOCOLS = ["postgres:", "postgresql:"];

/** Sem DATABASE_URL, o app usa os repositórios em memória (testes/CI). */
export function hasDatabaseConfig(env: EnvSource = process.env): boolean {
  return Boolean(env.DATABASE_URL?.trim());
}

/** Lê e valida a connection string Postgres usada por dados e login. */
export function readDatabaseUrl(env: EnvSource = process.env): string {
  const databaseUrl = env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new DatabaseConfigError(
      "Banco de dados não configurado: defina DATABASE_URL. Use a connection string Postgres do Supabase (veja .env.example).",
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new DatabaseConfigError("DATABASE_URL não é uma URL válida.");
  }
  if (!POSTGRES_PROTOCOLS.includes(parsed.protocol)) {
    throw new DatabaseConfigError(
      "DATABASE_URL deve começar com postgres:// ou postgresql://.",
    );
  }

  return databaseUrl;
}
