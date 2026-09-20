export class AppointmentNotFoundError extends Error {
  constructor(id: string) {
    super(`Agendamento não encontrado: ${id}`);
    this.name = "AppointmentNotFoundError";
  }
}
