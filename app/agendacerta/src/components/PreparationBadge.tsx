import { ClipboardCheck, ClipboardList, ClipboardX, type LucideIcon } from "lucide-react";
import type { PreparationStatus } from "@/domain/exam-preparation";

const LABELS: Record<PreparationStatus, string> = {
  pendente: "Preparo pendente",
  ok: "Preparo ok",
  nao_cumprido: "Preparo não cumprido",
};

const ICONS: Record<PreparationStatus, LucideIcon> = {
  pendente: ClipboardList,
  ok: ClipboardCheck,
  nao_cumprido: ClipboardX,
};

type PreparationBadgeProps = {
  status: PreparationStatus;
};

export function PreparationBadge({ status }: PreparationBadgeProps) {
  const Icon = ICONS[status];
  return (
    <span className={`badge badge-prep-${status}`}>
      <Icon size={13} strokeWidth={2.4} aria-hidden />
      {LABELS[status]}
    </span>
  );
}
