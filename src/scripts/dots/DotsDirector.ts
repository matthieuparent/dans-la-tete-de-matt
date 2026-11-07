/**
 * Chef d'orchestre des points : possède le renderer, la bibliothèque de formes et la
 * stratégie de pilotage active (Strategy) :
 *   - ScrollDriver : la progression suit le défilement (scrub, lissage ~100 ms) ;
 *   - TweenDriver  : transition temporelle (bascule Explorer ↔ Lire) ;
 *   - null         : repos, plus aucun rendu (render-on-demand).
 * Boucle via `renderer.setAnimationLoop`, coupée quand l'onglet est caché ou la scène hors écran.
 * Ce module (et three.js) n'est chargé qu'après la première peinture, par import dynamique.
 */
import { SHAPE_IDS, type ShapeId } from '../../data/sections';
import { clamp, fitStage, prefersReducedMotion, viewportStage } from '../lib';
import type { ScrollTimeline } from '../ScrollTimeline';
import { DotsRenderer, type StageRect } from './DotsRenderer';
import { buildShape, packShape, scatterShape, type PackedShape } from './shapes';

interface Driver {
  /** Retourne false quand le pilote a fini (le directeur repasse au repos). */
  update(dt: number, t: number): boolean;
}

/** Densité des générateurs pour un budget donné (≈ 2 700 points à densité 1). */
const densityFor = (count: number): number => clamp(count / 2700, 0.22, 2.3);

export class ShapeLibrary {
  private readonly cache = new Map<ShapeId, PackedShape>();
  constructor(readonly count: number) {}
  get(id: ShapeId): PackedShape {
    let s = this.cache.get(id);
    if (!s) {
      s = packShape(buildShape(id, densityFor(this.count)), this.count);
      this.cache.set(id, s);
    }
    return s;
  }
  at(i: number): PackedShape {
    return this.get(SHAPE_IDS[clamp(Math.round(i), 0, SHAPE_IDS.length - 1)]!);
  }
  /** Précalcule toutes les formes, une par tranche d'inactivité (≤ 5 ms chacune sur bureau). */
  prewarm(): void {
    const ric = (window as Window & { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 50));
    const ids = SHAPE_IDS.filter((id) => !this.cache.has(id));
    const next = (): void => {
      const id = ids.shift();
      if (!id) return;
      this.get(id);
      ric(next);
    };
    ric(next);
  }
}

/** Rotation au repos d'une forme : base + rotation lente (sauf mouvement réduit) + lien au défilement. */
function liveRotation(s: PackedShape, t: number, reduced: boolean, scrollTurns = 0): [number, number] {
  if (s.id !== 'intro') return [s.rot[0], s.rot[1]];
  return [s.rot[0], s.rot[1] + (reduced ? 0 : s.spin * t) + scrollTurns];
}

class ScrollDriver implements Driver {
  private current: number;
  private reducedIndex = -1;
  private reducedTween: { from: number; to: number; start: number } | null = null;

  constructor(
    private readonly d: DotsDirector,
    private readonly timeline: ScrollTimeline,
    private readonly onValue: (f: number) => void,
    start?: number,
  ) {
    this.current = start ?? timeline.valueAt(window.scrollY);
  }

