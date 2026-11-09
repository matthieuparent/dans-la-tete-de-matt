/**
 * Source unique du contenu des sections de l'exploration.
 * Les valeurs entre crochets sont à fournir par Matthieu (voir docs/fiche-de-passation.md).
 */

import { PROJETS } from './projets';

export const SHAPE_IDS = ['intro', 'projets', 'enseignement', 'recharge', 'ia', 'famille', 'carnet'] as const;
export type ShapeId = (typeof SHAPE_IDS)[number];

/** Sections qui ont une rubrique dans le Carnet (filtres). */
export const CARNET_SECTIONS = ['projets', 'enseignement', 'recharge', 'ia', 'famille'] as const;
export type CarnetSection = (typeof CARNET_SECTIONS)[number];

export interface SectionInfo {
  readonly id: ShapeId;
  readonly num: string;
  readonly label: string;
  /** Titre condensé (capitales via CSS). `&shy;` autorisé. */
  readonly title: string;
  readonly text: string;
  /** Valeur simple, ou liste (affichée une par ligne). */
  readonly rows: ReadonlyArray<readonly [string, string | readonly string[]]>;
  readonly hint: string;
  /** Description courte de la forme, pour les lecteurs d'écran. */
  readonly shapeLabel: string;
}

export const PROFILE = {
  name: 'Matthieu Parent',
  role: 'Enseignant en multimédia et penseur créatif',
  disciplines: ['Curieux et créatif', 'Expérience utilisateur', 'Débrouillardise'],
  city: 'Longueuil, QC, Canada',
  jobTitle: "Enseignant en Techniques d'intégration multimédia",
  employer: { name: 'Cégep Édouard-Montpetit', url: 'https://www.cegepmontpetit.ca' },
  status: 'Ouvert aux collaborations',
  /** Sous-titre explicite de l'accueil (et titre SEO) : ce pour quoi on veut être trouvé. */
  headline: 'enseignant en multimédia, développeur web créatif et passionné d’intelligence artificielle à Longueuil, Québec.',
  tagline: "Je construis des expériences web et j'enseigne à les construire. Ce qui se passe entre les deux est ici.",
  // Courriel découpé : il n'apparaît jamais en clair dans le HTML (voir Footer.astro).
  email: { user: 'matthieuparent', domain: 'outlook.com' },
  /** Profils officiels : liens visibles du pied de page (rel="me") et `sameAs` du JSON-LD. */
  profiles: [
    { label: 'LinkedIn', url: 'https://www.linkedin.com/in/matthieuparent/' },
    { label: 'GitHub', url: 'https://github.com/matthieuparent' },
  ],
} as const;

/** Projets réels (année connue) : les entrées génériques « [AAAA] » ne comptent pas. */
const VRAIS_PROJETS = PROJETS.filter((p) => /^\d{4}$/.test(p.year));
const PREMIERE_ANNEE = Math.min(...VRAIS_PROJETS.map((p) => Number(p.year)));
/** Année en cours (au moment du build). */
const ANNEE = new Date().getFullYear();

export const ENSEIGNEMENT = {
  depuis: '2017',
  /** Cours de la session en cours. */
  session: ['Production Web', 'Conception Web 4'],
  /** Affiché sur le tableau de la forme « Enseignement ». */
  vedette: 'Production Web',
  dejaEnseignes: [
    'Conception Web 1 à 4',
    'Production Web',
    "Projet de fin d'études",
    "Design d'interface (dépt. Informatique)",
    'Programmation serveur et base de données (ancien Web 4)',
    'Coordination des stages',
  ] as string[],
} as const;

