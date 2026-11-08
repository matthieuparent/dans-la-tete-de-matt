import { getCollection, type CollectionEntry } from 'astro:content';
import { CARNET_SECTIONS, type CarnetSection } from '../data/sections';
import { ETUDES } from '../data/etudes';

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

/* ------------------------------------------------------------------ */
/* Éléments du Carnet : notes ET projets (études de cas)               */
/* ------------------------------------------------------------------ */


export interface CarnetItem {
  readonly kind: 'note' | 'projet';
  readonly key: string;
  readonly title: string;
  readonly description: string;
  /** Sert au tri (un projet n'a qu'une année : 1er janvier de cette année). */
  readonly date: Date;
  /** Ce qu'on affiche : JJ.MM.AAAA pour une note, l'année pour un projet. */
  readonly dateLabel: string;
  readonly section: CarnetSection;
  readonly url: string;
  /** « 3 min » pour une note, « Étude de cas » pour un projet. */
  readonly kicker: string;
  readonly thumb?: string;
}

const noteItem = (n: Note): CarnetItem => ({
  kind: 'note',
  key: `note:${n.id}`,
  title: n.data.title,
  description: n.data.description,
  date: n.data.date,
  dateLabel: formatDate(n.data.date),
  section: n.data.section,
  url: noteUrl(n),
  kicker: `${readingMinutes(n)} min`,
  ...(n.data.thumb ? { thumb: n.data.thumb } : {}),
});

/** Les projets qui ont une page (étude de cas), rangés dans la section « Projets ». */
export function getProjetItems(): CarnetItem[] {
  return ETUDES.map(({ projet, etude }) => {
    const year = /^\d{4}$/.test(projet.year) ? Number(projet.year) : 1970;
    return {
      kind: 'projet' as const,
      key: `projet:${projet.id}`,
      title: projet.name,
      description: projet.summary,
      date: new Date(Date.UTC(year, 0, 1)),
      dateLabel: projet.year,
      section: 'projets' as const,
      url: `/projets/${etude.slug}`,
      kicker: 'Étude de cas',
      ...(projet.thumb ? { thumb: projet.thumb } : {}),
    };
  });
}

/** Notes + projets, plus récents d'abord. */
export async function getCarnetItems(): Promise<CarnetItem[]> {
  const notes = (await getNotes()).map(noteItem);
  return [...notes, ...getProjetItems()].sort((a, b) => b.date.getTime() - a.date.getTime());
}

export const countItems = (items: CarnetItem[]): Record<CarnetSection, number> =>
  Object.fromEntries(CARNET_SECTIONS.map((s) => [s, items.filter((i) => i.section === s).length])) as Record<CarnetSection, number>;

/** « 2 notes · 1 projet » */
export function countLabel(items: CarnetItem[]): string {
  const n = items.filter((i) => i.kind === 'note').length;
  const p = items.length - n;
  const parts = [n ? (n > 1 ? `${n} notes` : '1 note') : '', p ? (p > 1 ? `${p} projets` : '1 projet') : ''].filter(Boolean);
  return parts.join(' · ') || 'Rien pour l’instant';
}
