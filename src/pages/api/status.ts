/** GET /api/status → { status, visibleText, hoverText, updatedAt } (calculé serveur, en cache). */
import type { APIRoute } from 'astro';
import { getStatus } from '../../server/status/service';

export const prerender = false;

export const GET: APIRoute = async () => {
  const payload = await getStatus();
  return new Response(JSON.stringify(payload), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      // Cache serveur de 5 min ; côté navigateur/proxy, court pour qu'un override se voie vite.
      'Cache-Control': 'public, max-age=60, stale-while-revalidate=240',
      'X-Content-Type-Options': 'nosniff',
    },
  });
};
