import { describe, expect, it } from "vitest";
import { InMemoryExamPreparationRepository } from "./in-memory-exam-preparation-repository";

describe("InMemoryExamPreparationRepository", () => {
  it("lista os preparos do seed por nome do exame", async () => {
    const repo = new InMemoryExamPreparationRepository();

    const names = (await repo.list()).map((preparation) => preparation.examName);

    expect(names).toEqual(["Glicemia em jejum", "Ultrassonografia de abdome total"]);
  });

  it("busca pelo nome do exame, com os itens na ordem do checklist", async () => {
    const repo = new InMemoryExamPreparationRepository();

    const preparation = await repo.findByExamName("Ultrassonografia de abdome total");

    expect(preparation?.items.map((item) => item.label)).toEqual([
      "Jejum de 8 horas",
      "Bexiga cheia",
    ]);
  });

  it("devolve null para exame sem preparo e não deixa alterar o cadastro", async () => {
    const repo = new InMemoryExamPreparationRepository();

    expect(await repo.findByExamName("Raio-X de tórax")).toBeNull();

    const [first] = await repo.list();
    first.items.pop();
    expect((await repo.list())[0].items).toHaveLength(2);
  });
});
