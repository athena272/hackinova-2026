"use client";

import { useState } from "react";
import { Users } from "lucide-react";
import type { Appointment } from "@/domain/appointment";
import type { WaitlistEntry } from "@/domain/waitlist";
import { readResponseJson } from "@/lib/http";

type ReusableSlotActionsProps = {
  appointment: Appointment;
  onOffered: () => void;
};

export function ReusableSlotActions({
  appointment,
  onOffered,
}: ReusableSlotActionsProps) {
  const [open, setOpen] = useState(false);
  const [candidates, setCandidates] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [offeringId, setOfferingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadCandidates() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/waitlist?specialty=${encodeURIComponent(appointment.specialty)}`,
        { cache: "no-store" },
      );
      const payload = await readResponseJson<{
        entries?: WaitlistEntry[];
        error?: string;
      }>(response);
      if (!response.ok || !payload.entries) {
        throw new Error(payload.error ?? "Falha ao carregar lista de espera.");
      }
      setCandidates(payload.entries.slice(0, 2));
      setOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }

  async function offerTo(waitlistId: string) {
    setOfferingId(waitlistId);
    setError(null);
    try {
      const response = await fetch(
        `/api/appointments/${appointment.id}/offer`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ waitlistId }),
        },
      );
      const payload = await readResponseJson<{ error?: string }>(response);
      if (!response.ok) {
        throw new Error(payload.error ?? "Falha ao oferecer vaga.");
      }
      setOpen(false);
      setCandidates([]);
      onOffered();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setOfferingId(null);
    }
  }

  return (
    <div className="offer-slot">
      {!open ? (
        <button
          type="button"
          className="offer-slot-trigger"
          onClick={() => void loadCandidates()}
          disabled={loading}
        >
          <Users size={12} aria-hidden />
          {loading ? "Buscando…" : "Oferecer vaga"}
        </button>
      ) : null}

      {open ? (
        <div className="offer-slot-panel">
          {candidates.length === 0 ? (
            <p className="muted">Nenhum candidato aguardando nesta especialidade.</p>
          ) : (
            <ul className="offer-slot-list">
              {candidates.map((candidate) => (
                <li key={candidate.id}>
                  <div>
                    <strong>{candidate.patientName}</strong>
                    <span className="muted"> · {candidate.phoneMasked}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => void offerTo(candidate.id)}
                    disabled={offeringId !== null}
                  >
                    {offeringId === candidate.id ? "Oferecendo…" : "Escolher"}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            className="offer-slot-cancel"
            onClick={() => {
              setOpen(false);
              setError(null);
            }}
          >
            Fechar
          </button>
        </div>
      ) : null}

      {error ? <p className="error offer-slot-error">{error}</p> : null}
    </div>
  );
}
