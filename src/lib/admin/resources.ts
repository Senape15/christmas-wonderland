import { HOTSPOT_KINDS } from "@/types/village";

/**
 * Registro condiviso delle risorse amministrative.
 *
 * È la SINGLE SOURCE OF TRUTH per:
 *  - campi e tipi mostrati dai form/admin table (client);
 *  - allowlist e validazione Zod delle Server Actions (server).
 *
 * Nessun dato demo: le opzioni dinamiche (luoghi, giorni, utenti...) arrivano
 * dal server come `lookups` e non sono mai fisse nel codice.
 */

export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "boolean"
  | "date"
  | "datetime"
  | "select"
  | "json";

export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  readonly?: boolean;
  options?: { value: string; label: string }[];
  /** Chiave dei lookups dinamici ricevuti dal server. */
  lookup?: string;
  help?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  uuid?: boolean;
  /** Campo introdotto dalla migrazione 006: nascosto finché non è applicata. */
  phase6?: boolean;
  /** Campo introdotto dalla migrazione 007 (Web Push): stesso comportamento. */
  phase7?: boolean;
  /**
   * Valore iniziale del form e valore salvato quando il campo è vuoto.
   * Serve alle colonne NOT NULL con default database: inviare `null`
   * esplicito viola il vincolo, mentre omettere la colonna applicherebbe
   * il default. Qui il valore è noto e valido.
   */
  defaultValue?: string;
  /**
   * Valore salvato quando il campo è vuoto, senza precompilare il form.
   * Usato dai campi JSON, il cui default DB è un oggetto (`{}`) o un array
   * (`[]`), e dai testi che devono restare vuoti invece che NULL.
   */
  emptyValue?: unknown;
}

export interface ResourceDef {
  key: string;
  label: string;
  description: string;
  fields: FieldDef[];
  listFields: string[];
  orderBy?: string;
  /** Chiavi di lookup necessarie per i campi select. */
  lookups?: string[];
  /** Nome colonna usato come etichetta nelle tabelle. */
  titleField: string;
}

export const DAY_OPTIONS = Array.from({ length: 24 }, (_, index) => ({
  value: String(index + 1),
  label: `Giorno ${index + 1}`,
}));

export const HOTSPOT_KIND_OPTIONS = HOTSPOT_KINDS.map((kind) => ({
  value: kind,
  label: kind.replace(/-/g, " "),
}));

export const NOTIFICATION_KIND_OPTIONS = [
  { value: "daily", label: "Notifica giornaliera" },
  { value: "reminder", label: "Promemoria casella" },
  { value: "content", label: "Nuovo contenuto" },
  { value: "clue", label: "Nuovo indizio" },
  { value: "quiz", label: "Quiz" },
  { value: "special", label: "Comunicazione speciale" },
  { value: "finale", label: "Finale (24 dicembre)" },
];

export const NOTIFICATION_AUDIENCE_OPTIONS = [
  { value: "all", label: "Tutti con notifiche attive" },
  { value: "admins", label: "Solo amministratori" },
  { value: "day_openers", label: "Chi ha aperto il giorno" },
  { value: "not_opened", label: "Chi non ha aperto il giorno" },
  { value: "user", label: "Un singolo utente" },
];

const day: FieldDef = {
  name: "day_number",
  label: "Giorno",
  type: "select",
  options: DAY_OPTIONS,
  required: true,
};

const location: FieldDef = {
  name: "location_id",
  label: "Luogo",
  type: "select",
  lookup: "locations",
  uuid: true,
};

const hotspot: FieldDef = {
  name: "hotspot_id",
  label: "Punto del villaggio",
  type: "select",
  lookup: "hotspots",
  uuid: true,
};

const active: FieldDef = {
  name: "is_active",
  label: "Attivo",
  type: "boolean",
};

const RARITY_OPTIONS = [
  { value: "comune", label: "Comune" },
  { value: "raro", label: "Raro" },
  { value: "speciale", label: "Speciale" },
  { value: "leggendario", label: "Leggendario" },
];

