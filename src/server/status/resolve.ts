/**
 * Logique de priorité du statut (pure : aucune E/S ici, les sources sont injectées).
 *
 * 1. override manuel actif ; puis, dans l'ordre de `config.priority`, le premier statut dont
 *    AU MOINS UN détecteur répond vrai. Un détecteur qui échoue ou dépasse le délai compte comme
 *    « faux » : on passe au critère suivant sans rien casser. `defaut` sinon.
 */
import type { StatusConfig, StatusId } from '../../config/status';
import { logSourceError, withTimeout } from './util';

export interface Detector {
  /** Nom de la source (journaux seulement). */
  readonly name: string;
  readonly check: () => Promise<boolean> | boolean;
}

export type Detectors = Partial<Record<StatusId, readonly Detector[]>>;

export interface StatusPayload {
  readonly status: StatusId;
  readonly visibleText: string;
  readonly hoverText: string;
  readonly updatedAt: string;
}

async function safe(d: Detector, timeoutMs: number): Promise<boolean> {
  try {
    return (await withTimeout(Promise.resolve().then(d.check), timeoutMs, d.name)) === true;
  } catch (err) {
    logSourceError(d.name, err);
    return false;
  }
}

export async function resolveStatus(opts: {
  readonly override: StatusId | null;
  readonly detectors: Detectors;
  readonly priority: readonly StatusId[];
  readonly timeoutMs: number;
}): Promise<StatusId> {
  if (opts.override) return opts.override;
  for (const id of opts.priority) {
    if (id === 'defaut') return 'defaut';
    const list = opts.detectors[id] ?? [];
    if (list.length === 0) continue;
    // Les détecteurs d'un même statut tournent en parallèle (p. ex. Famille : soccer OU week-end).
    const results = await Promise.all(list.map((d) => safe(d, opts.timeoutMs)));
    if (results.some(Boolean)) return id;
  }
  return 'defaut';
}

/** Textes du statut ; la variante de survol est tirée au hasard. */
export function buildPayload(status: StatusId, config: StatusConfig, now: Date, random: () => number = Math.random): StatusPayload {
  const t = config.texts[status] ?? config.texts.defaut;
  const variants = t.hover.length ? t.hover : config.texts.defaut.hover;
  const hoverText = variants[Math.min(variants.length - 1, Math.floor(random() * variants.length))] ?? '';
  return { status, visibleText: t.visible, hoverText, updatedAt: now.toISOString() };
}
