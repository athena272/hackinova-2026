import type { AppointmentStatus } from "@/domain/appointment";
import {
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  RefreshCcw,
  UserCheck,
  UserX,
  type LucideIcon,
} from "lucide-react";

const LABELS: Record<AppointmentStatus, string> = {
  pendente: "Pendente",
  confirmado: "Confirmado",
  liberado: "Liberado",
  remarcacao_solicitada: "Remarcação",
  compareceu: "Compareceu",
  faltou: "Faltou",
};

const ICONS: Record<AppointmentStatus, LucideIcon> = {
  pendente: CalendarClock,
  confirmado: CheckCircle2,
  liberado: CircleAlert,
  remarcacao_solicitada: RefreshCcw,
  compareceu: UserCheck,
  faltou: UserX,
};

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
