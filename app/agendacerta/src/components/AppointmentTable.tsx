import type { Appointment } from "@/domain/appointment";
import { isSlotReusable } from "@/domain/appointment";
import { Recycle } from "lucide-react";
import type { PreparationStatus } from "@/domain/exam-preparation";
import type { SlotOfferCascade } from "@/domain/slot-offer";
import type { NoShowRisksState } from "@/hooks/use-no-show-risks";
import { formatDateTime } from "@/lib/format";
import { NoShowRiskCell } from "./NoShowRiskCell";
import { PreparationBadge } from "./PreparationBadge";
import { SlotOfferActions } from "./SlotOfferActions";
import { StatusBadge } from "./StatusBadge";

/** Quando informado, as vagas reaproveitáveis ganham a oferta em cascata. */
export type AppointmentTableSlotOffers = {
  cascadeByAppointment: ReadonlyMap<string, SlotOfferCascade>;
  loading: boolean;
  onChanged: () => void;
};

type AppointmentTableProps = {
  appointments: Appointment[];
  slotOffers?: AppointmentTableSlotOffers;
  emptyMessage?: string;
  /** Quando informado, mostra a coluna "Risco de falta". */
  risks?: NoShowRisksState;
  /** Status do preparo por agendamento; quem não aparece não tem preparo. */
  preparationStatusById?: ReadonlyMap<string, PreparationStatus>;
};

export function AppointmentTable({
  appointments,
  slotOffers,
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
                      {slotOffers ? (
                        <SlotOfferActions
                          appointment={appointment}
                          cascade={slotOffers.cascadeByAppointment.get(appointment.id)}
                          loading={slotOffers.loading}
                          onChanged={slotOffers.onChanged}
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
