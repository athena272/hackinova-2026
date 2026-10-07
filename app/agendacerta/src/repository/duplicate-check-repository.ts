import type {
  DuplicateCheck,
  DuplicateCheckResolution,
  OpenDuplicateCheck,
  ResolvedDuplicateCheck,
} from "@/domain/duplicate-booking";

export interface DuplicateCheckRepository {
  /** Em ordem de envio. */
  list(): Promise<DuplicateCheck[]>;
  getById(id: string): Promise<DuplicateCheck | null>;
  /** Grava a confirmação montada por startDuplicateCheck, com os horários perguntados. */
  create(check: OpenDuplicateCheck): Promise<OpenDuplicateCheck>;
  /**
   * Grava, de uma vez, a escolha montada por resolveDuplicateCheck: confirmação
   * resolvida, horário mantido confirmado e os demais liberados.
   */
  resolve(resolution: DuplicateCheckResolution): Promise<ResolvedDuplicateCheck>;
}
