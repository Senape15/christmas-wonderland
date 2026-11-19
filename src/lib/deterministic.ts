/**
 * Hash intero deterministico → valore in [0, 1).
 *
 * Aritmetica intera a 32 bit (`Math.imul`, shift): identica in ogni motore
 * JavaScript, a differenza di `Math.sin`, che può restituire differenze
 * nell'ultima cifra tra Node e browser. Serve per generare valori decorativi
 * (neve, luci) che devono coincidere tra render server e idratazione.
 */
export function hashUnit(index: number, salt: number): number {
  let h = Math.imul(index + 1, 0x9e3779b1) ^ Math.imul(salt + 1, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
  h ^= h >>> 16;

  return (h >>> 0) / 0x100000000;
}
