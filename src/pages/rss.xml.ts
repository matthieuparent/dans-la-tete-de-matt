import type { APIRoute } from 'astro';
import { getNotes, noteUrl } from '../lib/carnet';

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const GET: APIRoute = async ({ site }) => {
  const notes = await getNotes();
  const items = notes
    .map((n) => {
      const url = new URL(noteUrl(n), site).href;
      return `    <item><title>${esc(n.data.title)}</title><link>${url}</link><guid>${url}</guid><pubDate>${n.data.date.toUTCString()}</pubDate><description>${esc(n.data.description)}</description><category>${n.data.section}</category></item>`;
    })
    .join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Carnet de Matt</title>
    <link>${new URL('/carnet', site).href}</link>
    <description>Making-of, notes de cours, jeux, IA et vie de famille — par Matthieu Parent.</description>
    <language>fr-CA</language>
${items}
  </channel>
</rss>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
};
