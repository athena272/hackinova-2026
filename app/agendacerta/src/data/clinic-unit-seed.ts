import clinicUnitSeedData from "../../data/clinic-units.seed.json";
import type { ClinicUnit } from "@/domain/appointment";
import { SeedIntegrityError } from "./seed-integrity-error";

/** Unidade como está na tabela clinic_units (o agendamento só usa id e nome). */
export type ClinicUnitSeed = ClinicUnit & { neighborhoodId: string | null };

export function loadClinicUnitSeed(): ClinicUnitSeed[] {
  return clinicUnitSeedData.map((item) => ({ ...item }));
}

/** Busca unidade do seed por id; falha cedo se a referência estiver quebrada. */
export function createSeedClinicUnitLookup(): (unitId: string | null) => ClinicUnit | null {
  const units = new Map(loadClinicUnitSeed().map((unit) => [unit.id, unit]));

  return (unitId) => {
    if (unitId === null) return null;
    const unit = units.get(unitId);
    if (!unit) {
      throw new SeedIntegrityError(
        `Unidade "${unitId}" não existe em clinic-units.seed.json.`,
      );
    }
    return { id: unit.id, name: unit.name };
  };
}
