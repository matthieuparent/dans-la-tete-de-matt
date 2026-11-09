/**
 * llms.txt : résumé en Markdown destiné aux moteurs génératifs (GEO).
 * Convention émergente (llmstxt.org), non standardisée : coût nul, bénéfice possible.
 */
import type { APIRoute } from 'astro';
import { PROFILE, SECTIONS, plain } from '../data/sections';
import { getNotes, noteUrl } from '../lib/carnet';
import { ETUDES } from '../data/etudes';

export const GET: APIRoute = async ({ site }) => {
  const notes = await getNotes();
  const u = (p: string): string => new URL(p, site).href;
  const lines = [
    '# Dans la tête de Matt · Matthieu Parent',
    '',
    `> ${PROFILE.name}, ${PROFILE.headline}`,
    '',
    `${PROFILE.name} est ${PROFILE.jobTitle.charAt(0).toLowerCase()}${PROFILE.jobTitle.slice(1)} au ${PROFILE.employer.name} (${PROFILE.city}). ${PROFILE.tagline}`,
    '',
    '## Sections',
    ...SECTIONS.filter((s) => s.id !== 'intro').map((s) => `- [${plain(s.title)}](${u(`/#${s.id}`)}): ${s.text}`),
    '',
    '## Études de cas',
    ...ETUDES.map(({ projet, etude }) => `- [${projet.name} (${projet.year})](${u(`/projets/${etude.slug}`)}): ${projet.summary}`),
    '',
    '## Carnet',
    ...notes.map((n) => `- [${n.data.title}](${u(noteUrl(n))}): ${n.data.description}`),
    '',
  ];
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
