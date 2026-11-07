import { describe, expect, it } from 'vitest';
import { hasEventInProgress } from './ics';

const TZ = 'America/Toronto';

/** Bloc VTIMEZONE tel qu'Outlook l'exporte (nom Windows). */
const OUTLOOK_EASTERN = [
  'BEGIN:VTIMEZONE',
  'TZID:Eastern Standard Time',
  'BEGIN:STANDARD',
  'DTSTART:16010101T020000',
  'TZOFFSETFROM:-0400',
  'TZOFFSETTO:-0500',
  'RRULE:FREQ=YEARLY;INTERVAL=1;BYDAY=1SU;BYMONTH=11',
  'END:STANDARD',
  'BEGIN:DAYLIGHT',
  'DTSTART:16010101T020000',
  'TZOFFSETFROM:-0500',
  'TZOFFSETTO:-0400',
  'RRULE:FREQ=YEARLY;INTERVAL=1;BYDAY=2SU;BYMONTH=3',
  'END:DAYLIGHT',
  'END:VTIMEZONE',
];

const cal = (...events: string[][]): string =>
  ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Microsoft Corporation//Outlook 16.0 MIMEDIR//EN', ...OUTLOOK_EASTERN, ...events.flat(), 'END:VCALENDAR'].join('\r\n');

const vevent = (lines: string[]): string[] => ['BEGIN:VEVENT', ...lines, 'END:VEVENT'];

/** Cours chaque mardi 10 h – 12 h (heure de Montréal), depuis le 13 janvier 2026 (heure normale). */
const weeklyClass = (extra: string[] = []): string[] =>
  vevent([
    'UID:cours-1',
    'SUMMARY:Programmation web 2',
    'LOCATION:Local B-123',
    'DTSTART;TZID=Eastern Standard Time:20260113T100000',
    'DTEND;TZID=Eastern Standard Time:20260113T120000',
    'RRULE:FREQ=WEEKLY;BYDAY=TU',
    ...extra,
  ]);

const opts = { timeZone: TZ };

describe('hasEventInProgress — événement simple', () => {
  const ics = cal(
    vevent(['UID:a', 'SUMMARY:Réunion', 'DTSTART;TZID=America/Toronto:20261110T130000', 'DTEND;TZID=America/Toronto:20261110T140000']),
  );

  it('vrai pendant l’événement (fuseau IANA)', () => {
    // 13 h 30 à Montréal le 10 nov. (heure normale, UTC−5) = 18 h 30 UTC
    expect(hasEventInProgress(ics, new Date('2026-11-10T18:30:00Z'), opts)).toBe(true);
  });

  it('faux avant, à la fin exacte et après', () => {
    expect(hasEventInProgress(ics, new Date('2026-11-10T17:59:59Z'), opts)).toBe(false);
    expect(hasEventInProgress(ics, new Date('2026-11-10T19:00:00Z'), opts)).toBe(false);
    expect(hasEventInProgress(ics, new Date('2026-11-10T20:00:00Z'), opts)).toBe(false);
  });

  it('gère les heures UTC (suffixe Z)', () => {
    const z = cal(vevent(['UID:z', 'SUMMARY:x', 'DTSTART:20261110T180000Z', 'DTEND:20261110T190000Z']));
    expect(hasEventInProgress(z, new Date('2026-11-10T18:30:00Z'), opts)).toBe(true);
  });

  it('lit une heure flottante dans le fuseau de la config', () => {
    const f = cal(vevent(['UID:f', 'SUMMARY:x', 'DTSTART:20261110T130000', 'DTEND:20261110T140000']));
    expect(hasEventInProgress(f, new Date('2026-11-10T18:30:00Z'), opts)).toBe(true);
    expect(hasEventInProgress(f, new Date('2026-11-10T13:30:00Z'), opts)).toBe(false);
  });

  it('se rabat sur le fuseau de la config si un TZID Windows n’a pas de VTIMEZONE', () => {
    const ics2 = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      ...vevent(['UID:w', 'SUMMARY:x', 'DTSTART;TZID=Pacific Standard Time:20261110T130000', 'DTEND;TZID=Pacific Standard Time:20261110T140000']),
      'END:VCALENDAR',
    ].join('\r\n');
    expect(hasEventInProgress(ics2, new Date('2026-11-10T18:30:00Z'), opts)).toBe(true);
  });
});

