import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { STATUS_CONFIG, type StatusConfig } from '../../config/status';
import { buildPayload, resolveStatus, type Detector, type Detectors } from './resolve';
import { computeStatus } from './service';
import { clearOverride, getActiveOverride, setOverride } from './override';
import { pushedRecently } from './sources/github';
import { isOnline } from './sources/psn';
import { isWeekend } from './util';

const priority = STATUS_CONFIG.priority;
const yes = (name = 'oui'): Detector => ({ name, check: () => true });
const no = (name = 'non'): Detector => ({ name, check: () => false });
const boom = (name = 'panne'): Detector => ({ name, check: () => Promise.reject(new Error('panne simulée')) });
const slow = (name = 'lent'): Detector => ({ name, check: () => new Promise<boolean>((r) => setTimeout(() => r(true), 500)) });

const resolve = (detectors: Detectors, override: Parameters<typeof resolveStatus>[0]['override'] = null) =>
  resolveStatus({ override, detectors, priority, timeoutMs: 50 });

describe('resolveStatus — priorité', () => {
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);

  it('l’override manuel l’emporte sur tout', async () => {
    expect(await resolve({ enseignement: [yes()], projets: [yes()], famille: [yes()] }, 'jeu')).toBe('jeu');
  });

  it('Enseignement > Projets > Jeu > Famille', async () => {
    expect(await resolve({ enseignement: [yes()], projets: [yes()], jeu: [yes()], famille: [yes()] })).toBe('enseignement');
    expect(await resolve({ enseignement: [no()], projets: [yes()], jeu: [yes()], famille: [yes()] })).toBe('projets');
    expect(await resolve({ enseignement: [no()], projets: [no()], jeu: [yes()], famille: [yes()] })).toBe('jeu');
    expect(await resolve({ enseignement: [no()], projets: [no()], jeu: [no()], famille: [yes()] })).toBe('famille');
  });

  it('Défaut quand rien ne correspond (ou aucun détecteur)', async () => {
    expect(await resolve({ enseignement: [no()], projets: [no()], jeu: [no()], famille: [no(), no()] })).toBe('defaut');
    expect(await resolve({})).toBe('defaut');
  });

  it('Famille : soccer seul, week-end seul, ou les deux', async () => {
    const famille = (soccer: boolean, weekend: boolean) => resolve({ famille: [soccer ? yes('soccer') : no('soccer'), weekend ? yes('week-end') : no('week-end')] });
    expect(await famille(true, false)).toBe('famille');
    expect(await famille(false, true)).toBe('famille');
    expect(await famille(true, true)).toBe('famille');
    expect(await famille(false, false)).toBe('defaut');
  });

  it('une source en panne passe au critère suivant', async () => {
    expect(await resolve({ enseignement: [boom()], projets: [boom()], jeu: [yes()] })).toBe('jeu');
    expect(await resolve({ famille: [boom('calendrier'), yes('week-end')] })).toBe('famille');
  });

  it('une source trop lente est abandonnée', async () => {
    expect(await resolve({ enseignement: [slow()], famille: [yes()] })).toBe('famille');
  });

  it('respecte un ordre de priorité personnalisé', async () => {
    const r = await resolveStatus({ override: null, detectors: { jeu: [yes()], famille: [yes()] }, priority: ['famille', 'jeu', 'defaut'], timeoutMs: 50 });
    expect(r).toBe('famille');
  });
});

describe('buildPayload', () => {
  it('renvoie le texte visible complet et une variante de survol tirée au hasard', () => {
    const config: StatusConfig = {
      ...STATUS_CONFIG,
      texts: { ...STATUS_CONFIG.texts, jeu: { visible: 'V', hover: ['a', 'b', 'c'] } },
    };
    const now = new Date('2026-11-07T12:00:00Z');
    expect(buildPayload('jeu', config, now, () => 0)).toEqual({ status: 'jeu', visibleText: 'V', hoverText: 'a', updatedAt: '2026-11-07T12:00:00.000Z' });
    expect(buildPayload('jeu', config, now, () => 0.5).hoverText).toBe('b');
    expect(buildPayload('jeu', config, now, () => 0.9999).hoverText).toBe('c');
  });

  it('n’expose que status, visibleText, hoverText, updatedAt', () => {
    expect(Object.keys(buildPayload('defaut', STATUS_CONFIG, new Date())).sort()).toEqual(['hoverText', 'status', 'updatedAt', 'visibleText']);
  });
});

