/**
 * Gate della scatola finale (Fase 5).
 *
 * Indizi, oggetti e messaggio finale sono parte della rivelazione: il server
 * non deve inviarli al browser finché la password/scatola non è stata
 * completata. Anche se l'UI li nascondesse, una risposta API diretta non deve
 * contenere alcun testo anticipato.
 */

export function gateFinalBoxDetails<T>(
  values: readonly T[] | null | undefined,
  completed: boolean
): T[] {
  return completed ? [...(values ?? [])] : [];
}

export function gateFinalBoxMessage(
  value: string | null | undefined,
  completed: boolean
): string {
  return completed ? String(value ?? "") : "";
}
