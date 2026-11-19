import { requireAdmin } from "@/lib/auth";
import { getResource } from "@/lib/admin/resources";
import { getAdminLookups, getAdminRows } from "@/lib/services/admin";
import {
  detectPhase6Capabilities,
  detectPushCapabilities,
} from "@/lib/services/capabilities";
import { CrudManager } from "./CrudManager";
import { SectionHeader } from "./ui";

/** Pagina CRUD generica: tutti i dati arrivano da Supabase, nulla è simulato. */
export async function AdminResourcePage({
  resourceKeys,
  title,
  description,
}: {
  resourceKeys: string[];
  title?: string;
  description?: string;
}) {
  await requireAdmin();

  const capabilities = await detectPhase6Capabilities();
  const needsPush = resourceKeys.includes("scheduled_notifications");
  const push = needsPush ? await detectPushCapabilities() : null;
  const phase7Ready = push?.ready ?? false;

  const resources = resourceKeys.map((key) =>
    getResource(key, { phase6: capabilities.ready, phase7: phase7Ready })
  );
  if (resources.some((resource) => resource === null)) {
    throw new Error("Risorsa amministrativa non valida.");
  }

  const needsMigration = resourceKeys.includes("memory_entries") && !capabilities.ready;
  const needsPushMigration = needsPush && !phase7Ready;

  const [lookups, ...rowSets] = await Promise.all([
    getAdminLookups(),
    ...resourceKeys.map((key) => getAdminRows(key)),
  ]);

  return (
    <div className="space-y-10">
      <SectionHeader
        title={title ?? (resources.length === 1 ? resources[0]!.label : "Gestione")}
        description={description}
      />

      {needsMigration && (
        <div
          role="status"
          className="rounded-2xl border border-ice-300/35 bg-ice-900/40 px-4 py-3 text-sm text-ice-200"
        >
          <strong className="font-semibold">Funzionalità non ancora attiva.</strong>{" "}
          Esegui la migrazione{" "}
          <code className="rounded bg-pine-950/60 px-1">
            006_memories_and_collections.sql
          </code>{" "}
          nel SQL Editor di Supabase per poter configurare i ricordi speciali.
        </div>
      )}

      {needsPushMigration && (
        <div
          role="status"
          className="rounded-2xl border border-ice-300/35 bg-ice-900/40 px-4 py-3 text-sm text-ice-200"
        >
          <strong className="font-semibold">Invio non ancora attivo.</strong>{" "}
          Esegui la migrazione{" "}
          <code className="rounded bg-pine-950/60 px-1">
            007_push_notifications.sql
          </code>{" "}
          nel SQL Editor di Supabase per configurare tipologia, destinatari,
          stato e log delle notifiche.
        </div>
      )}

      {resources.map((resource, index) => (
        <section key={resource!.key} className="space-y-4">
          {resources.length > 1 && (
            <div>
              <h2 className="font-display text-xl font-semibold text-cream-50">
                {resource!.label}
              </h2>
              <p className="mt-1 text-sm text-cream-200/60">{resource!.description}</p>
            </div>
          )}
          <CrudManager
            resourceKey={resource!.key}
            rows={rowSets[index]}
            lookups={lookups}
            createLabel={`Nuovo: ${resource!.label}`}
            phase6Ready={capabilities.ready}
            phase7Ready={phase7Ready}
          />
        </section>
      ))}
    </div>
  );
}
