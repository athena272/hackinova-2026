import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@/generated/prisma/client";
import { neighborhoodSelect, patientLocationSelect } from "./mappers";
import { PrismaPatientRepository } from "./prisma-patient-repository";

const jardinsRecord = {
  id: "nb-jardins",
  name: "Jardins",
  city: "Aracaju",
  latitude: new Prisma.Decimal("-10.944000"),
  longitude: new Prisma.Decimal("-37.056000"),
};

const jardins = {
  id: "nb-jardins",
  name: "Jardins",
  city: "Aracaju",
  latitude: -10.944,
  longitude: -37.056,
};

function setup() {
  const patient = { findMany: vi.fn() };
  const neighborhood = { findUnique: vi.fn() };
  const repo = new PrismaPatientRepository(() => ({ patient, neighborhood }) as never);
  return { patient, neighborhood, repo };
}

describe("PrismaPatientRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lista o bairro de cada paciente convertendo Decimal em number", async () => {
    const { patient, repo } = setup();
    patient.findMany.mockResolvedValue([
      { id: "pat-ana", neighborhood: jardinsRecord },
      { id: "pat-sem-bairro", neighborhood: null },
    ]);

    await expect(repo.listLocations()).resolves.toEqual([
      { patientId: "pat-ana", neighborhood: jardins },
      { patientId: "pat-sem-bairro", neighborhood: null },
    ]);
    expect(patient.findMany).toHaveBeenCalledWith({
      select: patientLocationSelect,
      orderBy: { id: "asc" },
    });
  });

  it("propaga falha da listagem com contexto legível", async () => {
    const { patient, repo } = setup();
    patient.findMany.mockRejectedValue(new Error("relation does not exist"));

    await expect(repo.listLocations()).rejects.toThrow(
      "Falha ao listar bairros dos pacientes: relation does not exist",
    );
  });

  it("busca o bairro por id", async () => {
    const { neighborhood, repo } = setup();
    neighborhood.findUnique.mockResolvedValue(jardinsRecord);

    await expect(repo.getNeighborhood("nb-jardins")).resolves.toEqual(jardins);
    expect(neighborhood.findUnique).toHaveBeenCalledWith({
      where: { id: "nb-jardins" },
      select: neighborhoodSelect,
    });
  });

  it("devolve null para bairro inexistente", async () => {
    const { neighborhood, repo } = setup();
    neighborhood.findUnique.mockResolvedValue(null);

    await expect(repo.getNeighborhood("nb-inexistente")).resolves.toBeNull();
  });

  it("propaga falha da busca de bairro com contexto legível", async () => {
    const { neighborhood, repo } = setup();
    neighborhood.findUnique.mockRejectedValue(new Error("timeout"));

    await expect(repo.getNeighborhood("nb-jardins")).rejects.toThrow(
      "Falha ao buscar bairro: timeout",
    );
  });
});