const phase6Category: FieldDef = {
  name: "category",
  label: "Categoria collezione",
  type: "text",
  phase6: true,
  help: "Usata per filtrare oggetti e simboli nella collezione.",
};

const phase6Rarity: FieldDef = {
  name: "rarity",
  label: "Rarità",
  type: "select",
  options: RARITY_OPTIONS,
  // Colonna NOT NULL con default 'comune'.
  defaultValue: "comune",
  phase6: true,
};

const phase6Description: FieldDef = {
  name: "special_description",
  label: "Descrizione speciale",
  type: "textarea",
  phase6: true,
  help: "Mostrata solo dopo aver ottenuto l'oggetto.",
};

const phase6Silhouette: FieldDef = {
  name: "show_silhouette",
  label: "Mostra sagoma prima del ritrovamento",
  type: "boolean",
  phase6: true,
  help: "Se attivo, l'oggetto non ottenuto appare come sagoma misteriosa solo dopo lo sblocco del giorno.",
};

export const RESOURCES: Record<string, ResourceDef> = {
  advent_days: {
    key: "advent_days",
    label: "Giorni dell'Avvento",
    description: "Titoli, descrizioni e date di sblocco dei 24 giorni.",
    titleField: "title",
    orderBy: "day_number",
    fields: [
      // day_number è NOT NULL e senza default: deve essere scelto alla creazione.
      day,
      { name: "title", label: "Titolo", type: "text", required: true },
      { name: "description", label: "Descrizione", type: "textarea" },
      { name: "unlock_date", label: "Data di sblocco", type: "datetime", required: true },
    ],
    listFields: ["day_number", "title", "unlock_date"],
  },
  village_locations: {
    key: "village_locations",
    label: "Zone del villaggio",
    description: "Le sei zone illustrate e la loro posizione sulla mappa.",
    titleField: "name",
    orderBy: "sort_order",
    fields: [
      { name: "slug", label: "Slug (chiave stabile)", type: "text", required: true, help: "Usato dall'illustrazione: non modificarlo." },
      { name: "name", label: "Nome", type: "text", required: true },
      { name: "description", label: "Descrizione", type: "textarea" },
      { name: "position_x", label: "Posizione X (%)", type: "number", min: 0, max: 100, required: true },
      { name: "position_y", label: "Posizione Y (%)", type: "number", min: 0, max: 100, required: true },
      { name: "sort_order", label: "Ordine", type: "number", min: 0 },
      active,
    ],
    listFields: ["name", "slug", "position_x", "position_y", "is_active"],
  },
  village_hotspots: {
    key: "village_hotspots",
    label: "Punti interattivi",
    description: "I 24 luoghi illustrati e l'associazione al giorno.",
    titleField: "name",
    orderBy: "sort_order",
    lookups: ["locations"],
    fields: [
      { ...location, required: true },
      { name: "slug", label: "Slug", type: "text", required: true },
      { name: "name", label: "Nome", type: "text", required: true },
      { name: "kind", label: "Tipo illustrato", type: "select", options: HOTSPOT_KIND_OPTIONS, required: true },
      { name: "position_x", label: "X (%)", type: "number", min: 0, max: 100, required: true },
      { name: "position_y", label: "Y (%)", type: "number", min: 0, max: 100, required: true },
      day,
      { name: "sort_order", label: "Ordine", type: "number", min: 0 },
      active,
    ],
    listFields: ["name", "kind", "day_number", "is_active"],
  },
  village_hotspot_messages: {
    key: "village_hotspot_messages",
    label: "Testi dei luoghi",
    description: "Indizi e messaggi di Nico per ogni punto (protetti da RLS fino allo sblocco).",
    titleField: "hint",
    orderBy: "created_at",
    lookups: ["hotspots"],
    fields: [
      { ...hotspot, required: true },
      { name: "hint", label: "Indizio", type: "textarea" },
      { name: "nico_message", label: "Messaggio di Nico", type: "textarea" },
      // Colonna NOT NULL con default 'happy'.
      { name: "nico_expression", label: "Espressione di Nico", type: "select", defaultValue: "happy", options: [
        { value: "happy", label: "Felice" },
        { value: "curious", label: "Curioso" },
        { value: "surprised", label: "Sorpreso" },
        { value: "mysterious", label: "Misterioso" },
      ] },
    ],
    listFields: ["hotspot_id", "hint", "nico_expression"],
  },
  physical_gifts: {
    key: "physical_gifts",
    label: "Regali fisici",
    description: "Inventario dei regali reali associati a giorno e luogo.",
    titleField: "name",
    orderBy: "sort_order",
    lookups: ["locations"],
    fields: [
      { name: "name", label: "Nome", type: "text", required: true },
      { name: "description", label: "Descrizione", type: "textarea" },
      { ...location, required: true },
      day,
      { name: "image_url", label: "URL immagine", type: "text" },
      // Colonna NOT NULL con default 'da_preparare'.
      { name: "preparation_status", label: "Stato preparazione", type: "select", defaultValue: "da_preparare", options: [
        { value: "da_preparare", label: "Da preparare" },
        { value: "in_preparazione", label: "In preparazione" },
        { value: "pronto", label: "Pronto" },
        { value: "consegnato", label: "Consegnato" },
      ] },
      { name: "delivery_instructions", label: "Istruzioni di consegna", type: "textarea" },
      { name: "admin_notes", label: "Note private admin", type: "textarea" },
      { name: "sort_order", label: "Ordine", type: "number", min: 0 },
      phase6Category,
      phase6Rarity,
      phase6Description,
      phase6Silhouette,
      active,
    ],
    listFields: ["name", "day_number", "preparation_status", "is_active"],
  },
  physical_contents: {
    key: "physical_contents",
    label: "Contenuti delle scatole",
    description: "Lettere, oggetti, indizi, enigmi e password (hint) per ogni giorno.",
    titleField: "title",
    orderBy: "sort_order",
    lookups: ["hotspots"],
    fields: [
      { name: "title", label: "Titolo", type: "text", required: true },
      day,
      { ...hotspot },
      { name: "kind", label: "Tipologia", type: "select", required: true, options: [
        { value: "letter", label: "LETTER" },
        { value: "object", label: "OBJECT" },
        { value: "photo", label: "PHOTO" },
        { value: "puzzle", label: "PUZZLE" },
        { value: "password", label: "PASSWORD" },
        { value: "clue", label: "CLUE" },
        { value: "note", label: "NOTE" },
      ] },
      { name: "content", label: "Testo personalizzato", type: "textarea" },
      { name: "image_url", label: "URL immagine", type: "text" },
      { name: "password_required", label: "Password obbligatoria", type: "boolean", help: "La password si configura nella sezione Password." },
      { name: "password_hint", label: "Suggerimento password", type: "text" },
      { name: "success_message", label: "Messaggio dopo lo sblocco", type: "textarea" },
      { name: "activation_conditions", label: "Condizioni di attivazione (JSON)", type: "json", emptyValue: {} },
      { name: "admin_notes", label: "Note private admin", type: "textarea" },
      { name: "sort_order", label: "Ordine", type: "number", min: 0 },
      phase6Category,
      phase6Rarity,
      phase6Description,
      phase6Silhouette,
      {
        name: "clue_group",
        label: "Gruppo indizi",
        type: "text",
        phase6: true,
        help: "Indizi dello stesso gruppo sono raggruppati nell'archivio.",
      },
      {
        name: "related_content_ids",
        label: "Indizi collegati (JSON array di id)",
        type: "json",
        emptyValue: [],
        phase6: true,
        help: "Solo indizi già scoperti vengono mostrati come collegati.",
      },
      active,
    ],
    listFields: ["title", "day_number", "kind", "password_required", "is_active"],
  },
  gift_symbols: {
    key: "gift_symbols",
    label: "Simboli",
    description: "Simboli collezionabili collegati ai regali.",
    titleField: "symbol",
    orderBy: "created_at",
    lookups: ["locations", "gifts"],
    fields: [
      { name: "symbol", label: "Simbolo", type: "text", required: true },
      { name: "description", label: "Descrizione", type: "textarea" },
      { name: "image_url", label: "URL immagine", type: "text" },
      // Colonna NOT NULL: il simbolo deve essere collegato a un regalo.
      { name: "gift_id", label: "Regalo associato", type: "select", lookup: "gifts", uuid: true, required: true },
      day,
      location,
      { name: "discovery_conditions", label: "Condizioni di scoperta (JSON)", type: "json", emptyValue: {} },
      phase6Category,
      phase6Rarity,
      phase6Silhouette,
      active,
    ],
    listFields: ["symbol", "day_number", "description", "is_active"],
  },
  quizzes: {
    key: "quizzes",
    label: "Quiz e prove",
    description: "Domande, suggerimenti, punteggi e condizioni di sblocco.",
    titleField: "question",
    orderBy: "day_number",
    lookups: ["locations"],
    fields: [
      day,
      location,
      { name: "question", label: "Domanda", type: "textarea", required: true },
      { name: "hint", label: "Suggerimento", type: "textarea" },
      { name: "points", label: "Punteggio", type: "number", min: 0 },
      { name: "is_required", label: "Risposta obbligatoria", type: "boolean" },
      { name: "unlock_conditions", label: "Condizioni di sblocco (JSON)", type: "json", emptyValue: {} },
      active,
    ],
    listFields: ["day_number", "question", "points", "is_active"],
  },
  quiz_answers: {
    key: "quiz_answers",
    label: "Risposte dei quiz",
    description: "Risposte e indicazione di quella corretta (solo admin).",
    titleField: "answer_text",
    orderBy: "sort_order",
    lookups: ["quizzes"],
    fields: [
      { name: "quiz_id", label: "Quiz", type: "select", lookup: "quizzes", uuid: true, required: true },
      { name: "answer_text", label: "Risposta", type: "text", required: true },
      { name: "is_correct", label: "Risposta corretta", type: "boolean" },
      { name: "hint", label: "Suggerimento specifico", type: "textarea" },
      { name: "sort_order", label: "Ordine", type: "number", min: 0 },
      active,
    ],
    listFields: ["quiz_id", "answer_text", "is_correct", "is_active"],
  },
  elf_messages: {
    key: "elf_messages",
    label: "Diario degli elfi",
    description: "Messaggi giornalieri e programmati.",
    titleField: "message",
    orderBy: "day_number",
    fields: [
      day,
      { name: "author", label: "Autore", type: "text", required: true },
      { name: "message", label: "Messaggio", type: "textarea", required: true },
      { name: "image_url", label: "URL immagine", type: "text" },
      { name: "scheduled_for", label: "Programmato il", type: "datetime" },
      { name: "event_key", label: "Chiave evento narrativo", type: "text" },
      active,
    ],
    listFields: ["day_number", "author", "message", "scheduled_for", "is_active"],
  },
  secret_messages: {
    key: "secret_messages",
    label: "Messaggi segreti",
    description: "Messaggi personalizzati per utente e giorno.",
    titleField: "content",
    orderBy: "day_number",
    lookups: ["users"],
    fields: [
      { name: "user_id", label: "Utente", type: "select", lookup: "users", uuid: true, required: true },
      day,
      { name: "content", label: "Messaggio", type: "textarea", required: true },
      { name: "author", label: "Autore", type: "text" },
      { name: "scheduled_for", label: "Programmato il", type: "datetime" },
      { name: "event_key", label: "Chiave evento narrativo", type: "text" },
      active,
    ],
    listFields: ["user_id", "day_number", "content", "is_active"],
  },
  scheduled_notifications: {
    key: "scheduled_notifications",
    label: "Notifiche programmate",
    description:
      "Titoli, testi, tipologia e pubblico. Con la migrazione 007 l'invio reale è gestito dal ciclo Web Push.",
    titleField: "title",
    orderBy: "created_at",
    lookups: ["users"],
    fields: [
      { name: "title", label: "Titolo", type: "text", required: true },
      { name: "body", label: "Testo", type: "textarea", required: true },
      {
        name: "kind",
        label: "Tipologia",
        type: "select",
        options: NOTIFICATION_KIND_OPTIONS,
        required: true,
        phase7: true,
        defaultValue: "special",
        help: "Determina preferenza utente e testo di fallback.",
      },
      {
        name: "audience",
        label: "Destinatari",
        type: "select",
        options: NOTIFICATION_AUDIENCE_OPTIONS,
        phase7: true,
        defaultValue: "all",
      },
      {
        name: "target_user_id",
        label: "Utente singolo",
        type: "select",
        lookup: "users",
        uuid: true,
        phase7: true,
        help: "Usato solo con destinatari = «Un singolo utente».",
      },
      { ...day, required: false },
      { name: "scheduled_for", label: "Programmata il", type: "datetime" },
      {
        name: "url",
        label: "Collegamento",
        type: "text",
        phase7: true,
        defaultValue: "/dashboard",
        placeholder: "/dashboard",
        help: "Pagina aperta toccando la notifica.",
      },
      { name: "event_key", label: "Chiave evento", type: "text" },
      {
        name: "dedupe_key",
        label: "Chiave anti-duplicato",
        type: "text",
        // Indice univoco parziale su dedupe_key: "" collide, il vuoto deve essere NULL.
        emptyValue: null,
        phase7: true,
        help: "Opzionale: identifica univocamente la notifica.",
      },
      { name: "conditions", label: "Condizioni (JSON)", type: "json", emptyValue: {} },
      active,
      {
        name: "status",
        label: "Stato invio",
        type: "select",
        readonly: true,
        phase7: true,
      },
      {
        name: "attempts",
        label: "Tentativi",
        type: "number",
        readonly: true,
        phase7: true,
      },
      {
        name: "recipients_count",
        label: "Destinatari raggiunti",
        type: "number",
        readonly: true,
        phase7: true,
      },
      {
        name: "sent_at",
        label: "Inviata il",
        type: "datetime",
        readonly: true,
        phase7: true,
      },
      {
        name: "last_error",
        label: "Ultimo errore",
        type: "textarea",
        readonly: true,
        phase7: true,
      },
    ],
    listFields: ["title", "kind", "day_number", "scheduled_for", "status"],
  },
  memory_spheres: {
    key: "memory_spheres",
    label: "Sfere dei ricordi",
    description: "Contenuti delle sfere personali degli utenti.",
    titleField: "title",
    orderBy: "sort_order",
    lookups: ["users", "locations"],
    fields: [
      { name: "user_id", label: "Utente", type: "select", lookup: "users", uuid: true, required: true },
      { name: "title", label: "Titolo", type: "text", required: true },
      { name: "note", label: "Testo", type: "textarea" },
      { name: "photo_url", label: "URL immagine", type: "text" },
      day,
      location,
      { name: "is_unlocked", label: "Sbloccata", type: "boolean" },
      { name: "sort_order", label: "Ordine", type: "number", min: 0 },
      { name: "activation_conditions", label: "Condizioni (JSON)", type: "json", emptyValue: {} },
      { name: "unlocked_at", label: "Sbloccata il", type: "datetime", readonly: true, phase6: true },
      { name: "discovered_at", label: "Scoperta il", type: "datetime", readonly: true, phase6: true },
    ],
    listFields: ["title", "user_id", "day_number", "is_unlocked"],
  },
  memory_entries: {
    key: "memory_entries",
    label: "Ricordi speciali",
    description: "Ricordi dell'album, eventi del diario e momenti del 24 dicembre.",
    titleField: "title",
    orderBy: "sort_order",
    fields: [
      {
        name: "placement",
        label: "Dove compare",
        type: "select",
        required: true,
        options: [
          { value: "album", label: "Album" },
          { value: "diary", label: "Diario" },
          { value: "finale", label: "Ricordo del 24 dicembre" },
        ],
      },
      {
        name: "kind",
        label: "Tipologia",
        type: "select",
        // Colonna NOT NULL con default 'special'.
        defaultValue: "special",
        options: [
          { value: "special", label: "Momento speciale" },
          { value: "letter", label: "Lettera" },
          { value: "photo", label: "Fotografia" },
          { value: "gift", label: "Regalo" },
          { value: "elf", label: "Messaggio degli elfi" },
          { value: "clue", label: "Indizio" },
          { value: "finale", label: "Rivelazione finale" },
        ],
      },
      { name: "title", label: "Titolo", type: "text", required: true },
      { name: "description", label: "Descrizione breve", type: "textarea" },
      { name: "content", label: "Contenuto completo", type: "textarea" },
      { name: "image_url", label: "URL immagine", type: "text" },
      { ...day, required: false },
      {
        name: "related_content_id",
        label: "Contenuto originale collegato",
        type: "text",
        // Colonna uuid: una stringa vuota non è valida, il vuoto deve essere NULL.
        uuid: true,
        help: "UUID del contenuto delle caselle a cui questo ricordo si riferisce.",
      },
      { name: "activation_conditions", label: "Condizioni di sblocco (JSON)", type: "json", emptyValue: {} },
      { name: "sort_order", label: "Ordine", type: "number", min: 0 },
      active,
    ],
    listFields: ["title", "placement", "day_number", "is_active"],
  },
  user_photos: {
    key: "user_photos",
    label: "Fotografie",
    description: "Foto caricate dagli utenti e associate ai giorni.",
    titleField: "storage_path",
    orderBy: "created_at",
    lookups: ["users"],
    fields: [
      { name: "user_id", label: "Utente", type: "select", lookup: "users", uuid: true, required: true },
      day,
      { name: "storage_path", label: "Percorso Storage / URL", type: "text", required: true },
      { name: "created_at", label: "Caricata il", type: "datetime", readonly: true },
    ],
    listFields: ["storage_path", "user_id", "day_number", "created_at"],
  },
  users: {
    key: "users",
    label: "Utenti",
    description: "Account registrati e ruoli applicativi.",
    titleField: "email",
    orderBy: "created_at",
    fields: [
      { name: "id", label: "ID", type: "text", readonly: true },
      { name: "email", label: "Email", type: "text", readonly: true },
      { name: "role", label: "Ruolo", type: "select", options: [
        { value: "user", label: "user" },
        { value: "admin", label: "admin" },
      ], required: true },
      { name: "created_at", label: "Registrato il", type: "datetime", readonly: true },
    ],
    listFields: ["email", "role", "created_at"],
  },
};

