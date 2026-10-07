import type { Appointment } from "../appointment";
import type { Overbooking, SlotBlock } from "./types";

type BlockSource = Pick<Appointment, "specialty" | "scheduledAt">;

/**
 * O seed grava horários com -03:00 e o banco devolve em UTC; a chave usa o
 * instante para que "09:00-03:00" e "12:00Z" caiam no mesmo bloco.
 */
export function blockKey(specialty: string, scheduledAt: string): string {
  return `${specialty}|${Date.parse(scheduledAt)}`;
}

export function slotBlockOf(source: BlockSource): SlotBlock {
  return {
    key: blockKey(source.specialty, source.scheduledAt),
    specialty: source.specialty,
    scheduledAt: source.scheduledAt,
  };
}

export type BlockGroup<T> = { block: SlotBlock; items: T[] };

/** Agrupa mantendo a ordem de chegada; o bloco usa o horário do primeiro item. */
export function groupByBlock<T extends BlockSource>(items: readonly T[]): BlockGroup<T>[] {
  const groups = new Map<string, BlockGroup<T>>();
  for (const item of items) {
    const block = slotBlockOf(item);
    const group = groups.get(block.key);
    if (group) {
      group.items.push(item);
    } else {
      groups.set(block.key, { block, items: [item] });
    }
  }
  return [...groups.values()];
}

export function overbookingsOfBlock(
  overbookings: readonly Overbooking[],
  block: SlotBlock,
): Overbooking[] {
  return overbookings.filter(
    (overbooking) => blockKey(overbooking.specialty, overbooking.scheduledAt) === block.key,
  );
}

/** Ids dos agendamentos criados como encaixe. */
export function encaixeAppointmentIds(overbookings: readonly Overbooking[]): Set<string> {
  const ids = new Set<string>();
  for (const overbooking of overbookings) {
    if (overbooking.decision === "aceita") ids.add(overbooking.encaixeAppointmentId);
  }
  return ids;
}