describe('hasEventInProgress — récurrence et fuseau Windows d’Outlook', () => {
  it('trouve une occurrence future, de l’autre côté du changement d’heure', () => {
    // Mardi 16 juin 2026, 10 h 30 à Montréal (heure avancée, UTC−4) = 14 h 30 UTC.
    // Si le changement d’heure était ignoré (UTC−5 fixe), le cours commencerait à 15 h UTC.
    expect(hasEventInProgress(cal(weeklyClass()), new Date('2026-06-16T14:30:00Z'), opts)).toBe(true);
  });

  it('faux un autre jour ou après la fin du cours', () => {
    expect(hasEventInProgress(cal(weeklyClass()), new Date('2026-06-17T14:30:00Z'), opts)).toBe(false);
    expect(hasEventInProgress(cal(weeklyClass()), new Date('2026-06-16T16:30:00Z'), opts)).toBe(false);
  });

  it('vrai en hiver aussi (UTC−5)', () => {
    // Mardi 10 nov. 2026, 11 h à Montréal = 16 h UTC.
    expect(hasEventInProgress(cal(weeklyClass()), new Date('2026-11-10T16:00:00Z'), opts)).toBe(true);
  });

  it('respecte EXDATE (occurrence annulée)', () => {
    const ics = cal(weeklyClass(['EXDATE;TZID=Eastern Standard Time:20260616T100000']));
    expect(hasEventInProgress(ics, new Date('2026-06-16T14:30:00Z'), opts)).toBe(false);
    expect(hasEventInProgress(ics, new Date('2026-06-23T14:30:00Z'), opts)).toBe(true);
  });

  it('respecte une occurrence déplacée (RECURRENCE-ID)', () => {
    const moved = vevent([
      'UID:cours-1',
      'SUMMARY:Programmation web 2 (déplacé)',
      'RECURRENCE-ID;TZID=Eastern Standard Time:20260616T100000',
      'DTSTART;TZID=Eastern Standard Time:20260616T140000',
      'DTEND;TZID=Eastern Standard Time:20260616T160000',
    ]);
    const ics = cal(weeklyClass(), moved);
    expect(hasEventInProgress(ics, new Date('2026-06-16T14:30:00Z'), opts)).toBe(false); // ancien créneau
    expect(hasEventInProgress(ics, new Date('2026-06-16T18:30:00Z'), opts)).toBe(true); // nouveau créneau
  });

  it('respecte une occurrence annulée via RECURRENCE-ID + STATUS:CANCELLED', () => {
    const cancelled = vevent([
      'UID:cours-1',
      'SUMMARY:Programmation web 2',
      'STATUS:CANCELLED',
      'RECURRENCE-ID;TZID=Eastern Standard Time:20260616T100000',
      'DTSTART;TZID=Eastern Standard Time:20260616T100000',
      'DTEND;TZID=Eastern Standard Time:20260616T120000',
    ]);
    expect(hasEventInProgress(cal(weeklyClass(), cancelled), new Date('2026-06-16T14:30:00Z'), opts)).toBe(false);
  });

  it('s’arrête à UNTIL / COUNT', () => {
    const ics = cal(
      vevent([
        'UID:c',
        'SUMMARY:x',
        'DTSTART;TZID=Eastern Standard Time:20260113T100000',
        'DTEND;TZID=Eastern Standard Time:20260113T120000',
        'RRULE:FREQ=WEEKLY;BYDAY=TU;COUNT=3',
      ]),
    );
    expect(hasEventInProgress(ics, new Date('2026-01-27T15:30:00Z'), opts)).toBe(true); // 3ᵉ occurrence
    expect(hasEventInProgress(ics, new Date('2026-02-03T15:30:00Z'), opts)).toBe(false); // 4ᵉ : n’existe pas
  });
});

describe('hasEventInProgress — filtres', () => {
  it('ignore les événements « toute la journée »', () => {
    const ics = cal(vevent(['UID:j', 'SUMMARY:Tournoi de soccer', 'DTSTART;VALUE=DATE:20261107', 'DTEND;VALUE=DATE:20261108']));
    expect(hasEventInProgress(ics, new Date('2026-11-07T17:00:00Z'), { ...opts, keywords: ['soccer'] })).toBe(false);
  });

  it('ignore les événements « toute la journée » récurrents', () => {
    const ics = cal(vevent(['UID:j2', 'SUMMARY:Congé', 'DTSTART;VALUE=DATE:20260105', 'DTEND;VALUE=DATE:20260106', 'RRULE:FREQ=DAILY']));
    expect(hasEventInProgress(ics, new Date('2026-11-07T17:00:00Z'), opts)).toBe(false);
  });

  it('filtre par mots-clés, sans tenir compte de la casse ni des accents', () => {
    const ics = cal(vevent(['UID:s', 'SUMMARY:Pratique SÓCCER U12', 'DTSTART;TZID=America/Toronto:20261107T090000', 'DTEND;TZID=America/Toronto:20261107T103000']));
    const now = new Date('2026-11-07T14:30:00Z'); // 9 h 30 à Montréal
    expect(hasEventInProgress(ics, now, { ...opts, keywords: ['soccer'] })).toBe(true);
    expect(hasEventInProgress(ics, now, { ...opts, keywords: ['hockey'] })).toBe(false);
    expect(hasEventInProgress(ics, now, { ...opts, keywords: [] })).toBe(true);
  });

  it('ignore « Disponible » seulement si demandé', () => {
    const ics = cal(
      vevent(['UID:t', 'SUMMARY:Bloc perso', 'TRANSP:TRANSPARENT', 'DTSTART;TZID=America/Toronto:20261110T130000', 'DTEND;TZID=America/Toronto:20261110T140000']),
    );
    const now = new Date('2026-11-10T18:30:00Z');
    expect(hasEventInProgress(ics, now, { ...opts, ignoreFree: true })).toBe(false);
    expect(hasEventInProgress(ics, now, opts)).toBe(true);
  });

  it('ignore un événement annulé', () => {
    const ics = cal(
      vevent(['UID:x', 'SUMMARY:x', 'STATUS:CANCELLED', 'DTSTART;TZID=America/Toronto:20261110T130000', 'DTEND;TZID=America/Toronto:20261110T140000']),
    );
    expect(hasEventInProgress(ics, new Date('2026-11-10T18:30:00Z'), opts)).toBe(false);
  });
});
