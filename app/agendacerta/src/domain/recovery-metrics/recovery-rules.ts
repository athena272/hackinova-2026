import type { AveragePrices, RecoveryOrigin } from "./types";

/**
 * Preço médio usado no valor estimado recuperado, em reais. É uma hipótese da demo,
 * não tabela de convênio: a clínica real informaria os próprios valores.
 */
export const AVERAGE_PRICE_BRL: AveragePrices = {
  consulta: 200,
  exame: 150,
};

// Record força listar todas as origens; a ordem aqui é a ordem de exibição.
const ORIGINS: Record<RecoveryOrigin, true> = {
  leilao: true,
  preparo: true,
  booking_duplo: true,
  overbooking: true,
};

export const RECOVERY_ORIGINS = Object.keys(ORIGINS) as readonly RecoveryOrigin[];
