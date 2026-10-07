import type {
  AcceptedOverbooking,
  CreateEncaixeResult,
  Overbooking,
  RefusedOverbooking,
} from "@/domain/overbooking";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { describeDatabaseError, isUniqueConstraintError } from "@/lib/database/errors";
import { getPrisma } from "@/lib/database/prisma";
import { OverbookingConflictError } from "./errors";
import { mapRecordToOverbooking, overbookingSelect } from "./mappers";
import type { OverbookingRepository } from "./overbooking-repository";
import { toAppointmentCreateData } from "./prisma-appointment-repository";

type OverbookingClient = Pick<PrismaClient, "overbooking" | "$transaction">;

function toCreateData(overbooking: Overbooking): Prisma.OverbookingUncheckedCreateInput {
  return {
    id: overbooking.id,
    anchorAppointmentId: overbooking.anchorAppointmentId,
    specialty: overbooking.specialty,
    scheduledAt: overbooking.scheduledAt,
    decision: overbooking.decision,
    sequence: overbooking.sequence,
    encaixeAppointmentId: overbooking.encaixeAppointmentId,
    riskProbability: overbooking.riskProbability,
    decidedAt: overbooking.decidedAt,
  };
}

/** Sinaliza, dentro da transação, que o candidato já não estava aguardando. */
class CandidateTakenError extends Error {}

function expectDecision(overbooking: Overbooking, decision: "aceita"): AcceptedOverbooking;
function expectDecision(overbooking: Overbooking, decision: "recusada"): RefusedOverbooking;
function expectDecision(
  overbooking: Overbooking,
  decision: Overbooking["decision"],
): Overbooking {
  if (overbooking.decision !== decision) {
    throw new Error(`Decisão gravada diferente da enviada: ${overbooking.id}`);
  }
  return overbooking;
}

export class PrismaOverbookingRepository implements OverbookingRepository {
  constructor(private readonly getClient: () => OverbookingClient = getPrisma) {}

  async list(): Promise<Overbooking[]> {
    try {
      const records = await this.getClient().overbooking.findMany({
        select: overbookingSelect,
        orderBy: [{ scheduledAt: "asc" }, { decidedAt: "asc" }, { id: "asc" }],
      });
      return records.map(mapRecordToOverbooking);
    } catch (error) {
      throw describeDatabaseError("Falha ao listar encaixes", error);
    }
  }

  async saveAcceptance({
    appointment,
    candidate,
    overbooking,
  }: CreateEncaixeResult): Promise<AcceptedOverbooking> {
    try {
      const record = await this.getClient().$transaction(async (tx) => {
        await tx.appointment.create({ data: toAppointmentCreateData(appointment) });

        const { count } = await tx.waitlistEntry.updateMany({
          where: { id: candidate.id, status: "aguardando" },
          data: { status: candidate.status },
        });
        if (count === 0) throw new CandidateTakenError();

        return tx.overbooking.create({ data: toCreateData(overbooking), select: overbookingSelect });
      });
      return expectDecision(mapRecordToOverbooking(record), "aceita");
    } catch (error) {
      if (error instanceof CandidateTakenError || isUniqueConstraintError(error)) {
        throw new OverbookingConflictError(overbooking.id, { cause: error });
      }
      throw describeDatabaseError("Falha ao registrar encaixe", error);
    }
  }

  async saveRefusal(refusal: RefusedOverbooking): Promise<RefusedOverbooking> {
    try {
      const record = await this.getClient().overbooking.create({
        data: toCreateData(refusal),
        select: overbookingSelect,
      });
      return expectDecision(mapRecordToOverbooking(record), "recusada");
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new OverbookingConflictError(refusal.id, { cause: error });
      }
      throw describeDatabaseError("Falha ao registrar recusa de encaixe", error);
    }
  }
}
