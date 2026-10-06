import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WaitlistEntry } from "@/domain/waitlist";
import { Prisma } from "@/generated/prisma/client";
import { WaitlistNotFoundError } from "./errors";
import { waitlistSelect } from "./mappers";
import { PrismaWaitlistRepository } from "./prisma-waitlist-repository";

const record = {
  id: "wl-001",
  specialty: "Neurologia",
  status: "aguardando" as const,
  patient: {
    id: "pat-helena",
    fullName: "Helena Dias",
    phoneMasked: "(79) 9****-4444",
  },
};

const entry: WaitlistEntry = {
  id: "wl-001",
  patientId: "pat-helena",
  patientName: "Helena Dias",
  specialty: "Neurologia",
  phoneMasked: "(79) 9****-4444",
  status: "aguardando",
};

function setup() {
  const waitlistEntry = {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  };
  const repo = new PrismaWaitlistRepository(() => ({ waitlistEntry }) as never);
  return { waitlistEntry, repo };
}

describe("PrismaWaitlistRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lista só quem está aguardando na especialidade, por ordem de id", async () => {
    const { waitlistEntry, repo } = setup();
    waitlistEntry.findMany.mockResolvedValue([record]);

    await expect(repo.listBySpecialty("Neurologia")).resolves.toEqual([entry]);
    expect(waitlistEntry.findMany).toHaveBeenCalledWith({
      where: { specialty: "Neurologia", status: "aguardando" },
      select: waitlistSelect,
      orderBy: { id: "asc" },
    });
  });

  it("propaga falha de listagem com contexto legível", async () => {
    const { waitlistEntry, repo } = setup();
    waitlistEntry.findMany.mockRejectedValue(new Error("relation does not exist"));

    await expect(repo.listBySpecialty("Neurologia")).rejects.toThrow(
      "Falha ao listar lista de espera: relation does not exist",
    );
  });

  it("getById retorna null quando o candidato não existe", async () => {
    const { waitlistEntry, repo } = setup();
    waitlistEntry.findUnique.mockResolvedValue(null);

    await expect(repo.getById("wl-999")).resolves.toBeNull();
  });

  it("saveAssigned grava apenas o novo status", async () => {
    const { waitlistEntry, repo } = setup();
    const assigned = { ...entry, status: "atribuido" as const };
    waitlistEntry.update.mockResolvedValue({ ...record, status: "atribuido" });

    await expect(repo.saveAssigned(assigned)).resolves.toEqual(assigned);
    expect(waitlistEntry.update).toHaveBeenCalledWith({
      where: { id: "wl-001" },
      data: { status: "atribuido" },
      select: waitlistSelect,
    });
  });

  it("saveAssigned converte P2025 em WaitlistNotFoundError", async () => {
    const { waitlistEntry, repo } = setup();
    waitlistEntry.update.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Record not found", {
        code: "P2025",
        clientVersion: "7.10.0",
      }),
    );

    await expect(
      repo.saveAssigned({ ...entry, status: "atribuido" }),
    ).rejects.toBeInstanceOf(WaitlistNotFoundError);
  });
});
