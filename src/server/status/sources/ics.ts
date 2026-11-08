/**
 * Source « calendrier ICS » (Outlook publié) : y a-t-il un événement EN COURS ?
 *
 * - Récurrences : RRULE, EXDATE, RDATE et occurrences modifiées (RECURRENCE-ID) via ical.js.
 * - Fuseaux : les blocs VTIMEZONE du fichier sont enregistrés (Outlook y met des noms Windows,
 *   p. ex. « Eastern Standard Time ») ; une heure sans fuseau connu est lue dans le fuseau
 *   de la config.
 * - Les événements « toute la journée » (DTSTART en DATE) sont ignorés.
 * - Seul un booléen sort d'ici : ni titre, ni lieu, ni détails.
 */
import ICAL from 'ical.js';
import type { CalendarConfig } from '../../../config/status';
import { fetchWithTimeout, normalize, wallTimeToEpoch } from '../util';

type Time = InstanceType<typeof ICAL.Time>;
type Event = InstanceType<typeof ICAL.Event>;

export interface IcsMatchOptions {
  readonly keywords?: readonly string[];
  readonly ignoreFree?: boolean;
  /** Fuseau utilisé pour les heures « flottantes » ou à fuseau inconnu. */
  readonly timeZone: string;
}

/** Garde-fou : nombre maximal d'occurrences parcourues par événement récurrent. */
const MAX_OCCURRENCES = 20000;

const isValidIana = (tz: string): boolean => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

/** Instant UTC (ms) d'une heure ical.js, y compris flottante. */
function epochOf(t: Time, fallbackTz: string): number {
  const zone = t.zone;
  const floating = !zone || zone === ICAL.Timezone.localTimezone;
  if (!floating) return t.toUnixTime() * 1000;
  const tzid = (t as Time & { timezone?: string }).timezone;
  const tz = tzid && isValidIana(tzid) ? tzid : fallbackTz;
  return wallTimeToEpoch(
    { year: t.year, month: t.month, day: t.day, hour: t.hour, minute: t.minute, second: t.second },
    tz,
  );
}

function matchesFilters(ev: Event, opts: IcsMatchOptions): boolean {
  const c = ev.component;
  if (String(c.getFirstPropertyValue('status') ?? '').toUpperCase() === 'CANCELLED') return false;
  if (opts.ignoreFree) {
    const transp = String(c.getFirstPropertyValue('transp') ?? '').toUpperCase();
    const busy = String(c.getFirstPropertyValue('x-microsoft-cdo-busystatus') ?? '').toUpperCase();
    if (transp === 'TRANSPARENT' || busy === 'FREE') return false;
  }
  const kws = opts.keywords?.filter(Boolean) ?? [];
  if (kws.length === 0) return true;
  const summary = normalize(String(ev.summary ?? ''));
  return kws.some((k) => summary.includes(normalize(k)));
}

/** Logique pure (testable) : un événement correspondant est-il en cours à `now` ? */
export function hasEventInProgress(icsText: string, now: Date, opts: IcsMatchOptions): boolean {
  const root = new ICAL.Component(ICAL.parse(icsText));
  // Enregistrer les fuseaux AVANT de lire les dates (ical.js les résout à la lecture).
  for (const vtz of root.getAllSubcomponents('vtimezone')) {
    const tzid = String(vtz.getFirstPropertyValue('tzid') ?? '');
    if (tzid) ICAL.TimezoneService.register(new ICAL.Timezone(vtz));
  }

  const vevents = root.getAllSubcomponents('vevent');
  const exceptions = new Map<string, InstanceType<typeof ICAL.Component>[]>();
  const masters: InstanceType<typeof ICAL.Component>[] = [];
  for (const v of vevents) {
    if (v.hasProperty('recurrence-id')) {
      const uid = String(v.getFirstPropertyValue('uid') ?? '');
      const list = exceptions.get(uid) ?? [];
      list.push(v);
      exceptions.set(uid, list);
    } else masters.push(v);
  }

  const t = now.getTime();
  const inRange = (start: Time, end: Time): boolean => {
    if (start.isDate) return false; // toute la journée : ignoré
    return epochOf(start, opts.timeZone) <= t && t < epochOf(end, opts.timeZone);
  };

  for (const comp of masters) {
    const uid = String(comp.getFirstPropertyValue('uid') ?? '');
    const ev = new ICAL.Event(comp, { exceptions: exceptions.get(uid) ?? [], strictExceptions: true });
    if (!ev.startDate) continue;

    if (!ev.isRecurring()) {
      if (matchesFilters(ev, opts) && inRange(ev.startDate, ev.endDate)) return true;
      continue;
    }

    const it = ev.iterator();
    for (let i = 0, next = it.next(); next && i < MAX_OCCURRENCES; i++, next = it.next()) {
      const occ = ev.getOccurrenceDetails(next);
      // Les occurrences sont triées par date de départ d'origine ; une exception déplacée
      // peut commencer plus tôt, d'où la marge d'un jour avant d'arrêter.
      if (epochOf(next, opts.timeZone) > t + 86_400_000) break;
      if (occ.item && !matchesFilters(occ.item, opts)) continue;
      if (inRange(occ.startDate, occ.endDate)) return true;
    }
  }
  // Occurrences modifiées vérifiées telles quelles : couvre celles déplacées loin de leur date
  // d'origine (au-delà de la marge) et celles dont la série n'est pas dans le fichier.
  for (const list of exceptions.values()) {
    for (const exc of list) {
      const e = new ICAL.Event(exc);
      if (e.startDate && matchesFilters(e, opts) && inRange(e.startDate, e.endDate)) return true;
    }
  }
  return false;
}

/** Télécharge un calendrier ICS et applique `hasEventInProgress`. */
export async function checkIcsCalendar(
  cal: CalendarConfig,
  now: Date,
  ctx: { env: Record<string, string | undefined>; timeZone: string; timeoutMs: number },
): Promise<boolean> {
  const raw = ctx.env[cal.urlEnv]?.trim();
  if (!raw) throw new Error(`variable ${cal.urlEnv} absente`);
  // Outlook donne parfois des liens webcal:// : même ressource en https.
  const url = raw.replace(/^webcal:\/\//i, 'https://');
  const res = await fetchWithTimeout(url, { headers: { Accept: 'text/calendar' } }, ctx.timeoutMs, cal.name);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  if (!text.includes('BEGIN:VCALENDAR')) throw new Error('réponse non ICS');
  return hasEventInProgress(text, now, { keywords: cal.keywords, ignoreFree: cal.ignoreFree, timeZone: ctx.timeZone });
}
