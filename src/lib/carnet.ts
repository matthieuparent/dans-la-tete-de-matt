import { getCollection, type CollectionEntry } from 'astro:content';
import { CARNET_SECTIONS, type CarnetSection } from '../data/sections';

export type Note = CollectionEntry<'carnet'>;

/** Notes publiées (les brouillons ne sont visibles qu'en développement), plus récentes d'abord. */
export async function getNotes(): Promise<Note[]> {
  const all = await getCollection('carnet', ({ data }) => (import.meta.env.PROD ? !data.draft : true));
  return all.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

export const noteUrl = (n: Note): string => `/carnet/${n.data.section}/${n.id}`;

export const countBySection = (notes: Note[]): Record<CarnetSection, number> =>
  Object.fromEntries(CARNET_SECTIONS.map((s) => [s, notes.filter((n) => n.data.section === s).length])) as Record<CarnetSection, number>;

const dateFmt = new Intl.DateTimeFormat('fr-CA', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
/** 07.11.2026 — format des maquettes. */
export const formatDate = (d: Date): string => dateFmt.format(d).split('-').reverse().join('.');

/** Temps de lecture (230 mots/min), arrondi à la minute supérieure. */
export function readingMinutes(n: Note): number {
  const text = (n.body ?? '').replace(/<[^>]+>|```[\s\S]*?```|import .*$/gm, ' ');
  const words = text.split(/\s+/).filter(Boolean).length;
  return n.data.minutes ?? Math.max(1, Math.ceil(words / 230));
}

export const pluralNotes = (k: number): string => (k <= 1 ? `${k} note` : `${k} notes`);
