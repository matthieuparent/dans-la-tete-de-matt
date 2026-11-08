/**
 * Source unique du contenu des sections de l'exploration.
 * Les valeurs entre crochets sont à fournir par Matthieu (voir docs/fiche-de-passation.md).
 */

export const SHAPE_IDS = ['intro', 'projets', 'enseignement', 'jeu', 'ia', 'famille', 'carnet'] as const;
export type ShapeId = (typeof SHAPE_IDS)[number];

/** Sections qui ont une rubrique dans le Carnet (filtres). */
export const CARNET_SECTIONS = ['projets', 'enseignement', 'jeu', 'ia', 'famille'] as const;
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
  role: 'Professeur, développeur créatif',
  disciplines: ['Curieux et créatif', 'Expérience utilisateur', 'Débrouillardise'],
  city: 'Longueuil, QC, Canada',
  status: 'Ouvert aux collaborations',
  tagline: "Je construis des expériences web et j'enseigne à les construire. Ce qui se passe entre les deux est ici.",
  // Courriel découpé : il n'apparaît jamais en clair dans le HTML (voir Footer.astro).
  email: { user: 'matthieuparent', domain: 'outlook.com' },
  sameAs: [] as string[], // TODO(Matthieu) : GitHub, LinkedIn, etc. (utilisé dans le JSON-LD)
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
      ['Période', '[AAAA] – 2026'],
      ['Types', 'Web 3D, jeux, outils pédagogiques, IA'],
      ['Sélection', '[n] projets'],
    ],
    hint: 'Survolez ou touchez un noyau pour ouvrir le projet',
    shapeLabel: 'Seize noyaux de points reliés par une ligne de temps, un par projet',
  },
  {
    id: 'enseignement',
    num: '02',
    label: 'Enseignement',
    title: 'Enseigne&shy;ment',
    text: "J'enseigne la programmation [niveau, établissement]. Ce que j'essaie de transmettre : [une phrase].",
    rows: [
      ['Depuis', '[AAAA]'],
      ['Cours', '[Cours 1] · [Cours 2] · [Cours 3]'],
      ['Étudiants', '[n] par année'],
    ],
    hint: 'Le tableau affiche le cours en vedette',
    shapeLabel: 'Les points forment un tableau de classe et trois rangées de pupitres',
  },
  {
    id: 'jeu',
    num: '03',
    label: 'Jeu',
    title: 'Jeu',
    text: 'Ce que je joue, et ce que je construis pour jouer.',
    rows: [
      ['En ce moment', '[jeu]'],
      ['De toujours', '[jeu]'],
      ['Game jams', '[n] participations'],
    ],
    hint: 'Les boutons surlignés lanceront bientôt une démo jouable',
    shapeLabel: "Les points forment la silhouette d'une console portable",
  },
  {
    id: 'ia',
    num: '04',
    label: 'IA',
    title: 'IA',
    text: "Comment je l'utilise, comment je l'enseigne, et où je la questionne.",
    rows: [
      ['Outils', '[outils utilisés]'],
      ['En classe', "[place de l'IA dans mes cours]"],
      ['Position', '[une phrase]'],
    ],
    hint: 'Un chemin s’active de la question à la réponse',
    shapeLabel: 'Les points forment un réseau de neurones artificiels à cinq couches',
  },
  {
    id: 'famille',
    num: '05',
    label: 'Famille',
    title: 'Famille',
    text: 'Trois enfants : un garçon de 12 ans, deux filles de 6 et 2 ans. Pas de visages, pas de noms.',
    rows: [
      ['Au quotidien', '[une phrase]'],
      ['Ce que ça change', '[en classe, dans le code]'],
    ],
    hint: '',
    shapeLabel: 'Cinq silhouettes en points, reliées par un fil',
  },
  {
    id: 'carnet',
    num: '06',
    label: 'Carnet',
    title: 'Carnet',
    text: "Making-of, notes de cours, parties, essais sur l'IA et vie de famille. Les points s'alignent : place à la lecture.",
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
