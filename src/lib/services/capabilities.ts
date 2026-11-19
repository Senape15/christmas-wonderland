import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * Rilevamento della disponibilità della migrazione 006.
 *
 * La Fase 6 deve funzionare anche prima che l'amministratore esegua la
 * migrazione nel SQL Editor: le pagine mostrano dati reali delle Fasi 1–5 e
 * sezioni vuote/spiegative invece di generare errori 42P01/42703.
 *
 * La verifica usa una query minima per tabella/colonna. Poiché la 006 è
 * incrementale e aggiunge tutti gli oggetti in una sola transazione, basta
 * che tutte le verifiche abbiano successo per considerarla applicata.
 */

export interface Phase6Capabilities {
  ready: boolean;
  memoryEntries: boolean;
  diaryEvents: boolean;
  collectibleMetadata: boolean;
  sphereDiscoveryTimestamps: boolean;
  finalBoxGiftLink: boolean;
}

export async function detectPhase6Capabilities(): Promise<Phase6Capabilities> {
  const supabase = await createClient();

  const [entries, diary, contents, spheres] = await Promise.all([
    supabase.from("memory_entries").select("id").limit(1),
    supabase.from("diary_events").select("id").limit(1),
    supabase.from("physical_contents").select("category").limit(1),
    supabase.from("memory_spheres").select("discovered_at").limit(1),
  ]);

  const memoryEntries = !entries.error;
  const diaryEvents = !diary.error;
  const collectibleMetadata = !contents.error;
  const sphereDiscoveryTimestamps = !spheres.error;

  return {
    ready:
      memoryEntries &&
      diaryEvents &&
      collectibleMetadata &&
      sphereDiscoveryTimestamps,
    memoryEntries,
    diaryEvents,
    collectibleMetadata,
    sphereDiscoveryTimestamps,
    // La colonna è su una tabella admin-only: se le altre verifiche passano,
    // la migrazione è applicata e anche questa colonna esiste.
    finalBoxGiftLink: memoryEntries && diaryEvents,
  };
}

/**
 * Rilevamento della migrazione 007 (PWA e Web Push).
 *
 * `notification_preferences` esiste solo con la 007; la colonna `last_seen_at`
 * viene letta con il client RLS dell'utente (la sua subscription), quindi il
 * controllo funziona anche senza service role.
 */
export interface PushCapabilities {
  ready: boolean;
  preferences: boolean;
  subscriptions: boolean;
}

export async function detectPushCapabilities(): Promise<PushCapabilities> {
  const supabase = await createClient();

  const [preferences, subscriptions] = await Promise.all([
    supabase.from("notification_preferences").select("user_id").limit(1),
    supabase.from("notification_subscriptions").select("last_seen_at").limit(1),
  ]);

  const preferencesReady = !preferences.error;
  const subscriptionsReady = !subscriptions.error;

  return {
    ready: preferencesReady && subscriptionsReady,
    preferences: preferencesReady,
    subscriptions: subscriptionsReady,
  };
}
