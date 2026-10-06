"use client";

import { useEffect, useRef } from "react";
import { Timer } from "lucide-react";
import { useNow } from "@/hooks/use-now";
import { formatCountdown, remainingMs } from "@/lib/format";

type OfferCountdownProps = {
  expiresAt: string;
  /** Chamado uma vez quando o prazo zera, para buscar o repasse sem esperar a próxima consulta. */
  onExpire?: () => void;
};

export function OfferCountdown({ expiresAt, onExpire }: OfferCountdownProps) {
  const now = useNow();
  const left = remainingMs(expiresAt, now);
  const notified = useRef<string | null>(null);

  useEffect(() => {
    if (left > 0 || notified.current === expiresAt) return;
    notified.current = expiresAt;
    onExpire?.();
  }, [left, expiresAt, onExpire]);

  return (
    <span
      className={left > 0 ? "offer-countdown" : "offer-countdown offer-countdown-over"}
      role="timer"
      aria-live="off"
    >
      <Timer size={12} aria-hidden />
      {left > 0 ? formatCountdown(left) : "prazo encerrado"}
    </span>
  );
}
