"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type AsyncResourceState<T> =
  | { status: "loading" }
  | { status: "ready"; data: T }
  | { status: "error"; message: string };

/**
 * Carrega um recurso ao montar e expõe `reload`. Só a chamada mais recente
 * atualiza o estado, então uma resposta atrasada não sobrescreve a nova.
 * `load` precisa ser estável (função de módulo ou memorizada).
 */
export function useAsyncResource<T>(load: () => Promise<T>) {
  const [state, setState] = useState<AsyncResourceState<T>>({ status: "loading" });
  const latestRequest = useRef(0);

  const reload = useCallback(async () => {
    const requestId = ++latestRequest.current;
    setState({ status: "loading" });
    try {
      const data = await load();
      if (requestId === latestRequest.current) {
        setState({ status: "ready", data });
      }
    } catch (err) {
      if (requestId === latestRequest.current) {
        setState({
          status: "error",
          message: err instanceof Error ? err.message : "Erro inesperado.",
        });
      }
    }
  }, [load]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { state, reload };
}
