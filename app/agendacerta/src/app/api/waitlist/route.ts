import { NextResponse } from "next/server";
import { createWaitlistRepository } from "@/repository/create-waitlist-repository";

export async function GET(request: Request) {
  const specialty = new URL(request.url).searchParams.get("specialty")?.trim();

  if (!specialty) {
    return NextResponse.json(
      { error: "Informe a especialidade via ?specialty=..." },
      { status: 400 },
    );
  }

  try {
    const repo = createWaitlistRepository();
    const entries = await repo.listBySpecialty(specialty);
    return NextResponse.json({ entries });
  } catch (error) {
    console.error("[GET /api/waitlist]", error);
    const message =
      error instanceof Error
        ? error.message
        : "Erro interno ao listar lista de espera.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