  update(dt: number, t: number): boolean {
    const target = this.timeline.valueAt(window.scrollY);
    const lib = this.d.library;
    const r = this.d.renderer;
    const n = this.timeline.length;

    if (this.d.reduced) {
      // Formes fixes : fondu enchaîné de 200 ms quand la section dominante change.
      const idx = Math.round(target);
      if (this.reducedIndex < 0) this.reducedIndex = idx;
      if (idx !== this.reducedIndex && !this.reducedTween) this.reducedTween = { from: this.reducedIndex, to: idx, start: t };
      r.reduced = true;
      if (this.reducedTween) {
        const k = clamp((t - this.reducedTween.start) / 0.2);
        r.setPair(lib.at(this.reducedTween.from), lib.at(this.reducedTween.to));
        r.progress = k;
        if (k >= 1) {
          this.reducedIndex = this.reducedTween.to;
          this.reducedTween = null;
        }
      } else {
        const s = lib.at(this.reducedIndex);
        r.setPair(s, s);
        r.progress = 0;
      }
      r.setRotation(liveRotation(r.pair[0]!, 0, true), liveRotation(r.pair[1]!, 0, true));
      r.setDrift(0, 0);
      this.current = target;
      this.onValue(target);
      return true;
    }

    r.reduced = false;
    r.easeOut = false;
    // Saut (ancre, retour arrière) : on ne fait pas défiler toutes les formes intermédiaires,
    // on repart de la voisine de la cible pour une seule transformation.
    if (Math.abs(target - this.current) > 1.2) this.current = target - Math.sign(target - this.current);
    // Lissage exponentiel indépendant du FPS : constante de temps 100 ms.
    this.current += (target - this.current) * (1 - Math.exp(-dt / 0.1));
    if (Math.abs(target - this.current) < 1e-4) this.current = target;
    const f = clamp(this.current, 0, n - 1);
    const k = Math.min(Math.floor(f), n - 2);
    const p = f - k;
    const A = lib.at(k);
    const B = lib.at(k + 1);
    r.setPair(A, B);
    r.progress = p;
    // Le cerveau tourne aussi avec le défilement (≈ 0,35 rad par écran parcouru).
    const turns = (window.scrollY / window.innerHeight) * 0.35;
    r.setRotation(liveRotation(A, t, false, turns), liveRotation(B, t, false, turns));
    r.setDrift(A.drift, B.drift);
    this.onValue(f);
    return true;
  }
}

class TweenDriver implements Driver {
  private start = -1;
  constructor(
    private readonly d: DotsDirector,
    private readonly from: PackedShape,
    private readonly to: PackedShape,
    private readonly duration: number,
    private readonly fade: readonly [number, number],
    private readonly easeOut: boolean,
    private readonly resolve: () => void,
  ) {}

  update(_dt: number, t: number): boolean {
    // Temps réel (et non l'horloge plafonnée de la boucle) : la bascule dure ce qu'elle doit
    // durer même si le navigateur ralentit les images (onglet en arrière-plan, appareil lent).
    const now = performance.now() / 1000;
    if (this.start < 0) this.start = now;
    const k = this.duration <= 0 ? 1 : clamp((now - this.start) / this.duration);
    const r = this.d.renderer;
    r.reduced = this.d.reduced;
    r.easeOut = this.easeOut;
    r.setPair(this.from, this.to);
    r.progress = k;
    r.fade = this.fade[0] + (this.fade[1] - this.fade[0]) * k;
    r.setRotation([0, 0], liveRotation(this.to, t, this.d.reduced));
    r.setDrift(0, this.to.drift);
    if (k >= 1) {
      this.resolve();
      return false;
    }
    return true;
  }
}

export class DotsDirector {
  readonly renderer: DotsRenderer;
  readonly library: ShapeLibrary;
  reduced = prefersReducedMotion();
  private driver: Driver | null = null;
  private stageEl: Element | null = null;
  private running = false;
  private visible = !document.hidden;
  private onScreen = true;
  private last = 0;
  private clock = 0;
  private io: IntersectionObserver | null = null;
  private readonly abort = new AbortController();

