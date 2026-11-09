/**
 * Les projets = les noyaux de la section 01.
 * L'ordre du tableau = l'ordre chronologique (position sur la ligne de temps).
 * Tous les noyaux ont la même taille.
 *
 * Ce fichier est aussi chargé côté client (noyaux, fiche) : garder le texte long dans etudes.ts.
 */
export interface Projet {
  readonly id: string;
  readonly name: string;
  readonly year: string;
  readonly type: string;
  readonly tech: string;
  readonly summary: string;
  /** Page interne (étude de cas) ou lien externe. */
  readonly url: string;
  /** Site en ligne. */
  readonly live?: string;
  /** Vignette de la fiche (ratio ~1,9:1). */
  readonly thumb?: string;
}

const BCF: Projet = {
  id: 'bcf',
  name: 'BCF Avocats d’affaires',
  year: '2019',
  type: 'Refonte · Sitecore (avec lg2)',
  tech: 'Sitecore · TypeScript orienté objet · GSAP · ScrollMagic · Swiper · Coveo',
  summary: "La refonte du site d'un grand cabinet d'avocats d'affaires, réalisée chez lg2 : une mise en page en deux panneaux dont l'image suit la lecture, et un front-end TypeScript en modules pensé pour Sitecore.",
  url: '/projets/bcf',
  live: 'https://web.archive.org/web/20240116014804/https://www.bcf.ca/fr',
  thumb: '/projets/bcf/vignette-carte-16x10.webp',
};

const INSPIRER_RESPIRER: Projet = {
  id: 'inspirer-respirer',
  name: 'Inspirer. Respirer.',
  year: '2022',
  type: 'Site WordPress sur mesure',
  tech: 'WordPress · page builder maison · webpack · JS orienté objet · SCSS',
  summary: "Le site d'attractivité de la MRC d'Argenteuil : un page builder de quinze blocs avec un système de couleurs par section, un babillard d'emplois filtrable et des vidéos chargées à la demande.",
  url: '/projets/inspirer-respirer',
  live: 'https://inspirer-respirer.com/',
  thumb: '/projets/inspirer-respirer/vignette-carte-16x10.webp',
};

const ESTEREL: Projet = {
  id: 'esterel',
  name: 'Ville d’Estérel',
  year: '2022',
  type: 'Site municipal WordPress sur mesure',
  tech: 'WordPress · page builder maison · webpack · JS orienté objet · SCSS · Swiper · GSAP',
  summary: "Le site de la Ville d'Estérel : un mégamenu de cinq rubriques, des accès rapides aux services en ligne et des avis publics classés par année, sur le même socle de blocs que mes autres thèmes WordPress.",
  url: '/projets/esterel',
  live: 'https://villedesterel.com/',
  thumb: '/projets/esterel/vignette-carte-16x10.webp',
};

const SYNERLAB: Projet = {
  id: 'synerlab',
  name: 'Synerlab',
  year: '2023',
  type: 'Site WordPress sur mesure',
  tech: 'WordPress · page builder maison · webpack · JS orienté objet · SCSS',
  summary: "Le site WordPress du centre d'innovation en économie circulaire de la MRC d'Argenteuil : un page builder maison de dix blocs et un front-end webpack orienté objet.",
  url: '/projets/synerlab',
  live: 'https://synerlab.ca/',
  thumb: '/projets/synerlab/vignette-carte-16x10.webp',
};

const MOTS_DE_TETE: Projet = {
  id: 'mots-de-tete',
  name: 'Mots de tête',
  year: '2024',
  type: 'Lexique bilingue WordPress',
  tech: 'WordPress · fiches structurées · recherche bilingue · webpack · JS orienté objet',
  summary: "Un vocabulaire de quelque 600 termes en santé dentaire et en optique, avec un index alphabétique, une recherche français-anglais et des fiches validées par une terminologue agréée.",
  url: '/projets/mots-de-tete',
  live: 'https://www.motsdetete.ca/',
  thumb: '/projets/mots-de-tete/vignette-carte-16x10.webp',
};

const HUB_TIM_PLUS: Projet = {
  id: 'hub-tim-plus',
  name: 'TIM+',
  year: '2025',
  type: 'One-pager WordPress animé',
  tech: 'WordPress · GSAP (ScrollSmoother, ScrollTrigger, SplitText) · webpack · JS orienté objet · SCSS',
  summary: "La page qui présente TIM+, la nouvelle certification du département TIM : six blocs d'activités, des badges et un classement des étudiants, mis en mouvement au défilement.",
  url: '/projets/hub-tim-plus',
  live: 'https://hub.dectim.ca/tim-plus/',
  thumb: '/projets/hub-tim-plus/vignette-carte-16x10.webp',
};

/** Ordre chronologique : le plus récent en dernier. */
export const PROJETS: readonly Projet[] = [BCF, INSPIRER_RESPIRER, ESTEREL, SYNERLAB, MOTS_DE_TETE, HUB_TIM_PLUS];
