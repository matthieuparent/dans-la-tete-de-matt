/**
 * Assemble les sources selon la config, applique la priorité et met le résultat en cache
 * (STATUS_CONFIG.cacheSeconds). Un seul calcul à la fois : les requêtes simultanées partagent
 * la même promesse.
 */
import { STATUS_CONFIG, type StatusConfig, type StatusId } from '../../config/status';
import { getActiveOverride } from './override';
import { buildPayload, resolveStatus, type Detector, type Detectors, type StatusPayload } from './resolve';
import { checkGitHub } from './sources/github';
import { checkIcsCalendar } from './sources/ics';
import { checkPsn } from './sources/psn';
import { isWeekend } from './util';

type Env = Record<string, string | undefined>;

export function buildDetectors(config: StatusConfig, now: Date, env: Env): Detectors {
  const out: Partial<Record<StatusId, Detector[]>> = {};
  const add = (id: StatusId, d: Detector): void => {
    (out[id] ??= []).push(d);
  };
  const timeoutMs = config.sourceTimeoutMs;

  for (const cal of config.calendars) {
    if (cal.source !== 'ics') continue;
    for (const id of cal.triggers) {
      add(id, { name: cal.name, check: () => checkIcsCalendar(cal, now, { env, timeZone: config.timeZone, timeoutMs }) });
    }
  }
  add('projets', { name: 'GitHub', check: () => checkGitHub(now, { env, windowMinutes: config.github.windowMinutes, timeoutMs }) });
  add('jeu', { name: 'PSN', check: () => checkPsn({ env, timeoutMs }) });
  if (config.famille.weekend) add('famille', { name: 'Week-end', check: () => isWeekend(now, config.timeZone) });
  return out;
}

export async function computeStatus(now = new Date(), config = STATUS_CONFIG, env: Env = process.env): Promise<StatusPayload> {
  const override = await getActiveOverride(now).catch(() => null);
  const status = await resolveStatus({
    override: override?.status ?? null,
    detectors: buildDetectors(config, now, env),
    priority: config.priority,
    // Marge au-dessus du délai propre à chaque source (fetch) pour garder leur message d'erreur.
    timeoutMs: config.sourceTimeoutMs + 1000,
  });
  return buildPayload(status, config, now);
}

let cache: { value: StatusPayload; expiresAt: number } | null = null;
let inflight: Promise<StatusPayload> | null = null;
/** Incrémenté à chaque invalidation : un calcul lancé avant ne peut plus remplir le cache. */
let generation = 0;

export async function getStatus(): Promise<StatusPayload> {
  if (cache && cache.expiresAt > Date.now()) return cache.value;
  const gen = generation;
  inflight ??= computeStatus()
    .catch((err: unknown) => {
      console.warn('[status] calcul impossible, statut par défaut :', err instanceof Error ? err.message : err);
      return buildPayload('defaut', STATUS_CONFIG, new Date());
    })
    .then((value) => {
      if (gen === generation) cache = { value, expiresAt: Date.now() + STATUS_CONFIG.cacheSeconds * 1000 };
      return value;
    })
    .finally(() => {
      if (gen === generation) inflight = null;
    });
  return inflight;
}

/** Après un override : le prochain appel recalcule. */
export function invalidateStatus(): void {
  generation++;
  cache = null;
  inflight = null;
}
