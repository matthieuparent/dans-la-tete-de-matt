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
import { buildShape, packShape, scatterShape, STAGE_W, suspendShape, type PackedShape } from './shapes';

/**
 * Opacité globale de la poussière en suspens (pages Lire). Les opacités par point (shapes.ts)
 * font le reste : la plupart à ~0,06–0,16, quelques repères à ~0,3–0,45.
 */
const SUSPENDED_FADE = 0.5;

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

/**
 * Pages Lire : la poussière flotte sur place (dérive du shader), sans fin.
 * Termine aussi un fondu d'arrivée resté incomplet (onglet ralenti).
 */
class FloatDriver implements Driver {
  /** 0 → 1 : part de l'effet « en attente » (lissé, pour entrer et sortir en douceur). */
  private wait = 0;
  /** Opacité de repos, qui monte jusqu'à SUSPENDED_FADE. */
  private base: number;

  constructor(
    private readonly d: DotsDirector,
    private readonly shape: PackedShape,
  ) {
    this.base = d.renderer.fade;
  }

  update(dt: number, t: number): boolean {
    const r = this.d.renderer;
    if (r.progress < 1) r.progress = Math.min(1, r.progress + dt * 2);
    if (this.base < SUSPENDED_FADE) this.base = Math.min(SUSPENDED_FADE, this.base + dt);
    // Page suivante en retard : la poussière respire (s'éclaire par vagues) et s'agite un peu.
    this.wait += ((this.d.waiting ? 1 : 0) - this.wait) * Math.min(1, dt * 3);
    const breath = 0.5 - 0.5 * Math.cos((t * Math.PI * 2) / 1.3);
    r.fade = this.base + this.wait * 0.4 * breath;
    r.setRotation([0, 0], [0, 0]);
    const drift = this.shape.drift * (1 + this.wait * 1.6);
    r.setDrift(drift, drift);
    return true;
  }
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
    else if (this.suspended && (!this.running || this.driver instanceof FloatDriver)) {
      // Pages Lire : la poussière se redistribue sur la nouvelle fenêtre et reprend sa dérive.
      this.renderer.setStage(viewportStage());
      const shape = suspendShape(this.suspended, this.viewportBox());
      this.show(shape, SUSPENDED_FADE);
      this.float(shape);
      return;
    }
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

  /**
   * Pages Lire : les points restent en suspens dans la page, très pâles, au lieu de disparaître.
   * Depuis la forme affichée (explosion qui se pose) ou, sans forme, par simple fondu (arrivée
   * directe). Puis plus aucun rendu : la dernière image reste à l'écran.
   */
  suspend(ms: number, from?: PackedShape): Promise<void> {
    // On garde le rectangle de scène courant (sinon la forme sauterait au départ) :
    // la poussière est calculée pour couvrir la fenêtre dans ce repère.
    this.attachStage(null);
    const live = !!this.renderer.pair[0] && !from;
    if (!live) this.renderer.setStage(viewportStage());
    const src = live ? this.renderer.snapshot() : (from ?? this.library.at(0));
    const target = suspendShape(src, this.viewportBox());
    this.suspended = target;
    const start = live ? src : target;
    return this.tweenTo(target, ms, [live ? this.renderer.fade : 0, SUSPENDED_FADE], { easeOut: true, from: start }).then(() => {
      if (this.suspended === target) this.float(target);
    });
  }

  /** Dérive continue de la poussière ; mouvement réduit : image fixe. */
  private float(shape: PackedShape): void {
    if (this.reduced) return this.idle();
    this.driver = new FloatDriver(this, shape);
    this.syncLoop();
  }

  /** Fenêtre en coordonnées scène (le rectangle de scène vient de viewportStage()). */
  private viewportBox(): { x0: number; y0: number; x1: number; y1: number } {
    const st = this.renderer.stageRect;
    const k = st.w / STAGE_W;
    const m = 12;
    return { x0: (m - st.x) / k, y0: (m - st.y) / k, x1: (window.innerWidth - m - st.x) / k, y1: (window.innerHeight - m - st.y) / k };
  }

  /** Page suivante en retard (bascule) : la poussière en suspens le montre. */
  waiting = false;

  /** Forme en suspens affichée (null ailleurs que sur les pages Lire). */
  suspended: PackedShape | null = null;

  /**
   * Retour vers l'Explorer depuis une page Lire : la poussière en suspens (les mêmes points)
   * se rassemble pour former `shape` dans la scène `el`. Les positions sont reportées de
   * l'ancien rectangle de scène (fenêtre) vers le nouveau : aucun saut au départ.
   */
  reform(el: Element, shape: PackedShape, ms: number): Promise<void> {
    if (!this.renderer.pair[0]) {
      this.attachStage(el);
      return this.gather(shape, ms);
    }
    const old = this.renderer.stageRect;
    const from = this.renderer.snapshot();
    this.attachStage(el);
    const now = this.renderer.stageRect;
    const k0 = old.w / STAGE_W;
    const k1 = now.w / STAGE_W;
    for (let i = 0; i < from.count; i++) {
      const o = i * 3;
      from.pos[o] = (from.pos[o]! * k0 + old.x - now.x) / k1;
      from.pos[o + 1] = (from.pos[o + 1]! * k0 + old.y - now.y) / k1;
    }
    this.suspended = null;
    // Départ et arrivée doux, comme les changements de forme au défilement de l'accueil.
    return this.tweenTo(shape, ms, [this.renderer.fade, 1], { easeOut: false, from });
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
