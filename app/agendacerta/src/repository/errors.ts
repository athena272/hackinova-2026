export class AppointmentNotFoundError extends Error {
  constructor(id: string) {
    super(`Agendamento não encontrado: ${id}`);
    this.name = "AppointmentNotFoundError";
  }
}

export class WaitlistNotFoundError extends Error {
  constructor(id: string) {
    super(`Candidato da lista de espera não encontrado: ${id}`);
    this.name = "WaitlistNotFoundError";
  }
}
