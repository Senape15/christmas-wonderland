import { z } from "zod";
import { isSafeInternalUrl } from "@/lib/push/rules";
import type { FieldDef, ResourceDef } from "./resources";

/**
 * Genera lo schema Zod di una risorsa partendo dalla definizione dei campi.
 * Usato lato server: i campi non dichiarati vengono rifiutati (`.strict()`),
 * quindi un client non può scrivere colonne non autorizzate.
 */

function schemaForField(field: FieldDef): z.ZodTypeAny {
  let schema: z.ZodTypeAny;

  switch (field.type) {
    case "number": {
      let base = z.coerce.number().finite();
      if (typeof field.min === "number") base = base.min(field.min);
      if (typeof field.max === "number") base = base.max(field.max);
      schema = field.name === "day_number" ? base.int().min(1).max(24) : base;
      break;
    }
    case "boolean":
      schema = z.boolean();
      break;
    case "json":
      schema = z.union([
        z.string(),
        z.record(z.string(), z.unknown()),
        z.array(z.unknown()),
        z.null(),
      ]);
      break;
    case "date":
    case "datetime":
      // Le colonne NOT NULL (es. advent_days.unlock_date) non accettano null:
      // un campo obbligatorio vuoto deve fallire qui, con un messaggio chiaro.
      schema = field.required
        ? z.string().min(1, { message: "Campo obbligatorio" })
        : z.union([z.string(), z.null()]);
      break;
    case "select":
      if (field.name === "day_number") {
        schema = z.coerce.number().int().min(1).max(24);
      } else if (field.options) {
        const values = field.options.map((option) => option.value);
        schema = z.string().refine((value) => values.includes(value), {
          message: `Valore non valido per ${field.label}`,
        });
      } else {
        schema = z.string();
      }
      break;
    case "textarea":
    case "text":
    default:
      schema = z.string();
      break;
  }

  if (field.uuid) {
    schema = z.string().uuid();
  }

  // Il campo `url` delle notifiche programmate finisce nel payload push e
  // viene usato dal Service Worker per la navigazione: solo percorsi interni.
  if (field.name === "url") {
    schema = z.string().refine(isSafeInternalUrl, {
      message: "Usa un percorso interno che inizi con / (es. /dashboard).",
    });
  }

  return field.required ? schema : schema.optional().nullable();
}

export function schemaForResource(resource: ResourceDef) {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const field of resource.fields) {
    if (field.readonly) continue;
    shape[field.name] = schemaForField(field);
  }

  return z.object(shape).strict();
}

export function validateAdminValues(resource: ResourceDef, values: unknown) {
  return schemaForResource(resource).safeParse(values);
}

/** Rimuove chiavi non presenti nella risorsa (difesa aggiuntiva). */
export function pickAllowedValues(
  resource: ResourceDef,
  values: Record<string, unknown>
): Record<string, unknown> {
  const allowed = new Set(
    resource.fields.filter((field) => !field.readonly).map((field) => field.name)
  );

  return Object.fromEntries(
    Object.entries(values).filter(([key]) => allowed.has(key))
  );
}
