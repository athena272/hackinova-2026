import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { assertServiceRoleKey } from "./service-role-key";

let adminClient: SupabaseClient | null = null;

export function hasSupabaseConfig(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  );
}

/** Client com service role: só em Route Handlers / servidor. */
export function getSupabaseAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !key) {
    throw new Error(
      "Supabase não configurado. Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (ex.: após `npx supabase start`).",
    );
  }

  assertServiceRoleKey(key);

  if (!adminClient) {
    adminClient = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return adminClient;
}

/** Apenas testes: limpa o singleton do client admin. */
export function resetSupabaseAdminForTests(): void {
  adminClient = null;
}
