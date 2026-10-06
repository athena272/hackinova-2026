import { Prisma } from "@/generated/prisma/client";

const RECORD_NOT_FOUND = "P2025";
const UNIQUE_CONSTRAINT_FAILED = "P2002";

/** Prisma lança P2002 quando o insert/update fere um índice único. */
export function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === UNIQUE_CONSTRAINT_FAILED
  );
}

/** Prisma lança P2025 quando update/delete não encontra o registro. */
export function isRecordNotFoundError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === RECORD_NOT_FOUND
  );
}

/** Mantém o formato "Falha ao <ação>: <motivo>" que as rotas e o painel exibem. */
export function describeDatabaseError(context: string, error: unknown): Error {
  const reason =
    error instanceof Error && error.message.trim()
      ? error.message.trim()
      : "erro desconhecido no banco de dados";
  return new Error(`${context}: ${reason}`, { cause: error });
}
