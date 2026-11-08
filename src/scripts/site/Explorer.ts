/**
 * Page Explorer : relie le défilement à l'interface (index, bouton Lire, étiquettes,
 * image de secours) et, si disponible, au directeur WebGL.
 * Tout ce qui est ici fonctionne aussi SANS WebGL : seule la matière change (SVG statique).
 */
import { SHAPE_IDS, isCarnetSection } from '../../data/sections';
import { ScrollTimeline } from '../ScrollTimeline';
import { clamp, prefersReducedMotion } from '../lib';
import type { DotsDirector } from '../dots/DotsDirector';
import { ProjectHover } from './ProjectHover';
import { StatusLabel } from './StatusLabel';

export class Explorer {
  readonly timeline: ScrollTimeline;
  readonly stage: HTMLElement;
  private readonly abort = new AbortController();
  private active = -1;
  private raf = 0;
  private readonly labels: HTMLElement[];
  private readonly poster: HTMLImageElement | null;
  private readonly hover: ProjectHover;
  private readonly status: StatusLabel | null;
  private smoothed = 0;
  private motion: { destroy(): void } | null = null;
  private destroyed = false;

  constructor(private readonly root: HTMLElement) {
    const sections = Array.from(root.querySelectorAll<HTMLElement>('[data-shape]'));
    this.timeline = new ScrollTimeline(sections);
    this.stage = root.querySelector<HTMLElement>('[data-stage]')!;
    this.labels = Array.from(this.stage.querySelectorAll<HTMLElement>('[data-labels-for]'));
    this.poster = this.stage.querySelector<HTMLImageElement>('[data-poster]');
    this.hover = new ProjectHover(this.stage, () => this.smoothed);
    const statusEl = this.stage.querySelector<HTMLElement>('[data-status]');
    this.status = statusEl ? new StatusLabel(statusEl) : null;

    const sig = { signal: this.abort.signal };
    // Mise à jour immédiate (pas d'attente d'image) : l'index et le lien « Lire » doivent être
    // justes même si l'on clique juste après avoir défilé. valueAt() ne lit aucun layout.
    window.addEventListener('scroll', () => this.update(), { passive: true, ...sig });
    window.addEventListener('resize', () => {
      this.timeline.measure();
      this.schedule();
    }, sig);
    // Les polices changent la hauteur des sections : on remesure une fois chargées.
    void document.fonts?.ready.then(() => {
      this.timeline.measure();
      this.schedule();
    });

    // Au clic sur « Lire » (avant le routeur, qui écoute sur document) : cible = section dominante.
    document.querySelectorAll<HTMLAnchorElement>('[data-mode-lire]').forEach((a) =>
      a.addEventListener('click', () => {
        const id = this.currentId;
        a.href = isCarnetSection(id) ? `/carnet/${id}` : '/carnet';
      }, sig),
    );

    // Index : saut sans animation si mouvement réduit (le CSS gère le défilement doux sinon).
    root.querySelectorAll<HTMLAnchorElement>('[data-index-link]').forEach((a) =>
      a.addEventListener('click', (e) => {
        const id = a.hash.slice(1);
        const i = SHAPE_IDS.indexOf(id as (typeof SHAPE_IDS)[number]);
        if (i < 0) return;
        e.preventDefault();
        history.replaceState(history.state, '', `#${id}`);
        window.scrollTo({ top: this.timeline.scrollFor(i), behavior: prefersReducedMotion() ? 'instant' : 'smooth' });
      }, sig),
    );
    this.update();

    // Animations d'arrivée/sortie : GSAP chargé à part, après le contenu (le texte est lisible sans).
    void import('./SectionMotion').then(({ SectionMotion }) => {
      if (!this.destroyed) this.motion = new SectionMotion(root);
    });
  }

  /** Branche le WebGL : la valeur lissée du directeur pilote alors les étiquettes. */
  attach(director: DotsDirector, start?: number): void {
    director.attachStage(this.stage);
    director.followScroll(this.timeline, (f) => {
      this.smoothed = f;
      this.paintLabels(f);
    }, start);
  }

  private schedule(): void {
    if (this.raf) return;
    this.raf = requestAnimationFrame(() => {
      this.raf = 0;
      this.update();
    });
  }

  private update(): void {
    const f = this.timeline.valueAt(window.scrollY);
    if (!document.documentElement.classList.contains('dots-ready')) {
      this.smoothed = f;
      this.paintLabels(f);
    }
    const i = Math.round(f);
    if (i === this.active) return;
    this.active = i;
    const id = SHAPE_IDS[i] ?? 'intro';

    document.querySelectorAll<HTMLAnchorElement>('[data-index-link]').forEach((a) => {
      if (a.hash === `#${id}`) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
    // « Lire » ouvre le Carnet filtré sur la section en cours.
    const lire = isCarnetSection(id) ? `/carnet/${id}` : '/carnet';
    document.querySelectorAll<HTMLAnchorElement>('[data-mode-lire]').forEach((a) => (a.href = lire));
    const src = this.root.querySelector<HTMLElement>(`[data-shape="${id}"]`);
    this.stage.setAttribute('aria-label', src?.dataset.shapeLabel ?? '');

    // Secours sans WebGL : on remplace l'image SVG de la forme (fondu de 200 ms en CSS).
    if (this.poster && !document.documentElement.classList.contains('dots-ready')) {
      const next = `/formes/${id}.svg`;
      if (!this.poster.src.endsWith(next)) {
        this.poster.classList.add('is-swapping');
        window.setTimeout(() => {
          this.poster!.src = next;
          this.poster!.classList.remove('is-swapping');
        }, 120);
      }
    }
  }

  /** Les étiquettes de la forme k sont visibles quand f est à moins de 0,3 de k. */
  private paintLabels(f: number): void {
    for (const el of this.labels) {
      const k = SHAPE_IDS.indexOf(el.dataset.labelsFor as (typeof SHAPE_IDS)[number]);
      const o = clamp(1 - Math.abs(f - k) / 0.3);
      const v = o.toFixed(2);
      if (el.style.opacity !== v) el.style.opacity = v;
      el.toggleAttribute('hidden', o === 0);
    }
  }

  /** Section dominante (pour la bascule vers le Carnet). */
  get currentId(): string {
    return SHAPE_IDS[Math.round(this.timeline.valueAt(window.scrollY))] ?? 'intro';
  }

  destroy(): void {
    this.destroyed = true;
    this.motion?.destroy();
    cancelAnimationFrame(this.raf);
    this.abort.abort();
    this.hover.destroy();
    this.status?.destroy();
  }
}
