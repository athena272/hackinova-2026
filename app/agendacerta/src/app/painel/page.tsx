"use client";

import { useCallback, useEffect, useState } from "react";
import type { Appointment } from "@/domain/appointment";
import { AppointmentTable } from "@/components/AppointmentTable";

export default function PainelPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/appointments", { cache: "no-store" });
      const payload = (await response.json()) as {
        appointments?: Appointment[];
        error?: string;
      };
      if (!response.ok || !payload.appointments) {
        throw new Error(payload.error ?? "Falha ao carregar agenda.");
      }
      setAppointments(payload.appointments);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <main className="card">
      <h1>Painel da clínica</h1>
      <p className="lead">
        Acompanhe confirmações e vagas que podem ser reaproveitadas. Os dados
        vêm do seed em memória (reiniciam ao reiniciar o servidor).
      </p>
      <div className="toolbar">
        <button type="button" onClick={() => void load()}>
          Atualizar
        </button>
      </div>
      {loading ? <p className="muted">Carregando…</p> : null}
      {error ? <p className="error">{error}</p> : null}
      {!loading && !error ? (
        <AppointmentTable appointments={appointments} />
      ) : null}
    </main>
  );
}
