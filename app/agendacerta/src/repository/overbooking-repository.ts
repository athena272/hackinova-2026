import type {
  AcceptedOverbooking,
  CreateEncaixeResult,
  Overbooking,
  RefusedOverbooking,
} from "@/domain/overbooking";

export interface OverbookingRepository {
  /** Todas as decisões, em ordem de horário do bloco. */
  list(): Promise<Overbooking[]>;
  /**
   * Grava, de uma vez, o agendamento encaixe, o candidato atribuído e a
   * decisão. Lança OverbookingConflictError se outra decisão chegou antes ou
   * se o candidato já não está aguardando; nesse caso nada fica gravado.
   */
  saveAcceptance(encaixe: CreateEncaixeResult): Promise<AcceptedOverbooking>;
  /** Lança OverbookingConflictError se o bloco já foi recusado. */
  saveRefusal(refusal: RefusedOverbooking): Promise<RefusedOverbooking>;
}
