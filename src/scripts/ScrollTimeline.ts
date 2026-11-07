/**
 * Défilement natif → position continue dans la suite des formes, f ∈ [0, n − 1].
 *
 * Pour chaque section i, l'ancre a_i est le moment où son texte arrive vers le milieu de
 * l'écran. On découpe :
 *   [a_i, a_i + hold_i]      forme i stable (≤ 0,35 écran : on lit le texte) → f = i
 *   [a_i + hold_i, a_{i+1}]  transformation i → i+1, linéaire en distance → f = i + t
 * hold_i est plafonné à 40 % de l'écart entre deux sections : les sections étant rapprochées,
 * la transformation garde toujours au moins 60 % de la distance.
 * Aucun snapping, aucun détournement : on ne fait que LIRE scrollY.
 * La hauteur CSS des sections (contenu + ~28 % d'écran) fixe la distance d'une transformation.
 */
import { clamp } from './lib';

export class ScrollTimeline {
  private anchors: number[] = [];
  private holds: number[] = [];

  constructor(private readonly sections: readonly HTMLElement[]) {
    this.measure();
  }

  get length(): number {
    return this.sections.length;
  }

  measure(): void {
    const vh = window.innerHeight;
    this.anchors = this.sections.map((el, i) => (i === 0 ? 0 : Math.max(0, el.getBoundingClientRect().top + window.scrollY - vh * 0.45)));
    this.holds = this.anchors.map((a, i) => {
      const next = this.anchors[i + 1];
      return next === undefined ? 0 : Math.min(vh * 0.35, (next - a) * 0.4);
    });
  }

  valueAt(y: number): number {
    const a = this.anchors;
    const n = a.length;
    if (n === 0) return 0;
    for (let i = 0; i < n - 1; i++) {
      const stableEnd = a[i]! + this.holds[i]!;
      if (y < stableEnd) return i;
      const next = a[i + 1]!;
      if (y < next) return i + clamp((y - stableEnd) / Math.max(1, next - stableEnd));
    }
    return n - 1;
  }

  /** Position de défilement qui affiche la forme i stable (pour les sauts d'index). */
  scrollFor(i: number): number {
    return i === 0 ? 0 : (this.anchors[i] ?? 0) + (this.holds[i] ?? 0) * 0.25;
  }
}
