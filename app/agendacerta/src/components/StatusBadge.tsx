import type { AppointmentStatus } from "@/domain/appointment";

const LABELS: Record<AppointmentStatus, string> = {
  pendente: "Pendente",
  confirmado: "Confirmado",
  liberado: "Liberado",
  remarcacao_solicitada: "Remarcação",
};

type StatusBadgeProps = {
  status: AppointmentStatus;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={`badge badge-${status}`}>{LABELS[status]}</span>
  );
}
