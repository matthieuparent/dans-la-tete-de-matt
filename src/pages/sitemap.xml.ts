import type { APIRoute } from 'astro';
import { CARNET_SECTIONS } from '../data/sections';
import { getIndexableSections, getNotes, noteUrl } from '../lib/carnet';
import { ETUDES } from '../data/etudes';

export const GET: APIRoute = async ({ site }) => {
  const notes = await getNotes();
  // Mêmes sections que celles qui ne sont pas en noindex (au moins une note ou une étude de cas).
  const indexable = await getIndexableSections();
  const withNotes = CARNET_SECTIONS.filter((s) => indexable.has(s));
  const latest = notes[0]?.data.date.toISOString();
  const urls: Array<[string, string | undefined]> = [
    ['/', latest],
    ['/carnet', latest],
    ...withNotes.map((s): [string, string | undefined] => [`/carnet/${s}`, notes.find((n) => n.data.section === s)?.data.date.toISOString()]),
    ...notes.map((n): [string, string] => [noteUrl(n), (n.data.updated ?? n.data.date).toISOString()]),
    ...ETUDES.map(({ etude }): [string, undefined] => [`/projets/${etude.slug}`, undefined]),
  ];
  const body = urls
    .map(([p, lastmod]) => `  <url><loc>${new URL(p, site).href}</loc>${lastmod ? `<lastmod>${lastmod.slice(0, 10)}</lastmod>` : ''}</url>`)
    .join('\n');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
