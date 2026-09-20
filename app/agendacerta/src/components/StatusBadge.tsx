import type { AppointmentStatus } from "@/domain/appointment";
import {
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  RefreshCcw,
} from "lucide-react";

const LABELS: Record<AppointmentStatus, string> = {
  pendente: "Pendente",
  confirmado: "Confirmado",
  liberado: "Liberado",
  remarcacao_solicitada: "Remarcação",
};

const ICONS = {
  pendente: CalendarClock,
  confirmado: CheckCircle2,
  liberado: CircleAlert,
  remarcacao_solicitada: RefreshCcw,
} as const;

type StatusBadgeProps = {
  status: AppointmentStatus;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const Icon = ICONS[status];
  return (
    <span className={`badge badge-${status}`}>
      <Icon size={13} strokeWidth={2.4} aria-hidden />
      {LABELS[status]}
    </span>
  );
}
