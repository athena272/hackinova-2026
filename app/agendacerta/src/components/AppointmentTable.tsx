import type { Appointment } from "@/domain/appointment";
import { isSlotReusable } from "@/domain/appointment";
import { StatusBadge } from "./StatusBadge";

type AppointmentTableProps = {
  appointments: Appointment[];
};

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export function AppointmentTable({ appointments }: AppointmentTableProps) {
  if (appointments.length === 0) {
    return <p className="muted">Nenhum agendamento encontrado.</p>;
  }

  return (
    <div className="table-wrap">
      <table className="appointments">
        <thead>
          <tr>
            <th>Paciente</th>
            <th>Especialidade</th>
            <th>Data / hora</th>
            <th>Telefone</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {appointments.map((appointment) => (
            <tr key={appointment.id}>
              <td>{appointment.patientName}</td>
              <td>{appointment.specialty}</td>
              <td>{formatDateTime(appointment.scheduledAt)}</td>
              <td>{appointment.phoneMasked}</td>
              <td>
                <StatusBadge status={appointment.status} />
                {isSlotReusable(appointment.status) ? (
                  <div className="reusable">Vaga reaproveitável</div>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
