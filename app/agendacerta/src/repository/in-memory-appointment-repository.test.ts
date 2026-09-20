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
});
