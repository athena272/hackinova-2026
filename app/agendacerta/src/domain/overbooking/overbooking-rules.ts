import type { RiskBand } from "../no-show-risk/types";

/**
 * Regras ajustáveis do encaixe extra, num único lugar (como os pesos do score).
 * Os testes leem os limites daqui.
 */

/** Quantos encaixes aceitos um bloco (especialidade + horário) pode ter. */
export const MAX_OVERBOOKINGS_PER_BLOCK = 1;

/** Só blocos com um agendamento nesta faixa de risco recebem sugestão. */
export const OVERBOOKING_RISK_BAND: RiskBand = "alto";

export const OVERBOOKING_DECISIONS = ["aceitar", "recusar"] as const;

export type OverbookingDecisionInput = (typeof OVERBOOKING_DECISIONS)[number];

export function isOverbookingDecisionInput(value: unknown): value is OverbookingDecisionInput {
  return OVERBOOKING_DECISIONS.some((option) => option === value);
}
