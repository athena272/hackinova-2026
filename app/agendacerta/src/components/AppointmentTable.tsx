import type { Appointment } from "@/domain/appointment";
import { isSlotReusable } from "@/domain/appointment";
import { Recycle } from "lucide-react";
import { ReusableSlotActions } from "./ReusableSlotActions";
import { StatusBadge } from "./StatusBadge";

type AppointmentTableProps = {
  appointments: Appointment[];
  onOffered?: () => void;
};

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export function AppointmentTable({
  appointments,
  onOffered,
}: AppointmentTableProps) {
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
              <td>
                <strong>{appointment.patientName}</strong>
              </td>
              <td>{appointment.specialty}</td>
              <td>{formatDateTime(appointment.scheduledAt)}</td>
              <td>{appointment.phoneMasked}</td>
              <td>
                <StatusBadge status={appointment.status} />
                {isSlotReusable(appointment.status) ? (
                  <div className="reusable">
                    <div className="reusable-label">
                      <Recycle size={12} aria-hidden />
                      Vaga reaproveitável
                    </div>
                    {onOffered ? (
                      <ReusableSlotActions
                        appointment={appointment}
                        onOffered={onOffered}
                      />
                    ) : null}
                  </div>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
