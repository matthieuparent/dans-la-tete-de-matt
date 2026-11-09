/** Données structurées JSON-LD (schema.org). Un seul graphe par page, entités reliées par @id. */
import { PROFILE } from '../data/sections';

export const SITE_NAME = 'Dans la tête de Matt';
export const LOCALE = 'fr-CA';

export type JsonLd = Record<string, unknown>;

export const personId = (site: URL): string => new URL('/#matthieu', site).href;
export const websiteId = (site: URL): string => new URL('/#site', site).href;

export function person(site: URL): JsonLd {
  return {
    '@type': 'Person',
    '@id': personId(site),
    name: PROFILE.name,
    alternateName: 'Matt',
    jobTitle: PROFILE.jobTitle,
    worksFor: { '@type': 'CollegeOrUniversity', name: PROFILE.employer.name, url: PROFILE.employer.url },
    url: new URL('/', site).href,
    homeLocation: {
      '@type': 'Place',
      name: 'Longueuil',
      address: { '@type': 'PostalAddress', addressLocality: 'Longueuil', addressRegion: 'Québec', addressCountry: 'CA' },
    },
    knowsAbout: [
      'Développement web',
      'Développement web créatif',
      'Création numérique',
      'Intégration multimédia',
      'Expérience utilisateur (UX/UI)',
      'WebGL',
      'Three.js',
      'Pédagogie',
      'Intelligence artificielle',
      'Conception de jeux',
    ],
    sameAs: PROFILE.profiles.map((p) => p.url),
  };
}

/**
 * Auteur ou éditeur d'une page : référence au nœud Person (@id) avec son type, son nom et son URL.
 * Les pages autres que l'accueil n'incluent pas le nœud Person complet : sans ces champs,
 * Google n'y voit qu'un « Thing » anonyme.
 */
export const personRef = (site: URL): JsonLd => ({ '@type': 'Person', '@id': personId(site), name: PROFILE.name, url: new URL('/', site).href });

export function website(site: URL): JsonLd {
  return {
    '@type': 'WebSite',
    '@id': websiteId(site),
    url: new URL('/', site).href,
    name: SITE_NAME,
    inLanguage: LOCALE,
    author: personRef(site),
    publisher: personRef(site),
  };
}

export function breadcrumbs(site: URL, items: Array<[string, string]>): JsonLd {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: new URL(path, site).href })),
  };
}

export const graph = (...nodes: JsonLd[]): string =>
  JSON.stringify({ '@context': 'https://schema.org', '@graph': nodes }).replace(/</g, '\\u003c');
