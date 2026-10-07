export class AppointmentNotFoundError extends Error {
  constructor(id: string) {
    super(`Agendamento não encontrado: ${id}`);
    this.name = "AppointmentNotFoundError";
  }
}

export class SlotOfferNotFoundError extends Error {
  constructor(id: string) {
    super(`Oferta de vaga não encontrada: ${id}`);
    this.name = "SlotOfferNotFoundError";
  }
}

/** A vaga ou o candidato já tem oferta em aberto (índice único parcial do banco). */
export class SlotOfferConflictError extends Error {
  constructor(offerId: string, options?: { cause?: unknown }) {
    super(
      `Não foi possível abrir a oferta "${offerId}": a vaga ou o candidato já tem oferta aguardando resposta.`,
      options,
    );
    this.name = "SlotOfferConflictError";
  }
}

/**
 * Outra decisão chegou antes: o bloco já tem o encaixe de mesmo número ou já
 * foi recusado (índices únicos parciais), ou o candidato acabou de ser atribuído.
 */
export class OverbookingConflictError extends Error {
  constructor(overbookingId: string, options?: { cause?: unknown }) {
    super(
      `Não foi possível registrar a decisão "${overbookingId}": este horário acabou de receber outra decisão.`,
      options,
    );
    this.name = "OverbookingConflictError";
  }
}

export class WaitlistNotFoundError extends Error {
  constructor(id: string) {
    super(`Candidato da lista de espera não encontrado: ${id}`);
    this.name = "WaitlistNotFoundError";
  }
}
