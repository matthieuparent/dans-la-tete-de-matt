/**
 * Les projets = les noyaux de la section 01.
 * L'ordre du tableau = l'ordre chronologique (position sur la ligne de temps).
 * Tous les noyaux ont la même taille.
 *
 * TODO(Matthieu) : remplacer les 16 entrées par les vrais projets.
 */
export interface Projet {
  readonly id: string;
  readonly name: string;
  readonly year: string;
  readonly type: string;
  readonly tech: string;
  readonly summary: string;
  readonly url: string;
  /** Projet mis en avant (halo surligneur permanent). */
  readonly featured?: boolean;
}

export const PROJETS: readonly Projet[] = Array.from({ length: 16 }, (_, i) => ({
  id: `projet-${String(i + 1).padStart(2, '0')}`,
  name: `[Nom du projet ${i + 1}]`,
  year: '[AAAA]',
  type: '[Type de projet]',
  tech: '[Three.js · GLSL · …]',
  summary: "[Une phrase : ce que c'est et pourquoi c'est intéressant.]",
  url: '#',
  featured: i === 9,
}));
