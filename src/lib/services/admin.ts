import "server-only";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getResource } from "@/lib/admin/resources";
import { detectPhase6Capabilities, detectPushCapabilities } from "./capabilities";

/**
 * Servizi di lettura per il pannello admin.
 * Ogni funzione chiama requireAdmin(): la protezione non dipende solo dal layout.
 * Usa il client service role SOLO qui e nelle Server Actions, mai nel browser.
 */

export interface AdminRow {
  id?: string;
  [key: string]: unknown;
}

export interface LookupOption {
  value: string;
  label: string;
}

export interface DashboardStats {
  totalDays: number;
  unlockedDays: number;
  totalOpenings: number;
  giftsConfigured: number;
  giftsMissing: number;
  cluesInserted: number;
  quizzes: number;
  elfMessages: number;
  secretMessages: number;
  users: number;
  notifications: number;
  passwords: number;
  nextEvent: { label: string; date: string } | null;
  now: string;
}

function errorMessage(error: { message?: string } | null, context: string): Error {
  return new Error(`${context}: ${error?.message ?? "errore sconosciuto"}`);
}

export async function getAdminRows(resourceKey: string): Promise<AdminRow[]> {
  await requireAdmin();
  const capabilities = await detectPhase6Capabilities();
  if (resourceKey === "memory_entries" && !capabilities.ready) return [];

  const resource = getResource(resourceKey, {
    phase6: capabilities.ready,
    phase7:
      resourceKey === "scheduled_notifications"
        ? (await detectPushCapabilities()).ready
        : false,
  });
  if (!resource) throw new Error(`Risorsa admin sconosciuta: ${resourceKey}`);

  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from(resourceKey)
    .select("*")
    .order(resource.orderBy ?? "created_at", { ascending: true });

  if (error) throw errorMessage(error, `Lettura ${resource.label} fallita`);
  return (data ?? []) as AdminRow[];
}

export async function getAdminLookups(): Promise<Record<string, LookupOption[]>> {
  await requireAdmin();
  const supabase = await createAdminClient();

  const [locations, hotspots, quizzes, gifts, users] = await Promise.all([
    supabase.from("village_locations").select("id, name").order("sort_order"),
    supabase.from("village_hotspots").select("id, name").order("sort_order"),
    supabase.from("quizzes").select("id, question, day_number").order("day_number"),
    supabase.from("physical_gifts").select("id, name").order("sort_order"),
    supabase.from("users").select("id, email").order("email"),
  ]);

  if (locations.error) throw errorMessage(locations.error, "Lettura luoghi fallita");
  if (hotspots.error) throw errorMessage(hotspots.error, "Lettura hotspot fallita");
  if (quizzes.error) throw errorMessage(quizzes.error, "Lettura quiz fallita");
  if (gifts.error) throw errorMessage(gifts.error, "Lettura regali fallita");
  if (users.error) throw errorMessage(users.error, "Lettura utenti fallita");

  return {
    locations: (locations.data ?? []).map((row) => ({ value: row.id, label: row.name })),
    hotspots: (hotspots.data ?? []).map((row) => ({ value: row.id, label: row.name })),
    quizzes: (quizzes.data ?? []).map((row) => ({
      value: row.id,
      label: `Giorno ${row.day_number}: ${String(row.question).slice(0, 60)}`,
    })),
    gifts: (gifts.data ?? []).map((row) => ({ value: row.id, label: row.name })),
    users: (users.data ?? []).map((row) => ({ value: row.id, label: row.email })),
  };
}

