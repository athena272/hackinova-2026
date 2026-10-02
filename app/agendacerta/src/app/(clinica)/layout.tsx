import { Suspense, type ReactNode } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { resolveClinicSession } from "@/lib/auth/require-session";
import { LOGIN_PATH } from "@/lib/auth/redirect";

type Props = { children: ReactNode };

async function ClinicSessionGate({ children }: Props) {
  const resolution = await resolveClinicSession(await headers());

  if (resolution.status === "anonymous") {
    redirect(LOGIN_PATH);
  }
  if (resolution.status === "unavailable") {
    redirect(`${LOGIN_PATH}?motivo=indisponivel`);
  }

  return children;
}

function AccessCheckFallback() {
  return (
    <main className="card" aria-busy="true">
      <p className="muted" role="status">
        Verificando acesso…
      </p>
    </main>
  );
}

/** Área restrita da clínica: painel e mock WhatsApp exigem sessão válida. */
export default function ClinicaLayout({ children }: Props) {
  return (
    <Suspense fallback={<AccessCheckFallback />}>
      <ClinicSessionGate>{children}</ClinicSessionGate>
    </Suspense>
  );
}
