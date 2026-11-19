"use client";

import { useState, useTransition } from "react";
import type { AdminUserRow } from "@/lib/services/admin";
import { setUserRole } from "@/lib/admin/special-actions";
import { EmptyState, Toast } from "./ui";

export function UsersManager({
  rows,
  currentUserId,
}: {
  rows: AdminUserRow[];
  currentUserId: string;
}) {
  const [pending, startTransition] = useTransition();
  const [roles, setRoles] = useState<Record<string, string>>(() =>
    Object.fromEntries(rows.map((row) => [row.id, row.role]))
  );
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);

  function save(userId: string) {
    const role = roles[userId] === "admin" ? "admin" : "user";
    startTransition(async () => {
      const result = await setUserRole(userId, role);
      setToast({
        message: result.ok ? "Ruolo aggiornato." : (result.error ?? "Errore."),
        tone: result.ok ? "success" : "error",
      });
      if (!result.ok) {
        setRoles((current) => ({
          ...current,
          [userId]: rows.find((row) => row.id === userId)?.role ?? "user",
        }));
      }
    });
  }

  if (rows.length === 0) return <EmptyState message="Nessun utente registrato." />;

  return (
    <div className="overflow-x-auto rounded-2xl border border-cream-300/15">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="bg-pine-900/70 text-[11px] uppercase tracking-wider text-cream-200/50">
          <tr>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">Registrato il</th>
            <th className="px-4 py-3">Ruolo</th>
            <th className="px-4 py-3">Giorni completati</th>
            <th className="px-4 py-3">Foto</th>
            <th className="px-4 py-3">Sfere</th>
            <th className="px-4 py-3 text-right">Azioni</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-cream-300/10">
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-cream-50/[0.03]">
              <td className="px-4 py-3 text-cream-50">
                {row.email}
                {row.id === currentUserId && (
                  <span className="ml-2 rounded-full bg-gold/15 px-2 py-0.5 text-[10px] text-gold-light">tu</span>
                )}
              </td>
              <td className="px-4 py-3 text-cream-200/60">
                {new Date(row.created_at).toLocaleDateString("it-IT", { timeZone: "Europe/Rome" })}
              </td>
              <td className="px-4 py-3">
                <select
                  value={roles[row.id] ?? "user"}
                  onChange={(event) =>
                    setRoles((current) => ({ ...current, [row.id]: event.target.value }))
                  }
                  className="rounded-md border border-cream-300/20 bg-pine-950 px-2 py-1 text-sm"
                >
                  <option value="user">user</option>
                  <option value="admin">admin</option>
                </select>
              </td>
              <td className="px-4 py-3">{row.openedDays}/24</td>
              <td className="px-4 py-3">{row.photos}</td>
              <td className="px-4 py-3">{row.spheres}</td>
              <td className="px-4 py-3 text-right">
                <button
                  type="button"
                  disabled={pending || roles[row.id] === row.role}
                  onClick={() => save(row.id)}
                  className="rounded-md bg-gold px-3 py-1.5 text-xs font-semibold text-pine-950 disabled:opacity-40"
                >
                  Salva ruolo
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {toast && <Toast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} />}
    </div>
  );
}
