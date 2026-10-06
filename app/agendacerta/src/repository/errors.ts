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

export class WaitlistNotFoundError extends Error {
  constructor(id: string) {
    super(`Candidato da lista de espera não encontrado: ${id}`);
    this.name = "WaitlistNotFoundError";
  }
}
