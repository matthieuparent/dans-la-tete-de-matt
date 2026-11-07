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
    jobTitle: PROFILE.role,
    url: new URL('/', site).href,
    homeLocation: {
      '@type': 'Place',
      name: 'Longueuil',
      address: { '@type': 'PostalAddress', addressLocality: 'Longueuil', addressRegion: 'QC', addressCountry: 'CA' },
    },
    knowsAbout: ['WebGL', 'Three.js', 'Shaders', 'Développement web créatif', 'Enseignement de la programmation', 'Intelligence artificielle', 'Conception de jeux'],
    ...(PROFILE.sameAs.length ? { sameAs: PROFILE.sameAs } : {}),
  };
}

export function website(site: URL): JsonLd {
  return {
    '@type': 'WebSite',
    '@id': websiteId(site),
    url: new URL('/', site).href,
    name: SITE_NAME,
    inLanguage: LOCALE,
    author: { '@id': personId(site) },
    publisher: { '@id': personId(site) },
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
