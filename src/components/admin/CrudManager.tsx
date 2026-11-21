"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  defaultFormValues,
  emptyFieldValue,
  getResource,
  type FieldDef,
  type ResourceDef,
} from "@/lib/admin/resources";
import { adminDelete, adminSave, uploadAdminImage } from "@/lib/admin/actions";
import type { AdminRow, LookupOption } from "@/lib/services/admin";
import { ConfirmDialog, EmptyState, Modal, Toast } from "./ui";

interface CrudManagerProps {
  resourceKey: string;
  rows: AdminRow[];
  lookups: Record<string, LookupOption[]>;
  createLabel?: string;
  /** Abilita i campi della migrazione 006 (rilevata lato server). */
  phase6Ready?: boolean;
  /** Abilita i campi della migrazione 007 (Web Push). */
  phase7Ready?: boolean;
}

function toInputValue(field: FieldDef, value: unknown): unknown {
  if (value === null || value === undefined) return "";
  if (field.type === "json") {
    return typeof value === "string" ? value : JSON.stringify(value, null, 2);
  }
  if (field.type === "datetime" && typeof value === "string") {
    return value.slice(0, 16);
  }
  if (field.type === "date" && typeof value === "string") {
    return value.slice(0, 10);
  }
  return value;
}

function toStoredValue(field: FieldDef, value: unknown): unknown {
  if (value === "" || value === null || value === undefined) {
    // Le colonne NOT NULL non accettano un NULL esplicito: il vuoto assume
    // il valore dichiarato dal campo ("" per i testi, {} / [] per i JSON).
    return emptyFieldValue(field);
  }
  if (field.type === "number") return Number(value);
  if (field.type === "json") {
    if (typeof value !== "string") return value;
    if (value.trim() === "") return emptyFieldValue(field);
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}

function formatCell(
  field: FieldDef | undefined,
  value: unknown,
  lookups: Record<string, LookupOption[]>
): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Sì" : "No";
  if (field?.lookup && lookups[field.lookup]) {
    const match = lookups[field.lookup].find((option) => option.value === String(value));
    if (match) return match.label;
  }
  if (field?.options) {
    const match = field.options.find((option) => option.value === String(value));
    if (match) return match.label;
  }
  if (typeof value === "string" && value.length > 70) return `${value.slice(0, 70)}…`;
  return String(value);
}

