import { getCollection, type CollectionEntry } from 'astro:content';
import { CARNET_SECTIONS, type CarnetSection } from '../data/sections';
import { ETUDES } from '../data/etudes';

export type Note = CollectionEntry<'carnet'>;

/** Notes publiées (les brouillons ne sont visibles qu'en développement), plus récentes d'abord. Exclut les notes à venir. */
export async function getNotes(): Promise<Note[]> {
  const all = await getCollection('carnet', ({ data }) => !data.upcoming && (import.meta.env.PROD ? !data.draft : true));
  return all.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

/** Notes annoncées (« À venir ») : listées dans le Carnet, sans page. */
export async function getUpcoming(): Promise<Note[]> {
  const all = await getCollection('carnet', ({ data }) => data.upcoming);
  return all.sort((a, b) => a.data.title.localeCompare(b.data.title, 'fr'));
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
  readonly kind: 'note' | 'projet' | 'avenir';
  readonly key: string;
  readonly title: string;
  /** Titre court, pour un bouton. */
  readonly accroche: string;
  readonly description: string;
  /** Sert au tri (un projet n'a qu'une année : 1er janvier de cette année). */
  readonly date: Date;
  /** Ce qu'on affiche : JJ.MM.AAAA pour une note, l'année pour un projet. */
  readonly dateLabel: string;
  readonly section: CarnetSection;
  /** Vide pour une note à venir (pas encore de page). */
  readonly url: string;
  /** « 3 min » pour une note, « Étude de cas » pour un projet. */
  readonly kicker: string;
  readonly thumb?: string;
}

/** « webjam 2026 : 36 heures pour… » → « webjam 2026 ». */
const court = (title: string): string => title.split(/\s:\s/)[0]!.trim();

const noteItem = (n: Note): CarnetItem => ({
  kind: 'note',
  key: `note:${n.id}`,
  title: n.data.title,
  accroche: n.data.accroche ?? court(n.data.title),
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
      accroche: projet.name,
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

const upcomingItem = (n: Note): CarnetItem => ({
  kind: 'avenir',
  key: `avenir:${n.id}`,
  title: n.data.title,
  accroche: n.data.accroche ?? court(n.data.title),
  description: n.data.description,
  date: n.data.date,
  dateLabel: '',
  section: n.data.section,
  url: '',
  kicker: 'À venir',
  ...(n.data.thumb ? { thumb: n.data.thumb } : {}),
});

/** Notes à venir en tête, puis notes + projets, plus récents d'abord. */
export async function getCarnetItems(): Promise<CarnetItem[]> {
  const notes = (await getNotes()).map(noteItem);
  const upcoming = (await getUpcoming()).map(upcomingItem);
  return [...upcoming, ...[...notes, ...getProjetItems()].sort((a, b) => b.date.getTime() - a.date.getTime())];
}

/** Sections du carnet qui ont au moins une page publiée (note ou étude de cas) : les seules indexées. */
export async function getIndexableSections(): Promise<Set<CarnetSection>> {
  return new Set((await getCarnetItems()).filter((i) => i.url).map((i) => i.section));
}

export const countItems = (items: CarnetItem[]): Record<CarnetSection, number> =>
  Object.fromEntries(CARNET_SECTIONS.map((s) => [s, items.filter((i) => i.section === s).length])) as Record<CarnetSection, number>;

/** « 2 notes · 1 projet · 3 à venir » */
export function countLabel(items: CarnetItem[]): string {
  const n = items.filter((i) => i.kind === 'note').length;
  const p = items.filter((i) => i.kind === 'projet').length;
  const a = items.filter((i) => i.kind === 'avenir').length;
  const parts = [n ? (n > 1 ? `${n} notes` : '1 note') : '', p ? (p > 1 ? `${p} projets` : '1 projet') : '', a ? `${a} à venir` : ''].filter(Boolean);
  return parts.join(' · ') || 'Rien pour l’instant';
}
