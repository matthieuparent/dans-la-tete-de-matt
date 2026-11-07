/**
 * Statut dynamique (« En train de… ») : configuration centralisée.
 *
 * Fichier lu UNIQUEMENT côté serveur (routes /api/status*, et au build pour le texte initial).
 * Il ne contient aucun secret : les URL et jetons sont référencés par le NOM de leur variable
 * d'environnement (voir .env.example).
 *
 * Règle de confidentialité : aucun texte ne doit laisser deviner que je ne suis pas à la
 * maison, ni où je me trouve.
 */

export const STATUS_IDS = ['enseignement', 'projets', 'jeu', 'famille', 'defaut'] as const;
export type StatusId = (typeof STATUS_IDS)[number];

export const isStatusId = (v: unknown): v is StatusId =>
  typeof v === 'string' && (STATUS_IDS as readonly string[]).includes(v);

export interface StatusTexts {
  /** Texte visible complet (le préfixe n'est pas fixe). */
  readonly visible: string;
  /** Une ou plusieurs variantes de survol : une est tirée au hasard à chaque calcul. */
  readonly hover: readonly string[];
}

export interface CalendarConfig {
  /** Nom lisible (journaux uniquement, jamais exposé). */
  readonly name: string;
  readonly source: 'ics';
  /** Variable d'environnement qui contient l'URL ICS secrète. */
  readonly urlEnv: string;
  /** Statuts que ce calendrier peut déclencher. */
  readonly triggers: readonly StatusId[];
  /**
   * Mots-clés (insensibles à la casse et aux accents) cherchés dans le titre de l'événement.
   * Absent ou vide : tout événement en cours compte.
   */
  readonly keywords?: readonly string[];
  /** Ignorer les événements marqués « Disponible » (TRANSP:TRANSPARENT). */
  readonly ignoreFree?: boolean;
}

export interface StatusConfig {
  /** Fuseau horaire de référence (week-end, heures « flottantes » des calendriers). */
  readonly timeZone: string;
  /** Ordre de priorité : le premier statut dont un critère est vrai l'emporte. `defaut` en dernier. */
  readonly priority: readonly StatusId[];
  readonly texts: Readonly<Record<StatusId, StatusTexts>>;
  readonly calendars: readonly CalendarConfig[];
  readonly github: {
    /** Fenêtre « commit poussé récemment », en minutes. */
    readonly windowMinutes: number;
  };
  readonly famille: {
    /** Le week-end déclenche le statut Famille. */
    readonly weekend: boolean;
  };
  /** Durée de vie du résultat en cache côté serveur, en secondes (5 à 10 min). */
  readonly cacheSeconds: number;
  /** Délai maximal par source, en millisecondes. */
  readonly sourceTimeoutMs: number;
  /** Durée maximale d'un override manuel, en minutes. */
  readonly maxOverrideMinutes: number;
}

export const STATUS_CONFIG: StatusConfig = {
  timeZone: 'America/Toronto',
  priority: ['enseignement', 'projets', 'jeu', 'famille', 'defaut'],
  texts: {
    enseignement: {
      visible: "En train de créer : l'avenir",
      hover: ['En train de partager mon savoir avec la relève.'],
    },
    projets: {
      visible: 'En train de créer : une expérience',
      hover: ['Les mains dans le code, un commit à la fois.'],
    },
    jeu: {
      visible: 'En train de me changer les idées',
      hover: ['Manette en main, en train de recharger mes batteries.'],
    },
    famille: {
      visible: 'En train de créer : des souvenirs',
      hover: ['Avec les miens, à profiter du moment présent.'],
    },
    defaut: {
      visible: "En train de créer : l'avenir",
      hover: ['Quelque part entre deux idées, à en faire germer une nouvelle.'],
    },
  },
  calendars: [
    {
      name: 'Travail (Outlook, Cégep)',
      source: 'ics',
      urlEnv: 'CAL_WORK_ICS_URL',
      triggers: ['enseignement'],
      ignoreFree: true,
    },
    {
      name: 'Famille (Outlook.com)',
      source: 'ics',
      urlEnv: 'CAL_FAMILY_ICS_URL',
      triggers: ['famille'],
      keywords: ['soccer'],
    },
  ],
  github: { windowMinutes: 60 },
  famille: { weekend: true },
  cacheSeconds: 300,
  sourceTimeoutMs: 5000,
  maxOverrideMinutes: 7 * 24 * 60,
};