async function countTable(table: string): Promise<number> {
  const supabase = await createAdminClient();
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });

  if (error) throw errorMessage(error, `Conteggio ${table} fallito`);
  return count ?? 0;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  await requireAdmin();
  const supabase = await createAdminClient();
  const now = new Date();

  const [daysResult, openings, gifts, clues, quizzes, elves, secrets, users, notifications, passwords] =
    await Promise.all([
      supabase.from("advent_days").select("day_number, title, unlock_date").order("day_number"),
      countTable("user_openings"),
      countTable("physical_gifts"),
      countTable("physical_contents"),
      countTable("quizzes"),
      countTable("elf_messages"),
      countTable("secret_messages"),
      countTable("users"),
      countTable("scheduled_notifications"),
      countTable("physical_passwords"),
    ]);

  if (daysResult.error) throw errorMessage(daysResult.error, "Lettura giorni fallita");

  const days = daysResult.data ?? [];
  const unlockedDays = days.filter(
    (day) => new Date(day.unlock_date).getTime() <= now.getTime()
  ).length;

  const future = days
    .filter((day) => new Date(day.unlock_date).getTime() > now.getTime())
    .sort((a, b) => a.unlock_date.localeCompare(b.unlock_date));

  const scheduledResult = await supabase
    .from("scheduled_notifications")
    .select("title, scheduled_for")
    .gt("scheduled_for", now.toISOString())
    .order("scheduled_for", { ascending: true })
    .limit(1);

  const scheduled = scheduledResult.data?.[0];

  let nextEvent: DashboardStats["nextEvent"] = null;
  if (future.length > 0) {
    nextEvent = {
      label: `Giorno ${future[0].day_number} – ${future[0].title}`,
      date: future[0].unlock_date,
    };
  }
  if (
    scheduled?.scheduled_for &&
    (!nextEvent || scheduled.scheduled_for < nextEvent.date)
  ) {
    nextEvent = { label: `Notifica: ${scheduled.title}`, date: scheduled.scheduled_for };
  }

  return {
    totalDays: days.length,
    unlockedDays,
    totalOpenings: openings,
    giftsConfigured: gifts,
    giftsMissing: Math.max(0, 24 - gifts),
    cluesInserted: clues,
    quizzes,
    elfMessages: elves,
    secretMessages: secrets,
    users,
    notifications,
    passwords,
    nextEvent,
    now: now.toISOString(),
  };
}

export interface DayOverviewRow {
  dayNumber: number;
  title: string;
  unlockDate: string;
  unlocked: boolean;
  location: string | null;
  gift: string | null;
  clues: number;
  quizzes: number;
}

export async function getDayOverview(): Promise<DayOverviewRow[]> {
  await requireAdmin();
  const supabase = await createAdminClient();

  const [days, hotspots, gifts, clues, quizzes, locations] = await Promise.all([
    supabase.from("advent_days").select("day_number, title, unlock_date").order("day_number"),
    supabase.from("village_hotspots").select("day_number, location_id"),
    supabase.from("physical_gifts").select("day_number, name"),
    supabase.from("physical_contents").select("day_number"),
    supabase.from("quizzes").select("day_number"),
    supabase.from("village_locations").select("id, name"),
  ]);

  if (days.error) throw errorMessage(days.error, "Lettura giorni fallita");

  const locationName = new Map((locations.data ?? []).map((row) => [row.id, row.name]));
  const hotspotByDay = new Map<number, string | null>();
  for (const hotspot of hotspots.data ?? []) {
    if (hotspot.day_number === null) continue;
    hotspotByDay.set(hotspot.day_number, hotspot.location_id ? (locationName.get(hotspot.location_id) ?? null) : null);
  }

  const countByDay = (rows: { day_number: number }[] | null) => {
    const map = new Map<number, number>();
    for (const row of rows ?? []) map.set(row.day_number, (map.get(row.day_number) ?? 0) + 1);
    return map;
  };

  const giftByDay = new Map((gifts.data ?? []).map((row) => [row.day_number, row.name]));
  const clueCounts = countByDay(clues.data);
  const quizCounts = countByDay(quizzes.data);
  const now = Date.now();

  return (days.data ?? []).map((day) => ({
    dayNumber: day.day_number,
    title: day.title,
    unlockDate: day.unlock_date,
    unlocked: new Date(day.unlock_date).getTime() <= now,
    location: hotspotByDay.get(day.day_number) ?? null,
    gift: giftByDay.get(day.day_number) ?? null,
    clues: clueCounts.get(day.day_number) ?? 0,
    quizzes: quizCounts.get(day.day_number) ?? 0,
  }));
}

export interface SimulationState {
  active: boolean;
  date: string | null;
  note: string;
}

