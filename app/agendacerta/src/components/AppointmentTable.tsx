import type { Appointment } from "@/domain/appointment";
import { isSlotReusable } from "@/domain/appointment";
import { Recycle } from "lucide-react";
import type { PreparationStatus } from "@/domain/exam-preparation";
import type { NoShowRisksState } from "@/hooks/use-no-show-risks";
import { formatDateTime } from "@/lib/format";
import { NoShowRiskCell } from "./NoShowRiskCell";
import { PreparationBadge } from "./PreparationBadge";
import { ReusableSlotActions } from "./ReusableSlotActions";
import { StatusBadge } from "./StatusBadge";

type AppointmentTableProps = {
  appointments: Appointment[];
  onOffered?: () => void;
  emptyMessage?: string;
  /** Quando informado, mostra a coluna "Risco de falta". */
  risks?: NoShowRisksState;
  /** Status do preparo por agendamento; quem não aparece não tem preparo. */
  preparationStatusById?: ReadonlyMap<string, PreparationStatus>;
};

export function AppointmentTable({
  appointments,
  onOffered,
  emptyMessage = "Nenhum agendamento encontrado.",
  risks,
  preparationStatusById,
}: AppointmentTableProps) {
  if (appointments.length === 0) {
    return <p className="muted">{emptyMessage}</p>;
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
            {risks ? <th>Risco de falta</th> : null}
          </tr>
        </thead>
        <tbody>
          {appointments.map((appointment) => {
            const preparationStatus = preparationStatusById?.get(appointment.id);
            return (
              <tr key={appointment.id}>
                <td>
                  <strong>{appointment.patientName}</strong>
                </td>
                <td>{appointment.specialty}</td>
                <td>{formatDateTime(appointment.scheduledAt)}</td>
                <td>{appointment.phoneMasked}</td>
                <td>
                  <StatusBadge status={appointment.status} />
                  {preparationStatus ? (
                    <div className="prep-badge-row">
                      <PreparationBadge status={preparationStatus} />
                    </div>
                  ) : null}
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
                {risks ? (
                  <td>
                    <NoShowRiskCell appointment={appointment} risks={risks} />
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
