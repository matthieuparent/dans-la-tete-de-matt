/**
 * Override manuel du statut, avec expiration. Conservé en mémoire ET dans un petit fichier JSON
 * (STATUS_DATA_DIR, par défaut ./.data) pour survivre à un redémarrage du serveur.
 */
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { isStatusId, type StatusId } from '../../config/status';

export interface Override {
  readonly status: StatusId;
  /** Expiration (ms epoch). */
  readonly expiresAt: number;
}

let cached: Override | null | undefined; // undefined : fichier pas encore lu

const filePath = (): string => join(process.env.STATUS_DATA_DIR?.trim() || '.data', 'status-override.json');

async function load(): Promise<Override | null> {
  if (cached !== undefined) return cached;
  try {
    const data = JSON.parse(await readFile(filePath(), 'utf8')) as Partial<Override>;
    cached = isStatusId(data.status) && typeof data.expiresAt === 'number' ? { status: data.status, expiresAt: data.expiresAt } : null;
  } catch {
    cached = null;
  }
  return cached;
}

/** Override actif à `now`, sinon null (un override expiré est effacé). */
export async function getActiveOverride(now: Date): Promise<Override | null> {
  const o = await load();
  if (o && o.expiresAt > now.getTime()) return o;
  if (o) await clearOverride();
  return null;
}

export async function setOverride(o: Override): Promise<void> {
  cached = o;
  try {
    await mkdir(join(filePath(), '..'), { recursive: true });
    await writeFile(filePath(), JSON.stringify(o), 'utf8');
  } catch (err) {
    console.warn('[status] override non persisté (reste en mémoire) :', err instanceof Error ? err.message : err);
  }
}

export async function clearOverride(): Promise<void> {
  cached = null;
  await rm(filePath(), { force: true }).catch(() => undefined);
}
