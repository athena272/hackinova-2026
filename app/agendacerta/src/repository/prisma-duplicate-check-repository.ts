import type { AppointmentStatus } from "@/domain/appointment";
import type {
  DuplicateCheck,
  DuplicateCheckResolution,
  OpenDuplicateCheck,
  ResolvedDuplicateCheck,
} from "@/domain/duplicate-booking";
import type { PrismaClient } from "@/generated/prisma/client";
import { describeDatabaseError, isUniqueConstraintError } from "@/lib/database/errors";
import { getPrisma } from "@/lib/database/prisma";
import type { DuplicateCheckRepository } from "./duplicate-check-repository";
import { DuplicateCheckConflictError } from "./errors";
import { duplicateCheckSelect, mapRecordToDuplicateCheck } from "./mappers";

type DuplicateCheckClient = Pick<PrismaClient, "duplicateBookingCheck" | "$transaction">;

/** Mesmo critério de isActiveBooking: só horário ainda marcado pode ser mantido ou liberado. */
const ACTIVE_STATUSES: AppointmentStatus[] = ["pendente", "confirmado"];

/** Sinaliza, dentro da transação, que a confirmação ou um horário mudou nesse meio tempo. */
class ResolutionStaleError extends Error {}

function expectStatus(check: DuplicateCheck, status: "aguardando"): OpenDuplicateCheck;
function expectStatus(check: DuplicateCheck, status: "resolvida"): ResolvedDuplicateCheck;
function expectStatus(check: DuplicateCheck, status: DuplicateCheck["status"]): DuplicateCheck {
  if (check.status !== status) {
    throw new Error(`Status gravado diferente do esperado: ${check.id}`);
  }
  return check;
}

export class PrismaDuplicateCheckRepository implements DuplicateCheckRepository {
  constructor(private readonly getClient: () => DuplicateCheckClient = getPrisma) {}

  async list(): Promise<DuplicateCheck[]> {
    try {
      const records = await this.getClient().duplicateBookingCheck.findMany({
        select: duplicateCheckSelect,
        orderBy: [{ sentAt: "asc" }, { id: "asc" }],
      });
      return records.map(mapRecordToDuplicateCheck);
    } catch (error) {
      throw describeDatabaseError("Falha ao listar confirmações reforçadas", error);
    }
  }

  async getById(id: string): Promise<DuplicateCheck | null> {
    try {
      const record = await this.getClient().duplicateBookingCheck.findUnique({
        where: { id },
        select: duplicateCheckSelect,
      });
      return record ? mapRecordToDuplicateCheck(record) : null;
    } catch (error) {
      throw describeDatabaseError("Falha ao buscar confirmação reforçada", error);
    }
  }

  /** A confirmação e os horários entram juntos (create aninhado é atômico). */
  async create(check: OpenDuplicateCheck): Promise<OpenDuplicateCheck> {
    try {
      const record = await this.getClient().duplicateBookingCheck.create({
        data: {
          id: check.id,
          patientId: check.patientId,
          groupKey: check.groupKey,
          status: "aguardando",
          sentAt: check.sentAt,
          items: {
            create: check.appointmentIds.map((appointmentId) => ({ appointmentId })),
          },
        },
        select: duplicateCheckSelect,
      });
      return expectStatus(mapRecordToDuplicateCheck(record), "aguardando");
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new DuplicateCheckConflictError(check.id, { cause: error });
      }
      throw describeDatabaseError("Falha ao enviar confirmação reforçada", error);
    }
  }

  async resolve({ check, kept, released }: DuplicateCheckResolution): Promise<ResolvedDuplicateCheck> {
    try {
      const record = await this.getClient().$transaction(async (tx) => {
        const closed = await tx.duplicateBookingCheck.updateMany({
          where: { id: check.id, status: "aguardando" },
          data: {
            status: "resolvida",
            keptAppointmentId: check.keptAppointmentId,
            resolvedAt: check.resolvedAt,
          },
        });
        if (closed.count === 0) throw new ResolutionStaleError();

        const confirmed = await tx.appointment.updateMany({
          where: { id: kept.id, status: { in: ACTIVE_STATUSES } },
          data: { status: kept.status },
        });
        if (confirmed.count === 0) throw new ResolutionStaleError();

        if (released.length > 0) {
          const freed = await tx.appointment.updateMany({
            where: { id: { in: released.map(({ id }) => id) }, status: { in: ACTIVE_STATUSES } },
            data: { status: "liberado" },
          });
          if (freed.count !== released.length) throw new ResolutionStaleError();
        }

        return tx.duplicateBookingCheck.findUniqueOrThrow({
          where: { id: check.id },
          select: duplicateCheckSelect,
        });
      });
      return expectStatus(mapRecordToDuplicateCheck(record), "resolvida");
    } catch (error) {
      if (error instanceof ResolutionStaleError) {
        throw new DuplicateCheckConflictError(check.id, { cause: error });
      }
      throw describeDatabaseError("Falha ao registrar a escolha do paciente", error);
    }
  }
}
