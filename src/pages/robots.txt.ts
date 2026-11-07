import type { APIRoute } from 'astro';

/** Ouvert à tous les robots, y compris ceux des moteurs génératifs (stratégie GEO : être cité). */
export const GET: APIRoute = ({ site }) =>
  new Response(`User-agent: *\nAllow: /\n\nSitemap: ${new URL('/sitemap.xml', site).href}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