  constructor(canvas: HTMLCanvasElement, count: number) {
    this.renderer = new DotsRenderer(canvas, count);
    this.library = new ShapeLibrary(count);
    this.library.prewarm();
    this.renderer.setStage(viewportStage());
    const sig = { signal: this.abort.signal };
    window.addEventListener('resize', () => this.handleResize(), sig);
    document.addEventListener('visibilitychange', () => {
      this.visible = !document.hidden;
      this.syncLoop();
    }, sig);
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
      this.reduced = e.matches;
    }, sig);
  }

  /* ----------------------- scène & visibilité ----------------------- */

  /** Rattache la scène HTML (zone sticky) de la page courante, ou null (Carnet). */
  attachStage(el: Element | null): void {
    this.io?.disconnect();
    this.stageEl = el;
    this.onScreen = true;
    if (el) {
      this.renderer.setStage(fitStage(el));
      this.io = new IntersectionObserver(([entry]) => {
        this.onScreen = entry?.isIntersecting ?? true;
        this.syncLoop();
      });
      this.io.observe(el);
    }
  }

  private handleResize(): void {
    this.renderer.resize();
    if (this.stageEl) this.renderer.setStage(fitStage(this.stageEl));
    // Sans scène (Carnet, Article) et au repos : rien à redessiner.
    if (!this.running && this.stageEl) this.renderOnce();
  }

  /** La scène est sticky : son rectangle ne bouge qu'au début/fin de la zone. On le relit à chaque image (1 lecture de layout). */
  private refreshStage(): void {
    if (!this.stageEl) return;
    const r = fitStage(this.stageEl);
    const s = this.renderer.stageRect;
    if (Math.abs(r.x - s.x) > 0.1 || Math.abs(r.y - s.y) > 0.1 || Math.abs(r.w - s.w) > 0.1) this.renderer.setStage(r);
  }

  /* ----------------------------- pilotes ----------------------------- */

  followScroll(timeline: ScrollTimeline, onValue: (f: number) => void, start?: number): void {
    this.driver = new ScrollDriver(this, timeline, onValue, start);
    this.renderer.fade = 1;
    this.syncLoop();
  }

  /** Transition temporelle depuis l'état affiché (instantané CPU) vers une forme. */
  tweenTo(
    to: PackedShape,
    ms: number,
    fade: readonly [number, number] = [this.renderer.fade, 1],
    opts: { easeOut?: boolean; from?: PackedShape } = {},
  ): Promise<void> {
    const from = opts.from ?? (this.renderer.pair[0] ? this.renderer.snapshot() : to);
    const duration = this.reduced ? Math.min(ms, 200) : ms;
    const tween = new Promise<void>((resolve) => {
      this.driver = new TweenDriver(this, from, to, duration / 1000, fade, !!opts.easeOut, resolve);
      this.syncLoop();
    });
    // Filet de sécurité : si la boucle est suspendue (onglet caché), on n'attend pas indéfiniment.
    return Promise.race([tween, new Promise<void>((r) => setTimeout(r, duration + 500))]);
  }

  /** Explosion depuis l'état affiché : les points partent dans tous les sens et s'effacent. */
  scatter(ms: number): Promise<void> {
    const from = this.renderer.pair[0] ? this.renderer.snapshot() : null;
    if (!from) return Promise.resolve();
    return this.tweenTo(scatterShape(from), ms, [this.renderer.fade, 0], { easeOut: true, from });
  }

  /** Convergence : les points arrivent de partout et forment `shape`. */
  gather(shape: PackedShape, ms: number): Promise<void> {
    return this.tweenTo(shape, ms, [0, 1], { easeOut: true, from: scatterShape(shape, 91) });
  }

  /** Affiche une forme figée (sans transition) avec une opacité donnée. */
  show(shape: PackedShape, fade: number): void {
    this.driver = null;
    this.renderer.setPair(shape, shape);
    this.renderer.progress = 0;
    this.renderer.fade = fade;
    this.renderer.setRotation([0, 0], [0, 0]);
    this.renderOnce();
  }

  fadeTo(target: number, ms: number): Promise<void> {
    const [a] = this.renderer.pair;
    if (!a) return Promise.resolve();
    const shape = this.renderer.snapshot();
    return this.tweenTo(shape, ms, [this.renderer.fade, target]).then(() => {
      if (target === 0) this.idle();
    });
  }

  /** Repos : plus aucun rendu (la dernière image reste à l'écran). */
  idle(): void {
    this.driver = null;
    this.syncLoop();
  }

  /* ------------------------------ boucle ------------------------------ */

  private syncLoop(): void {
    const should = !!this.driver && this.visible && this.onScreen;
    if (should === this.running) return;
    this.running = should;
    if (should) {
      this.last = performance.now();
      this.renderer.setAnimationLoop((now) => this.frame(now));
    } else this.renderer.setAnimationLoop(null);
  }

  private frame(now: number): void {
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    this.clock += dt;
    this.refreshStage();
    this.renderer.time = this.reduced ? 0 : this.clock;
    const keep = this.driver?.update(dt, this.clock) ?? false;
    this.renderer.render();
    if (!keep) {
      this.driver = null;
      this.syncLoop();
    }
  }

  private renderOnce(): void {
    this.refreshStage();
    this.renderer.render();
  }

  get stage(): StageRect {
    return this.renderer.stageRect;
  }

  dispose(): void {
    this.renderer.setAnimationLoop(null);
    this.io?.disconnect();
    this.abort.abort();
    this.renderer.dispose();
  }
}
