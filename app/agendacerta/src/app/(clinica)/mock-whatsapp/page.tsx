"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ClipboardList, CopyX, Megaphone, MessageCircle } from "lucide-react";
import type { Appointment } from "@/domain/appointment";
import type { DuplicateCheckResolution } from "@/domain/duplicate-booking";
import { MockDuplicateBookingThread } from "@/components/MockDuplicateBookingThread";
import { MockPreparationChecklist } from "@/components/MockPreparationChecklist";
import { MockSlotOfferThread } from "@/components/MockSlotOfferThread";
import { MockWhatsAppThread } from "@/components/MockWhatsAppThread";
import { useDuplicateBookings } from "@/hooks/use-duplicate-bookings";
import { useExamPreparations } from "@/hooks/use-exam-preparations";
import { type SlotOfferResponseResult, useSlotOffers } from "@/hooks/use-slot-offers";
import { buildLoginHref } from "@/lib/auth/redirect";
import { readResponseJson } from "@/lib/http";

type MockTab = "confirmacao" | "preparo" | "ofertas" | "duplicidade";

export default function MockWhatsAppPage() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<MockTab>("confirmacao");
  const { state: preparations, reload: reloadPreparations } = useExamPreparations();
  const {
    state: slotOffers,
    reload: reloadSlotOffers,
    refresh: refreshSlotOffers,
  } = useSlotOffers();
  const {
    state: duplicates,
    reload: reloadDuplicates,
    refresh: refreshDuplicates,
  } = useDuplicateBookings();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/appointments", { cache: "no-store" });
      if (response.status === 401) {
        setError("Sessão expirada. Redirecionando para o login…");
        router.replace(buildLoginHref("/mock-whatsapp"));
        return;
      }
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
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  function handleUpdated(updated: Appointment) {
    setAppointments((current) =>
      current.map((item) => (item.id === updated.id ? updated : item)),
    );
  }

  function handleOfferResponded(result: SlotOfferResponseResult) {
    if (result.appointment) handleUpdated(result.appointment);
    void refreshSlotOffers();
  }

  function handleDuplicateChosen(result: DuplicateCheckResolution) {
    const changed = new Map(
      [result.kept, ...result.released].map((item) => [item.id, item]),
    );
    setAppointments((current) => current.map((item) => changed.get(item.id) ?? item));
    void refreshDuplicates();
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
        Simula as mensagens e as respostas do paciente. Cada resposta muda o
        agendamento na API (memória ou Supabase). Abra o painel para ver o resultado.
      </p>
      <div className="wa-tabs" role="tablist" aria-label="Tipo de mensagem">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "confirmacao"}
          onClick={() => setTab("confirmacao")}
        >
          <MessageCircle size={15} aria-hidden />
          Confirmação de presença
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "preparo"}
          onClick={() => setTab("preparo")}
        >
          <ClipboardList size={15} aria-hidden />
          Checklist de preparo
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "ofertas"}
          onClick={() => {
            setTab("ofertas");
            void refreshSlotOffers();
          }}
        >
          <Megaphone size={15} aria-hidden />
          Ofertas de vaga
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "duplicidade"}
          onClick={() => {
            setTab("duplicidade");
            void refreshDuplicates();
          }}
        >
          <CopyX size={15} aria-hidden />
          Confirmação reforçada
        </button>
      </div>
      {loading ? <p className="muted">Carregando…</p> : null}
      {error ? <p className="error">{error}</p> : null}
      {!loading && !error && tab === "confirmacao" ? (
        <MockWhatsAppThread
          appointments={appointments}
          onConfirmed={handleUpdated}
        />
      ) : null}
      {!loading && !error && tab === "preparo" ? (
        <MockPreparationChecklist
          appointments={appointments}
          preparations={preparations}
          onRetryPreparations={() => void reloadPreparations()}
          onAnswered={handleUpdated}
        />
      ) : null}
      {!loading && !error && tab === "ofertas" ? (
        <MockSlotOfferThread
          offers={slotOffers}
          appointments={appointments}
          onRetry={() => void reloadSlotOffers()}
          onRefresh={() => void refreshSlotOffers()}
          onResponded={handleOfferResponded}
        />
      ) : null}
      {!loading && !error && tab === "duplicidade" ? (
        <MockDuplicateBookingThread
          duplicates={duplicates}
          onRetry={() => void reloadDuplicates()}
          onRefresh={() => void refreshDuplicates()}
          onChosen={handleDuplicateChosen}
        />
      ) : null}
    </motion.main>
  );
}
