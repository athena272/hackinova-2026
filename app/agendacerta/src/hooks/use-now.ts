"use client";

import { useEffect, useState } from "react";

/** Relógio em milissegundos que avança a cada `intervalMs`, para contagens regressivas. */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return now;
}
