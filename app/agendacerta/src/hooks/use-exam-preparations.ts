"use client";

import type { ExamPreparation } from "@/domain/exam-preparation";
import { type Fetcher, getApiJson } from "@/lib/http";
import { type AsyncResourceState, useAsyncResource } from "./use-async-resource";

export type ExamPreparationsState = AsyncResourceState<ExamPreparation[]>;

const FALLBACK_ERROR = "Falha ao carregar o cadastro de preparo.";

export async function fetchExamPreparations(
  fetcher: Fetcher = fetch,
): Promise<ExamPreparation[]> {
  const { preparations } = await getApiJson<{ preparations?: ExamPreparation[] }>(
    "/api/exam-preparations",
    FALLBACK_ERROR,
    fetcher,
  );
  if (!preparations) {
    throw new Error(FALLBACK_ERROR);
  }
  return preparations;
}

const loadExamPreparations = () => fetchExamPreparations();

/** Cadastro de preparo por exame, usado pelo checklist do mock e pelo painel. */
export function useExamPreparations() {
  return useAsyncResource(loadExamPreparations);
}
