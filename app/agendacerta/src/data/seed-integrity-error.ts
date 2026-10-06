/** Seed JSON inconsistente (referência quebrada ou valor fora do domínio). */
export class SeedIntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SeedIntegrityError";
  }
}
