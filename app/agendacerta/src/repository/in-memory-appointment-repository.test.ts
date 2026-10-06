import { describe, expect, it, beforeEach } from "vitest";
import {
  InMemoryAppointmentRepository,
  resetAppointmentStoreForTests,
} from "./in-memory-appointment-repository";
import { AppointmentNotFoundError } from "./errors";
import { ConfirmationError } from "@/domain/confirmation";

describe("InMemoryAppointmentRepository", () => {
  beforeEach(() => {
    resetAppointmentStoreForTests();
  });

  it("lista agendamentos do seed", async () => {
    const repo = new InMemoryAppointmentRepository();
    const list = await repo.list();
    expect(list.length).toBeGreaterThanOrEqual(6);
    expect(list.some((a) => a.id === "apt-001")).toBe(true);
  });

  it("monta nome e telefone a partir do cadastro de pacientes e inclui o histórico", async () => {
    const repo = new InMemoryAppointmentRepository();
    const list = await repo.list();

    expect(list.find((a) => a.id === "apt-001")).toMatchObject({
      patientId: "pat-6f020c3c9b97",
      patientName: "Ana Souza",
      phoneMasked: "(79) 9****-1234",
      procedure: { type: "consulta" },
    });
    expect(list.find((a) => a.id === "apt-004")?.procedure).toEqual({
      type: "exame",
      examName: "Ultrassonografia de abdome total",
    });
    expect(list.some((a) => a.status === "faltou")).toBe(true);
    expect(list.some((a) => a.status === "compareceu")).toBe(true);
  });

  it("confirma SIM e atualiza status", async () => {
    const repo = new InMemoryAppointmentRepository();
    const updated = await repo.confirm("apt-001", "SIM");
    expect(updated.status).toBe("confirmado");
    const again = await repo.getById("apt-001");
    expect(again?.status).toBe("confirmado");
  });

  it("retorna erro tipado quando id não existe", async () => {
    const repo = new InMemoryAppointmentRepository();
    await expect(repo.confirm("apt-999", "SIM")).rejects.toBeInstanceOf(
      AppointmentNotFoundError,
    );
  });

  it("propaga ConfirmationError quando status não é pendente", async () => {
    const repo = new InMemoryAppointmentRepository();
    await expect(repo.confirm("apt-004", "SIM")).rejects.toBeInstanceOf(
      ConfirmationError,
    );
  });

  it("traz a resposta de preparo do seed", async () => {
    const repo = new InMemoryAppointmentRepository();

    expect((await repo.getById("apt-004"))?.preparation).toEqual({
      result: "ok",
      missedItemIds: [],
      answeredAt: "2026-09-22T18:00:00-03:00",
    });
    expect((await repo.getById("apt-008"))?.preparation).toBeNull();
  });

  it("grava a resposta de preparo sem expor a lista interna do store", async () => {
    const repo = new InMemoryAppointmentRepository();
    const current = (await repo.getById("apt-008"))!;
    const missedItemIds = ["prep-us-abdome-total-jejum"];

    const saved = await repo.savePreparationAnswer({
      ...current,
      preparation: {
        result: "nao_cumprido",
        missedItemIds,
        answeredAt: "2026-10-18T15:00:00.000Z",
      },
    });
    missedItemIds.push("alterado-depois");
    saved.preparation!.missedItemIds.push("alterado-no-retorno");

    expect((await repo.getById("apt-008"))?.preparation).toEqual({
      result: "nao_cumprido",
      missedItemIds: ["prep-us-abdome-total-jejum"],
      answeredAt: "2026-10-18T15:00:00.000Z",
    });
  });

  it("grava a vaga liberada", async () => {
    const repo = new InMemoryAppointmentRepository();
    const current = (await repo.getById("apt-008"))!;

    await repo.saveReleased({ ...current, status: "liberado" });

    expect((await repo.getById("apt-008"))?.status).toBe("liberado");
  });

  it("não cria agendamento ao gravar id inexistente", async () => {
    const repo = new InMemoryAppointmentRepository();
    const current = (await repo.getById("apt-008"))!;

    await expect(
      repo.saveReleased({ ...current, id: "apt-999", status: "liberado" }),
    ).rejects.toBeInstanceOf(AppointmentNotFoundError);
    expect(await repo.getById("apt-999")).toBeNull();
  });
});