export async function getSimulation(): Promise<SimulationState> {
  const user = await requireAdmin();
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("admin_date_simulations")
    .select("simulated_date, note, is_active")
    .eq("admin_id", user.id)
    .maybeSingle();

  if (error) throw errorMessage(error, "Lettura simulazione fallita");

  return {
    active: Boolean(data?.is_active),
    date: data?.simulated_date ?? null,
    note: data?.note ?? "",
  };
}

export interface AdminUserRow {
  id: string;
  email: string;
  role: string;
  created_at: string;
  openedDays: number;
  photos: number;
  spheres: number;
}

export async function getUsersWithProgress(): Promise<AdminUserRow[]> {
  await requireAdmin();
  const supabase = await createAdminClient();

  const [users, openings, photos, spheres] = await Promise.all([
    supabase.from("users").select("id, email, role, created_at").order("email"),
    supabase.from("user_openings").select("user_id, day_number"),
    supabase.from("user_photos").select("user_id"),
    supabase.from("memory_spheres").select("user_id"),
  ]);

  if (users.error) throw errorMessage(users.error, "Lettura utenti fallita");
  if (openings.error) throw errorMessage(openings.error, "Lettura progressi fallita");

  const countByUser = (rows: { user_id: string }[] | null) => {
    const map = new Map<string, number>();
    for (const row of rows ?? []) map.set(row.user_id, (map.get(row.user_id) ?? 0) + 1);
    return map;
  };

  const openingDays = new Map<string, Set<number>>();
  for (const row of openings.data ?? []) {
    const set = openingDays.get(row.user_id) ?? new Set<number>();
    set.add(row.day_number);
    openingDays.set(row.user_id, set);
  }

  const photoCounts = countByUser(photos.data);
  const sphereCounts = countByUser(spheres.data);

  return (users.data ?? []).map((user) => ({
    id: user.id,
    email: user.email,
    role: user.role,
    created_at: user.created_at,
    openedDays: openingDays.get(user.id)?.size ?? 0,
    photos: photoCounts.get(user.id) ?? 0,
    spheres: sphereCounts.get(user.id) ?? 0,
  }));
}

export interface FinalBoxRow {
  id?: string;
  [key: string]: unknown;
}

export async function getFinalBox(): Promise<FinalBoxRow | null> {
  await requireAdmin();
  const capabilities = await detectPhase6Capabilities();
  const supabase = await createAdminClient();
  const columns = [
    "id",
    "name",
    "description",
    "image_url",
    "shape",
    "color",
    "decorations",
    "symbol",
    "intro_message",
    "clues",
    "objects",
    "password_enabled",
    "password_hint",
    "opening_sequence",
    "final_message",
    "reveal_day",
    "is_active",
    "created_at",
    "updated_at",
  ];
  if (capabilities.ready) columns.push("physical_gift_id");
  const { data, error } = await supabase
    .from("final_gift_boxes")
    .select(columns.join(", "))
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw errorMessage(error, "Lettura scatola finale fallita");
  return (data as unknown as FinalBoxRow) ?? null;
}

export interface PasswordConfig {
  contentId: string;
  hasPassword: boolean;
  hint: string;
  successMessage: string;
  maxAttempts: number | null;
  isActive: boolean;
  attempts: number;
  completed: number;
}

export async function getPasswordConfig(contentId: string): Promise<PasswordConfig> {
  await requireAdmin();
  const supabase = await createAdminClient();

  const [config, attempts, completions] = await Promise.all([
    supabase
      .from("physical_passwords")
      .select("hint, success_message, max_attempts, is_active")
      .eq("content_id", contentId)
      .maybeSingle(),
    supabase
      .from("password_attempts")
      .select("*", { count: "exact", head: true })
      .eq("content_id", contentId),
    supabase
      .from("password_completions")
      .select("*", { count: "exact", head: true })
      .eq("content_id", contentId),
  ]);

  if (config.error) throw errorMessage(config.error, "Lettura configurazione password fallita");

  return {
    contentId,
    hasPassword: Boolean(config.data),
    hint: config.data?.hint ?? "",
    successMessage: config.data?.success_message ?? "",
    maxAttempts: config.data?.max_attempts ?? null,
    isActive: config.data?.is_active ?? false,
    attempts: attempts.count ?? 0,
    completed: completions.count ?? 0,
  };
}
