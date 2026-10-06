import type { Appointment, ConfirmationAction } from "@/domain/appointment";
import { applyConfirmationAction } from "@/domain/confirmation";
import type { PrismaClient } from "@/generated/prisma/client";
import {
  describeDatabaseError,
  isRecordNotFoundError,
} from "@/lib/database/errors";
import { getPrisma } from "@/lib/database/prisma";
import type { AppointmentRepository } from "./appointment-repository";
import { AppointmentNotFoundError } from "./errors";
import { appointmentSelect, mapRecordToAppointment } from "./mappers";

type AppointmentClient = Pick<PrismaClient, "appointment">;

type AppointmentUpdate = Partial<
  Pick<Appointment, "patientId" | "bookedAt" | "status">
>;

export class PrismaAppointmentRepository implements AppointmentRepository {
  constructor(
    private readonly getClient: () => AppointmentClient = getPrisma,
  ) {}

  async list(): Promise<Appointment[]> {
    try {
      const records = await this.getClient().appointment.findMany({
        select: appointmentSelect,
        orderBy: { scheduledAt: "asc" },
      });
      return records.map(mapRecordToAppointment);
    } catch (error) {
      throw describeDatabaseError("Falha ao listar agendamentos", error);
    }
  }

  async getById(id: string): Promise<Appointment | null> {
    try {
      const record = await this.getClient().appointment.findUnique({
        where: { id },
        select: appointmentSelect,
      });
      return record ? mapRecordToAppointment(record) : null;
    } catch (error) {
      throw describeDatabaseError("Falha ao buscar agendamento", error);
    }
  }

  async confirm(id: string, action: ConfirmationAction): Promise<Appointment> {
    const current = await this.getById(id);
    if (!current) {
      throw new AppointmentNotFoundError(id);
    }

    const nextStatus = applyConfirmationAction(current.status, action);
    return this.update(id, { status: nextStatus }, "Falha ao confirmar agendamento");
  }

  async saveOffered(appointment: Appointment): Promise<Appointment> {
    return this.update(
      appointment.id,
      {
        patientId: appointment.patientId,
        bookedAt: appointment.bookedAt,
        status: appointment.status,
      },
      "Falha ao oferecer vaga",
    );
  }

  private async update(
    id: string,
    data: AppointmentUpdate,
    errorContext: string,
  ): Promise<Appointment> {
    try {
      const record = await this.getClient().appointment.update({
        where: { id },
        data,
        select: appointmentSelect,
      });
      return mapRecordToAppointment(record);
    } catch (error) {
      if (isRecordNotFoundError(error)) {
        throw new AppointmentNotFoundError(id);
      }
      throw describeDatabaseError(errorContext, error);
    }
  }
}