export function CrudManager({
  resourceKey,
  rows,
  lookups,
  createLabel = "Nuovo elemento",
  phase6Ready = false,
  phase7Ready = false,
}: CrudManagerProps) {
  const router = useRouter();
  const resource = getResource(resourceKey, {
    phase6: phase6Ready,
    phase7: phase7Ready,
  }) as ResourceDef;
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<AdminRow | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);

  const editableFields = resource.fields.filter((field) => !field.readonly);
  const imageField = resource.fields.find(
    (field) => field.name === "image_url" || field.name === "photo_url" || field.name === "storage_path"
  );

  const term = search.trim().toLowerCase();
  const filteredRows = term
    ? rows.filter((row) =>
        resource.listFields.some((name) => String(row[name] ?? "").toLowerCase().includes(term))
      )
    : rows;

  function openCreate() {
    setValues(defaultFormValues(resource));
    setIsNew(true);
    setEditing({});
  }

  function openEdit(row: AdminRow) {
    const initial: Record<string, unknown> = {};
    for (const field of editableFields) {
      initial[field.name] = toInputValue(field, row[field.name]);
    }
    setValues(initial);
    setIsNew(false);
    setEditing(row);
  }

  function closeEditor() {
    setEditing(null);
    setValues({});
  }

  function setValue(name: string, value: unknown) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const payload: Record<string, unknown> = {};
    for (const field of editableFields) {
      payload[field.name] = toStoredValue(field, values[field.name]);
    }

    startTransition(async () => {
      const result = await adminSave(resourceKey, isNew ? null : (editing?.id as string), payload);
      if (result.ok) {
        setToast({ message: "Modifiche salvate correttamente.", tone: "success" });
        closeEditor();
        router.refresh();
      } else {
        setToast({ message: result.error ?? "Errore durante il salvataggio.", tone: "error" });
      }
    });
  }

  function handleDelete() {
    if (!deletingId) return;
    startTransition(async () => {
      const result = await adminDelete(resourceKey, deletingId);
      setDeletingId(null);
      setToast({
        message: result.ok ? "Elemento eliminato." : (result.error ?? "Eliminazione fallita."),
        tone: result.ok ? "success" : "error",
      });
      if (result.ok) router.refresh();
    });
  }

  function handleUpload(file: File | undefined) {
    if (!file || !imageField) return;
    const formData = new FormData();
    formData.append("file", file);
    setUploading(true);
    startTransition(async () => {
      const result = await uploadAdminImage(formData);
      setUploading(false);
      if (result.ok && result.data) {
        setValue(imageField.name, result.data.url);
        setToast({ message: "Immagine caricata.", tone: "success" });
      } else {
        setToast({ message: result.error ?? "Caricamento fallito.", tone: "error" });
      }
    });
  }

  function renderField(field: FieldDef) {
    const value = values[field.name];
    const common =
      "w-full rounded-lg border border-cream-300/20 bg-pine-950/60 px-3 py-2 text-sm text-cream-50 outline-none focus:border-gold/60 focus-visible:ring-2 focus-visible:ring-gold/60";

    if (field.readonly) return null;

    return (
      <label key={field.name} className="block">
        <span className="mb-1 block text-xs font-medium text-cream-200/80">
          {field.label}
          {field.required && <span className="ml-1 text-gold">*</span>}
        </span>

        {field.type === "boolean" ? (
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(event) => setValue(field.name, event.target.checked)}
            className="h-4 w-4 accent-gold"
          />
        ) : field.type === "textarea" || field.type === "json" ? (
          <textarea
            value={String(value ?? "")}
            onChange={(event) => setValue(field.name, event.target.value)}
            rows={field.type === "json" ? 4 : 3}
            className={`${common} font-mono`}
            placeholder={field.placeholder}
          />
        ) : field.type === "select" ? (
          <select
            value={value === null || value === undefined ? "" : String(value)}
            onChange={(event) => setValue(field.name, event.target.value)}
            className={common}
          >
            <option value="">— nessuna —</option>
            {(field.options ?? lookups[field.lookup ?? ""] ?? []).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            type={
              field.type === "number"
                ? "number"
                : field.type === "date"
                  ? "date"
                  : field.type === "datetime"
                    ? "datetime-local"
                    : "text"
            }
            value={value === null || value === undefined ? "" : String(value)}
            onChange={(event) => setValue(field.name, event.target.value)}
            min={field.min}
            max={field.max}
            className={common}
            placeholder={field.placeholder}
            required={field.required}
          />
        )}

        {field.help && <span className="mt-1 block text-[11px] text-cream-200/45">{field.help}</span>}

        {imageField?.name === field.name && (
          <span className="mt-2 block">
            <input
              type="file"
              accept="image/*"
              disabled={uploading || pending}
              onChange={(event) => handleUpload(event.target.files?.[0])}
              className="block text-xs text-cream-200/70 file:mr-2 file:rounded-md file:border-0 file:bg-gold/20 file:px-3 file:py-1 file:text-gold-light"
            />
            {uploading && <span className="mt-1 block text-xs text-gold-light">Caricamento…</span>}
          </span>
        )}
      </label>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Cerca…"
          aria-label="Cerca nella tabella"
          className="w-full max-w-xs rounded-lg border border-cream-300/20 bg-pine-900/70 px-3 py-2 text-sm outline-none focus:border-gold/60 focus-visible:ring-2 focus-visible:ring-gold/60"
        />
        <button
          type="button"
          onClick={openCreate}
          className="ml-auto rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-pine-950 hover:bg-gold-light"
        >
          + {createLabel}
        </button>
      </div>

      {filteredRows.length === 0 ? (
        <EmptyState message="Nessun elemento trovato. Crea il primo elemento o modifica la ricerca." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-cream-300/15">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-pine-900/70 text-[11px] uppercase tracking-wider text-cream-200/50">
              <tr>
                {resource.listFields.map((name) => (
                  <th key={name} className="px-4 py-3 font-medium">
                    {resource.fields.find((field) => field.name === name)?.label ?? name}
                  </th>
                ))}
                <th className="px-4 py-3 text-right font-medium">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-300/10">
              {filteredRows.map((row, index) => (
                <tr key={String(row.id ?? index)} className="hover:bg-cream-50/[0.03]">
                  {resource.listFields.map((name) => (
                    <td key={name} className="px-4 py-3 align-top text-cream-100/85">
                      {formatCell(
                        resource.fields.find((field) => field.name === name),
                        row[name],
                        lookups
                      )}
                    </td>
                  ))}
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => openEdit(row)}
                      className="rounded-md px-2 py-1 text-xs text-gold-light hover:bg-gold/10"
                    >
                      Modifica
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingId(String(row.id))}
                      className="rounded-md px-2 py-1 text-xs text-christmas-red-light hover:bg-christmas-red/10"
                    >
                      Elimina
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={editing !== null}
        onClose={closeEditor}
        title={isNew ? `Nuovo: ${resource.label}` : `Modifica: ${resource.label}`}
        wide
      >
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          {editableFields.map(renderField)}
          <div className="sm:col-span-2 flex justify-end gap-3 border-t border-cream-300/10 pt-4">
            <button
              type="button"
              onClick={closeEditor}
              className="rounded-lg border border-cream-300/20 px-4 py-2 text-sm"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={pending || uploading}
              className="rounded-lg bg-gold px-5 py-2 text-sm font-semibold text-pine-950 disabled:opacity-60"
            >
              {pending ? "Salvataggio…" : "Salva"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deletingId !== null}
        onCancel={() => setDeletingId(null)}
        onConfirm={handleDelete}
        title="Conferma eliminazione"
        message="Questa operazione è irreversibile. Eliminare comunque l'elemento?"
      />

      {toast && (
        <Toast
          message={toast.message}
          tone={toast.tone}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
