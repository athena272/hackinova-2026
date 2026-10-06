"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type AsyncResourceState<T> =
  | { status: "loading" }
  | { status: "ready"; data: T }
  | { status: "error"; message: string };

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Erro inesperado.";
}

/**
 * Carrega um recurso ao montar e expõe `reload`. Só a chamada mais recente
 * atualiza o estado, então uma resposta atrasada não sobrescreve a nova.
 * `refresh` busca de novo sem tirar os dados da tela: liga `refreshing` e,
 * se falhar com dados já carregados, guarda o erro em `refreshError`.
 * `load` precisa ser estável (função de módulo ou memorizada).
 */
export function useAsyncResource<T>(load: () => Promise<T>) {
  const [state, setState] = useState<AsyncResourceState<T>>({ status: "loading" });
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const latestRequest = useRef(0);
  const hasData = useRef(false);

  const fetchLatest = useCallback(
    async (keepDataOnError: boolean) => {
      const requestId = ++latestRequest.current;
      const isLatest = () => requestId === latestRequest.current;
      try {
        const data = await load();
        if (isLatest()) {
          hasData.current = true;
          setState({ status: "ready", data });
          setRefreshError(null);
        }
      } catch (err) {
        if (!isLatest()) return;
        if (keepDataOnError && hasData.current) {
          setRefreshError(errorMessage(err));
        } else {
          hasData.current = false;
          setState({ status: "error", message: errorMessage(err) });
        }
      } finally {
        if (isLatest()) setRefreshing(false);
      }
    },
    [load],
  );

  const reload = useCallback(async () => {
    hasData.current = false;
    setState({ status: "loading" });
    await fetchLatest(false);
  }, [fetchLatest]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await fetchLatest(true);
  }, [fetchLatest]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { state, reload, refresh, refreshing, refreshError };
}
