export const LOGIN_PATH = "/login";
export const DEFAULT_AFTER_LOGIN_PATH = "/painel";

/**
 * Aceita só caminhos internos ("/painel"), evitando open redirect
 * para outro domínio ("//site.com", "https://...").
 */
export function sanitizeNextPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return DEFAULT_AFTER_LOGIN_PATH;
  }
  return value;
}

export function buildLoginHref(nextPath?: string): string {
  if (!nextPath) return LOGIN_PATH;
  return `${LOGIN_PATH}?next=${encodeURIComponent(sanitizeNextPath(nextPath))}`;
}
