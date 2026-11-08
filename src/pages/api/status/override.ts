/**
 * Override manuel du statut (raccourci sur téléphone).
 *
 *   POST   /api/status/override   Authorization: Bearer <STATUS_OVERRIDE_SECRET>
 *          { "status": "jeu", "minutes": 90 }      → force « jeu » pendant 90 min
 *          { "status": "auto" }                   → retour au calcul automatique
 *   DELETE /api/status/override   (même en-tête)  → retour au calcul automatique
 */
import type { APIRoute } from 'astro';
import { createHash, timingSafeEqual } from 'node:crypto';
import { STATUS_CONFIG, STATUS_IDS, isStatusId } from '../../../config/status';
import { clearOverride, setOverride } from '../../../server/status/override';
import { getStatus, invalidateStatus } from '../../../server/status/service';

export const prerender = false;

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });

const digest = (s: string): Buffer => createHash('sha256').update(s).digest();

/** null si autorisé, sinon la réponse d'erreur. */
function authorize(request: Request): Response | null {
  const secret = process.env.STATUS_OVERRIDE_SECRET?.trim();
  if (!secret || secret.length < 16) return json({ error: 'override désactivé (secret absent ou trop court)' }, 503);
  const header = request.headers.get('authorization') ?? '';
  const given = header.replace(/^Bearer\s+/i, '').trim();
  // Comparaison à temps constant (sur les empreintes, de même longueur).
  if (!given || !timingSafeEqual(digest(given), digest(secret))) return json({ error: 'non autorisé' }, 401);
  return null;
}

export const POST: APIRoute = async ({ request }) => {
  const denied = authorize(request);
  if (denied) return denied;

  let body: { status?: unknown; minutes?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ error: 'corps JSON attendu' }, 400);
  }

  if (body.status === 'auto') {
    await clearOverride();
    invalidateStatus();
    return json({ override: null, ...(await getStatus()) });
  }
  if (!isStatusId(body.status)) return json({ error: `status attendu : ${[...STATUS_IDS, 'auto'].join(', ')}` }, 400);

  const minutes = body.minutes === undefined ? 60 : Number(body.minutes);
  if (!Number.isFinite(minutes) || minutes <= 0 || minutes > STATUS_CONFIG.maxOverrideMinutes) {
    return json({ error: `minutes : nombre entre 1 et ${STATUS_CONFIG.maxOverrideMinutes}` }, 400);
  }

  const expiresAt = Date.now() + Math.round(minutes * 60_000);
  await setOverride({ status: body.status, expiresAt });
  invalidateStatus();
  return json({ override: { status: body.status, expiresAt: new Date(expiresAt).toISOString() }, ...(await getStatus()) });
};

export const DELETE: APIRoute = async ({ request }) => {
  const denied = authorize(request);
  if (denied) return denied;
  await clearOverride();
  invalidateStatus();
  return json({ override: null, ...(await getStatus()) });
};
