import type { UserRole } from "@/types/auth";

/**
 * Risoluzione del ruolo applicativo partendo dalla riga di `public.users`.
 *
 * Estratta da `auth.ts` (che è `server-only`) per poter essere testata in
 * Vitest. REGOLA DI SICUREZZA: in caso di errore o dato mancante NON si
 * restituisce un ruolo di default: si solleva un errore esplicito, così un
 * problema di RLS o di integrità dei dati non viene mascherato da un
 * silenzioso "user".
 */

export interface RoleRow {
  id: string;
  role: string;
}

export interface QueryErrorLike {
  message: string;
  code?: string | number | null;
}

export function resolveAppRole(
  userId: string,
  row: RoleRow | null,
  error?: QueryErrorLike | null
): UserRole {
  if (error) {
    const code = error.code ? ` (codice ${error.code})` : "";
    throw new Error(
      `Impossibile leggere il ruolo di ${userId} da public.users${code}: ${error.message}. ` +
        `Verificare le policy RLS della tabella users (errore 42P17 = auto-join ricorsivo: ` +
        `applicare supabase/migrations/003_fix_admin_role_rls.sql in SQL Editor).`
    );
  }

  if (!row) {
    throw new Error(
      `Nessun record in public.users per l'utente autenticato ${userId}. ` +
        `L'account non è stato sincronizzato con il trigger on_auth_user_created.`
    );
  }

  if (row.id !== userId) {
    throw new Error(
      `Il record public.users restituito (${row.id}) non corrisponde all'utente autenticato (${userId}).`
    );
  }

  if (row.role !== "admin" && row.role !== "user") {
    throw new Error(
      `Ruolo non valido per ${userId}: ${String(row.role)}. Valori ammessi: admin, user.`
    );
  }

  return row.role;
}
