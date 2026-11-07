/** Utilitaires partagés par les sources du statut (aucune dépendance externe). */

/** Rejette si `p` ne se termine pas avant `ms` ; `ctrl` (si fourni) est annulé à l'expiration. */
export function withTimeout<T>(p: Promise<T>, ms: number, label: string, ctrl?: AbortController): Promise<T> {
  let t: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    t = setTimeout(() => {
      ctrl?.abort();
      reject(new Error(`${label} : délai dépassé (${ms} ms)`));
    }, ms);
  });
  return Promise.race([p, timeout]).finally(() => clearTimeout(t));
}

/** fetch avec délai maximal (annule la requête à l'expiration). */
export async function fetchWithTimeout(url: string, init: RequestInit, ms: number, label: string): Promise<Response> {
  const ctrl = new AbortController();
  return withTimeout(fetch(url, { ...init, signal: ctrl.signal }), ms, label, ctrl);
}

/** Décalage (en minutes) du fuseau `timeZone` par rapport à UTC à l'instant `at`. */
export function tzOffsetMinutes(timeZone: string, at: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(at);
  const n = (type: string): number => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(n('year'), n('month') - 1, n('day'), n('hour'), n('minute'), n('second'));
  return Math.round((asUtc - Math.floor(at.getTime() / 1000) * 1000) / 60000);
}

/**
 * Convertit une heure murale (champs Y-M-D h:m:s) exprimée dans `timeZone` en instant UTC (ms).
 * Deux passes pour tomber juste autour des changements d'heure.
 */
export function wallTimeToEpoch(
  f: { year: number; month: number; day: number; hour: number; minute: number; second: number },
  timeZone: string,
): number {
  const naive = Date.UTC(f.year, f.month - 1, f.day, f.hour, f.minute, f.second);
  let guess = naive - tzOffsetMinutes(timeZone, new Date(naive)) * 60000;
  guess = naive - tzOffsetMinutes(timeZone, new Date(guess)) * 60000;
  return guess;
}

/** Vrai le samedi ou le dimanche dans le fuseau donné. */
export function isWeekend(now: Date, timeZone: string): boolean {
  const day = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(now);
  return day === 'Sat' || day === 'Sun';
}

/** Minuscules, sans accents : pour comparer des mots-clés. */
export const normalize = (s: string): string => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

/** Journalisation sobre : jamais de titre, lieu, URL ni jeton. */
export function logSourceError(source: string, err: unknown): void {
  const msg = err instanceof Error ? err.message : String(err);
  console.warn(`[status] source « ${source} » ignorée : ${msg}`);
}