export const RESOURCE_KEYS = Object.keys(RESOURCES);

/** Valori iniziali del form: i default DB NOT NULL non restano vuoti. */
export function defaultFormValues(resource: ResourceDef): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const field of resource.fields) {
    if (field.readonly) continue;
    values[field.name] =
      field.defaultValue ?? (field.type === "boolean" ? false : "");
  }
  return values;
}

/**
 * Valore da inviare quando il campo è vuoto.
 *
 * Le colonne `NOT NULL` rifiutano un `NULL` esplicito (`23502`), mentre un
 * valore compatibile col tipo soddisfa il vincolo: stringa vuota per i testi,
 * `{}` / `[]` per i JSON, `NULL` per i riferimenti opzionali (uuid, date,
 * numeri). Va usato sia dal client sia da `adminSave` (difesa per client
 * datati che inviano ancora `null`).
 */
export function emptyFieldValue(field: FieldDef): unknown {
  if (field.defaultValue !== undefined) return field.defaultValue;
  if (field.emptyValue !== undefined) return field.emptyValue;
  if (field.uuid) return null;
  if (field.type === "text" || field.type === "textarea") return "";
  return null;
}

/**
 * Restituisce una risorsa. I campi delle fasi successive vengono inclusi solo
 * quando la relativa migrazione è stata applicata: prima, i form admin non
 * devono mostrare colonne inesistenti né tentare di scriverle.
 */
export function getResource(
  key: string,
  options: { phase6?: boolean; phase7?: boolean } = {}
): ResourceDef | null {
  const resource = RESOURCES[key];
  if (!resource) return null;

  return {
    ...resource,
    fields: resource.fields.filter(
      (field) =>
        (!field.phase6 || options.phase6) && (!field.phase7 || options.phase7)
    ),
  };
}
