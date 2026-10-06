/**
 * Regras ajustáveis da oferta em cascata, num único lugar (como os pesos do score).
 * Os testes leem os limites daqui.
 */

/** Faixas de distância até a clínica: dentro da mesma faixa, quem espera há mais tempo vem antes. */
export const DISTANCE_BANDS = {
  pertoAteKm: 5,
  medioAteKm: 10,
} as const;

/** Prazos de resposta que a clínica pode escolher, em minutos (mesma lista da check constraint). */
export const SLOT_OFFER_TIMEOUT_OPTIONS = [2, 5, 15, 30] as const;

export type SlotOfferTimeout = (typeof SLOT_OFFER_TIMEOUT_OPTIONS)[number];

export const DEFAULT_SLOT_OFFER_TIMEOUT: SlotOfferTimeout = 15;

export const SLOT_OFFER_RESPONSES = ["aceitar", "recusar"] as const;

export type SlotOfferResponse = (typeof SLOT_OFFER_RESPONSES)[number];

export function isSlotOfferResponse(value: unknown): value is SlotOfferResponse {
  return SLOT_OFFER_RESPONSES.some((option) => option === value);
}

export function isSlotOfferTimeout(value: unknown): value is SlotOfferTimeout {
  return SLOT_OFFER_TIMEOUT_OPTIONS.some((option) => option === value);
}
