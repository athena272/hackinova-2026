import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ExamPreparation } from "@/domain/exam-preparation";
import { examPreparationSelect } from "./mappers";
import { PrismaExamPreparationRepository } from "./prisma-exam-preparation-repository";

const record = {
  id: "prep-glicemia-jejum",
  examName: "Glicemia em jejum",
  instructions: "Jejum de 8 a 12 horas.",
  items: [
    {
      id: "prep-glicemia-jejum-jejum",
      position: 1,
      label: "Jejum de 8 a 12 horas",
      question: "Você vai ficar de 8 a 12 horas sem comer, só com água?",
    },
  ],
};

const preparation: ExamPreparation = { ...record, items: [...record.items] };

function setup() {
  const examPreparation = {
    findMany: vi.fn(),
    findUnique: vi.fn(),
  };
  const repo = new PrismaExamPreparationRepository(
    () => ({ examPreparation }) as never,
  );
  return { examPreparation, repo };
}

describe("PrismaExamPreparationRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lista os preparos por nome do exame, com itens na ordem do checklist", async () => {
    const { examPreparation, repo } = setup();
    examPreparation.findMany.mockResolvedValue([record]);

    await expect(repo.list()).resolves.toEqual([preparation]);
    expect(examPreparation.findMany).toHaveBeenCalledWith({
      select: examPreparationSelect,
      orderBy: { examName: "asc" },
    });
    expect(examPreparationSelect.items).toMatchObject({ orderBy: { position: "asc" } });
  });

  it("busca o preparo pelo nome do exame", async () => {
    const { examPreparation, repo } = setup();
    examPreparation.findUnique.mockResolvedValue(record);

    await expect(repo.findByExamName("Glicemia em jejum")).resolves.toEqual(preparation);
    expect(examPreparation.findUnique).toHaveBeenCalledWith({
      where: { examName: "Glicemia em jejum" },
      select: examPreparationSelect,
    });
  });

  it("devolve null para exame sem preparo cadastrado", async () => {
    const { examPreparation, repo } = setup();
    examPreparation.findUnique.mockResolvedValue(null);

    await expect(repo.findByExamName("Raio-X de tórax")).resolves.toBeNull();
  });

  it("propaga falhas com contexto legível", async () => {
    const { examPreparation, repo } = setup();
    examPreparation.findMany.mockRejectedValue(new Error("relation does not exist"));
    examPreparation.findUnique.mockRejectedValue(new Error("connection refused"));

    await expect(repo.list()).rejects.toThrow(
      "Falha ao listar preparos: relation does not exist",
    );
    await expect(repo.findByExamName("Glicemia em jejum")).rejects.toThrow(
      "Falha ao buscar preparo do exame: connection refused",
    );
  });
});
