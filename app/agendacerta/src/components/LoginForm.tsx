"use client";

import { useId, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, LockKeyhole, LogIn } from "lucide-react";
import { PasswordInput } from "@/components/PasswordInput";
import { authClient } from "@/lib/auth/client";
import { describeSignInError, SIGN_IN_MESSAGES } from "@/lib/auth/sign-in-error";

type LoginFormProps = {
  nextPath: string;
  authUnavailable: boolean;
};

export function LoginForm({ nextPath, authUnavailable }: LoginFormProps) {
  const router = useRouter();
  const passwordId = useId();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      const { error: signInError } = await authClient.signIn.email({
        email: email.trim(),
        password,
      });
      if (signInError) {
        setError(describeSignInError(signInError));
        setSubmitting(false);
        return;
      }
      router.replace(nextPath);
      router.refresh();
    } catch {
      setError(SIGN_IN_MESSAGES.network);
      setSubmitting(false);
    }
  }

  return (
    <motion.main
      className="card auth-card"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="page-title-row" style={{ marginBottom: 8 }}>
        <span className="page-icon" aria-hidden>
          <LockKeyhole size={22} />
        </span>
        <h1>Acesso da clínica</h1>
      </div>
      <p className="lead">
        Entre com o e-mail e a senha da clínica para abrir o painel.
      </p>

      {authUnavailable ? (
        <p className="notice" role="status">
          {SIGN_IN_MESSAGES.unavailable}
        </p>
      ) : null}

      <form className="auth-form" onSubmit={handleSubmit} aria-busy={submitting}>
        <label className="form-field">
          <span>E-mail</span>
          <input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={submitting}
            required
          />
        </label>
        <div className="form-field">
          <label htmlFor={passwordId}>Senha</label>
          <PasswordInput
            id={passwordId}
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={submitting}
            required
          />
        </div>

        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}

        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 size={16} className="spin" aria-hidden />
              Entrando…
            </>
          ) : (
            <>
              <LogIn size={16} aria-hidden />
              Entrar
            </>
          )}
        </button>
      </form>
    </motion.main>
  );
}