describe('aides des sources', () => {
  it('week-end selon le fuseau configuré', () => {
    // Dimanche 23 h 30 à Montréal = lundi 4 h 30 UTC : encore le week-end.
    expect(isWeekend(new Date('2026-11-09T04:30:00Z'), 'America/Toronto')).toBe(true);
    // Vendredi 23 h à Montréal = samedi 4 h UTC : pas encore le week-end.
    expect(isWeekend(new Date('2026-11-07T04:00:00Z'), 'America/Toronto')).toBe(false);
    expect(isWeekend(new Date('2026-11-10T15:00:00Z'), 'America/Toronto')).toBe(false); // mardi
  });

  it('GitHub : push dans la dernière heure', () => {
    const now = new Date('2026-11-10T15:00:00Z');
    expect(pushedRecently([{ pushed_at: '2026-11-10T14:10:00Z' }], now, 60)).toBe(true);
    expect(pushedRecently([{ pushed_at: '2026-11-10T13:59:00Z' }, { pushed_at: null }], now, 60)).toBe(false);
    expect(pushedRecently([], now, 60)).toBe(false);
  });

  it('PSN : en ligne seulement si onlineStatus = online', () => {
    expect(isOnline({ basicPresence: { primaryPlatformInfo: { onlineStatus: 'online' } } })).toBe(true);
    expect(isOnline({ basicPresence: { primaryPlatformInfo: { onlineStatus: 'offline' } } })).toBe(false);
    expect(isOnline({})).toBe(false);
  });
});

/* ---------------- calcul complet, sources mockées (fetch) ---------------- */

const familyIcs = [
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  'BEGIN:VEVENT',
  'UID:soccer',
  'SUMMARY:Soccer – Léa',
  'DTSTART;TZID=America/Toronto:20261111T180000',
  'DTEND;TZID=America/Toronto:20261111T193000',
  'RRULE:FREQ=WEEKLY;BYDAY=WE',
  'END:VEVENT',
  'END:VCALENDAR',
].join('\r\n');
const emptyIcs = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR';

describe('computeStatus — sources mockées', () => {
  let dir = '';
  const env = { CAL_WORK_ICS_URL: 'https://example.test/work.ics', CAL_FAMILY_ICS_URL: 'https://example.test/family.ics', GITHUB_TOKEN: 'x' };

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'status-'));
    process.env.STATUS_DATA_DIR = dir;
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(async () => {
    vi.unstubAllGlobals();
    await clearOverride();
  });
  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  const stubFetch = (routes: Record<string, () => Response>) =>
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      const hit = Object.entries(routes).find(([k]) => url.includes(k));
      if (!hit) throw new Error('réseau indisponible');
      return hit[1]();
    }));
  const text = (body: string) => () => new Response(body, { status: 200 });
  const json = (body: unknown) => () => new Response(JSON.stringify(body), { status: 200 });

  it('mercredi soir, soccer au calendrier familial → Famille (sans fuite de détails)', async () => {
    stubFetch({ 'work.ics': text(emptyIcs), 'family.ics': text(familyIcs), 'api.github.com': json([]) });
    // Mercredi 11 nov., 18 h 30 à Montréal = 23 h 30 UTC (PSN absent de l’env → ignoré).
    const r = await computeStatus(new Date('2026-11-11T23:30:00Z'), STATUS_CONFIG, env);
    expect(r.status).toBe('famille');
    expect(JSON.stringify(r)).not.toMatch(/soccer|Léa/i);
  });

  it('samedi sans aucun événement → Famille (week-end)', async () => {
    stubFetch({ 'work.ics': text(emptyIcs), 'family.ics': text(emptyIcs), 'api.github.com': json([]) });
    const r = await computeStatus(new Date('2026-11-07T17:00:00Z'), STATUS_CONFIG, env);
    expect(r.status).toBe('famille');
  });

  it('push récent → Projets, même si le calendrier de travail est en panne', async () => {
    stubFetch({ 'work.ics': () => new Response('nope', { status: 500 }), 'family.ics': text(familyIcs), 'api.github.com': json([{ pushed_at: '2026-11-10T14:40:00Z' }]) });
    const r = await computeStatus(new Date('2026-11-10T15:00:00Z'), STATUS_CONFIG, env);
    expect(r.status).toBe('projets');
  });

  it('tout est en panne un mardi → Défaut', async () => {
    stubFetch({});
    const r = await computeStatus(new Date('2026-11-10T15:00:00Z'), STATUS_CONFIG, env);
    expect(r).toMatchObject({ status: 'defaut', visibleText: STATUS_CONFIG.texts.defaut.visible });
  });

  it('un override actif l’emporte, puis expire', async () => {
    stubFetch({});
    const now = new Date('2026-11-10T15:00:00Z');
    await setOverride({ status: 'jeu', expiresAt: now.getTime() + 60_000 });
    expect((await computeStatus(now, STATUS_CONFIG, env)).status).toBe('jeu');
    const later = new Date(now.getTime() + 120_000);
    expect(await getActiveOverride(later)).toBeNull();
    expect((await computeStatus(later, STATUS_CONFIG, env)).status).toBe('defaut');
  });
});
