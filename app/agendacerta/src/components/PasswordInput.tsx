"use client";

import { useState, type ComponentProps } from "react";
import { Eye, EyeOff } from "lucide-react";

type PasswordInputProps = Omit<ComponentProps<"input">, "type">;

/** Campo de senha com botão para mostrar/ocultar o conteúdo. */
export function PasswordInput({ disabled, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="password-field">
      <input {...props} type={visible ? "text" : "password"} disabled={disabled} />
      <button
        type="button"
        className="password-toggle"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
        aria-pressed={visible}
        title={visible ? "Ocultar senha" : "Mostrar senha"}
        disabled={disabled}
      >
        {visible ? (
          <EyeOff size={18} strokeWidth={2} aria-hidden />
        ) : (
          <Eye size={18} strokeWidth={2} aria-hidden />
        )}
      </button>
    </div>
  );
}
