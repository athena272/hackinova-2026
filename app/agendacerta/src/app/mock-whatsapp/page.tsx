"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";
import type { Appointment } from "@/domain/appointment";
import { MockWhatsAppThread } from "@/components/MockWhatsAppThread";
import { readResponseJson } from "@/lib/http";

export default function MockWhatsAppPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/appointments", { cache: "no-store" });
      const payload = await readResponseJson<{
        appointments?: Appointment[];
        error?: string;
      }>(response);
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

  function handleConfirmed(updated: Appointment) {
    setAppointments((current) =>
      current.map((item) => (item.id === updated.id ? updated : item)),
    );
  }

  return (
    <motion.main
      className="card"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="page-title-row" style={{ marginBottom: 8 }}>
        <span className="page-icon" aria-hidden>
          <MessageCircle size={22} />
        </span>
        <h1>Mock WhatsApp</h1>
      </div>
      <p className="lead">
        Simula o lembrete e a resposta do paciente. Ao confirmar, o status muda
        na API em memória. Abra o painel para ver o resultado.
      </p>
      {loading ? <p className="muted">Carregando…</p> : null}
      {error ? <p className="error">{error}</p> : null}
      {!loading && !error ? (
        <MockWhatsAppThread
          appointments={appointments}
          onConfirmed={handleConfirmed}
        />
      ) : null}
    </motion.main>
  );
}
