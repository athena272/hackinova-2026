"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, LogIn, LogOut, UserRound } from "lucide-react";
import { authClient } from "@/lib/auth/client";
import { LOGIN_PATH } from "@/lib/auth/redirect";

export function SessionMenu() {
  const router = useRouter();
  const { data, isPending } = authClient.useSession();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  async function handleSignOut() {
    setSigningOut(true);
    setSignOutError(null);
    try {
      const { error } = await authClient.signOut();
      if (error) throw new Error(error.message);
      router.replace(LOGIN_PATH);
      router.refresh();
    } catch {
      setSignOutError("Não foi possível sair. Tente novamente.");
      setSigningOut(false);
    }
  }

  if (isPending) {
    return <div className="session-menu" aria-hidden />;
  }

  if (!data) {
    return (
      <div className="session-menu">
        <Link href={LOGIN_PATH} className="session-link">
          <LogIn size={16} aria-hidden />
          Entrar
        </Link>
      </div>
    );
  }

  return (
    <div className="session-menu">
      <span className="session-user" title={data.user.email}>
        <UserRound size={16} aria-hidden />
        {data.user.email}
      </span>
      <button
        type="button"
        className="session-link"
        onClick={() => void handleSignOut()}
        disabled={signingOut}
      >
        {signingOut ? (
          <>
            <Loader2 size={16} className="spin" aria-hidden />
            Saindo…
          </>
        ) : (
          <>
            <LogOut size={16} aria-hidden />
            Sair
          </>
        )}
      </button>
      {signOutError ? (
        <span className="session-error" role="alert">
          {signOutError}
        </span>
      ) : null}
    </div>
  );
}