export const SECTIONS: readonly SectionInfo[] = [
  {
    id: 'intro',
    num: '00',
    label: 'Intro',
    title: 'Dans la tête de Matt',
    text: PROFILE.tagline,
    rows: [
      ['Nom', PROFILE.name],
      ['Rôle', PROFILE.role],
      ['Disciplines', PROFILE.disciplines],
      ['Basé à', PROFILE.city],
      ['Statut', PROFILE.status],
    ],
    hint: '',
    shapeLabel: 'Cerveau en nuage de points',
  },
  {
    id: 'projets',
    num: '01',
    label: 'Projets',
    title: 'Projets',
    text: 'Chaque noyau est un projet ; sa position sur la ligne dit son année.',
    rows: [
      ['Période', `${PREMIERE_ANNEE} – ${ANNEE}`],
      ['Types', 'WordPress, 3D, SCSS, front-end créatif, IA'],
      ['Sélection', VRAIS_PROJETS.length > 1 ? `${VRAIS_PROJETS.length} projets` : `${VRAIS_PROJETS.length} projet`],
    ],
    hint: 'Survolez ou touchez un noyau pour ouvrir le projet',
    shapeLabel: `${PROJETS.length} noyaux de points reliés par une ligne de temps, un par projet`,
  },
  {
    id: 'enseignement',
    num: '02',
    label: 'Enseignement',
    title: 'Enseigne&shy;ment',
    text: "J'enseigne le développement web et la création numérique en Techniques d'intégration multimédia au Cégep Édouard-Montpetit. Mon objectif : former des créateurs curieux, autonomes et capables de s'adapter aux technologies de demain.",
    rows: [
      ['Depuis', ENSEIGNEMENT.depuis],
      ['Cette session', ENSEIGNEMENT.session.join(' · ')],
      ['Cours déjà enseignés', ENSEIGNEMENT.dejaEnseignes.length ? ENSEIGNEMENT.dejaEnseignes : '[liste à venir]'],
    ],
    hint: 'Le tableau affiche le cours en vedette',
    shapeLabel: 'Les points forment un tableau de classe et trois rangées de pupitres',
  },
  {
    id: 'recharge',
    num: '03',
    label: 'Recharge',
    title: 'Recharge',
    text: "Au rythme de l'IA, de la famille et des agendas remplis, voici ce qui me permet de recharger les neurones.",
    rows: [
      ['Jeux vidéo', ['Final Fantasy Resonance', 'NHL 26']],
      ['Anime et manga', ['Golden Kamui', 'Black Clover']],
      ['Jeux de société', ['Azul', 'Cascadia', 'Century']],
      ['Sport joué', ['Balle molle', 'Volleyball']],
      ['Télé', ['Canadiens', 'Real Madrid', 'The Rings of Power']],
    ],
    hint: 'Les boutons surlignés lanceront bientôt une démo jouable',
    shapeLabel: "Les points forment la silhouette d'une console portable",
  },
  {
    id: 'ia',
    num: '04',
    label: 'IA',
    title: 'IA',
    text: "On ne peut plus se mettre la tête dans le sable : l'IA est là pour rester. Voici comment je l'utilise.",
    rows: [
      ['Outils', ['Claude Code', 'Codex', 'Figma Make']],
      ['Niveau', 'En apprentissage'],
      ['Position', "On ne sait pas où on s'en va : à nous d'aller quelque part de plaisant."],
    ],
    hint: 'Un chemin s’active de la question à la réponse',
    shapeLabel: 'Les points forment un réseau de neurones artificiels à cinq couches',
  },
  {
    id: 'famille',
    num: '05',
    label: 'Famille',
    title: 'Famille',
    text: 'Trois enfants : un garçon de 12 ans, deux filles de 6 et 2 ans. Une montagne russe d’émotions.',
    rows: [
      ['Au quotidien', ['Organisation', 'Terrain de soccer', 'Infériorité numérique']],
      ['Ce que ça change', ['Rigueur', 'Passion', 'Envie de se dépasser']],
    ],
    hint: '',
    shapeLabel: 'Cinq silhouettes en points, reliées par un fil',
  },
  {
    id: 'carnet',
    num: '06',
    label: 'Carnet',
    title: 'Carnet',
    text: "Il se passe plusieurs choses dans ma tête, et j'ai décidé de commencer à les mettre par écrit. Je vais parler de plein de sujets différents : à vous de voir ce qui vous intéresse.",
    rows: [],
    hint: '',
    shapeLabel: 'Les points s’alignent en lignes de texte',
  },
];

export const sectionById = (id: string): SectionInfo | undefined => SECTIONS.find((s) => s.id === id);

export const isCarnetSection = (id: string): id is CarnetSection =>
  (CARNET_SECTIONS as readonly string[]).includes(id);

/** Texte brut (sans entités HTML) pour les métadonnées. */
export const plain = (html: string): string => html.replace(/&shy;/g, '');
