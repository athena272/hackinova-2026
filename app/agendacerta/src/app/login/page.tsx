import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { resolveClinicSession } from "@/lib/auth/require-session";
import { sanitizeNextPath } from "@/lib/auth/redirect";

type LoginPageProps = {
  searchParams: Promise<{ next?: string; motivo?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next, motivo } = await searchParams;
  const nextPath = sanitizeNextPath(next);

  const resolution = await resolveClinicSession(await headers());
  if (resolution.status === "authenticated") {
    redirect(nextPath);
  }

  return (
    <LoginForm
      nextPath={nextPath}
      authUnavailable={
        motivo === "indisponivel" || resolution.status === "unavailable"
      }
    />
  );
}
