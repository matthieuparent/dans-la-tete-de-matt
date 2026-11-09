/**
 * Racine de composition côté client. Exécutée une seule fois : le routeur d'Astro
 * (ClientRouter) garde ce module vivant entre les pages, et le <canvas> est persistant
 * (`transition:persist`). On (dé)monte les contrôleurs de page sur `astro:page-load`.
 *
 * Bascule Explorer ↔ Lire (sans rechargement, URL via history.pushState par le routeur) :
 *   0–600 ms   les points glissent en lignes, le texte de la section s'estompe
 *              (pendant le chargement de la page cible : on enveloppe `event.loader`) ;
 *   600–900 ms les lignes rejoignent les vrais titres puis se fondent en eux.
 * Retour : le même mouvement à l'envers, on retombe sur la même section.
 */
import type { TransitionBeforePreparationEvent, TransitionBeforeSwapEvent } from 'astro:transitions/client';
import type { DotsDirector } from './dots/DotsDirector';
import { isCarnetPath, isExplorerPath, nextFrame, pointBudget, prefersReducedMotion, supportsWebGL, wait } from './lib';
import { Explorer } from './site/Explorer';
import { ArticlePage, CarnetPage, Menu } from './site/Pages';

/**
 * to-carnet / to-explorer : bascule Explorer ↔ Lire (avec les points) ;
 * filter : changement de filtre dans le Carnet (seuls le chapitre et les notes s'animent) ;
 * lire : autre navigation entre pages Lire (Carnet ↔ Article), page entière animée.
 */
type Bascule = 'to-carnet' | 'to-explorer' | 'filter' | 'lire' | null;

/** Pages de liste du Carnet (/carnet, /carnet/<section>) — par opposition aux articles. */
/** Délai après la sortie avant de signaler l'attente (ms) : rien n'apparaît si la page arrive vite. */
const WAIT_DELAY = 150;
const isListing = (p: string): boolean => /^\/carnet(\/[^/]+)?\/?$/.test(p);

class Site {
  private director: DotsDirector | null = null;
  private directorPromise: Promise<DotsDirector | null> | null = null;
  private readonly webgl = supportsWebGL();
  private explorer: Explorer | null = null;
  private page: { destroy(): void } | null = null;
  private menu: Menu | null = null;
  /** Arrivées au défilement (contenu Lire + pied de page), recréées à chaque page. */
  private reveal: { destroy(): void } | null = null;
  private generation = 0;
  private bascule: Bascule = null;
  private traverse = false;
  /** Position à garder lors d'un changement de filtre (la barre de filtres ne doit pas sauter). */
  private keepY: number | null = null;
  /** Envol des points en cours (bascule vers Lire), qui continue après le changement de page. */
  private flight: Promise<void> | null = null;
  /** Arrivée directe sur une page Lire : afficher la poussière en suspens dès que WebGL est prêt. */
  private suspendOnLoad = false;
  private readonly html = document.documentElement;

  start(): void {
    if (!this.webgl) this.html.classList.add('no-webgl');
    document.addEventListener('astro:before-preparation', (e) => this.prepare(e as TransitionBeforePreparationEvent));
    document.addEventListener('astro:before-swap', (e) => this.beforeSwap(e as TransitionBeforeSwapEvent));
    document.addEventListener('astro:page-load', () => void this.mount());
  }

  /** Charge three.js + le directeur à la demande (après la première peinture). */
  private getDirector(): Promise<DotsDirector | null> {
    if (!this.webgl) return Promise.resolve(null);
    this.directorPromise ??= import('./dots/DotsDirector')
      .then(({ DotsDirector }) => {
        const canvas = document.querySelector<HTMLCanvasElement>('[data-dots-canvas]');
        if (!canvas) return null;
        this.director = new DotsDirector(canvas, pointBudget());
        canvas.addEventListener('webglcontextlost', () => this.html.classList.replace('dots-ready', 'no-webgl'));
        return this.director;
      })
      .catch((err: unknown) => {
        console.warn('[dots] WebGL indisponible, rendu SVG de secours.', err);
        this.html.classList.add('no-webgl');
        return null;
      });
    return this.directorPromise;
  }

  /* ------------------------- cycle de vie des pages ------------------------- */

  private async mount(): Promise<void> {
    this.page?.destroy();
    this.explorer?.destroy();
    this.reveal?.destroy();
    this.reveal = null;
    this.generation++;
    this.page = null;
    this.explorer = null;
    this.menu?.destroy();
    this.menu = new Menu();

    const bascule = this.bascule;
    this.bascule = null;
    const explorerRoot = document.querySelector<HTMLElement>('[data-explorer]');
    const carnetRoot = document.querySelector<HTMLElement>('[data-carnet]');
    const articleRoot = document.querySelector<HTMLElement>('[data-article]');

    if (explorerRoot) {
      this.explorer = new Explorer(explorerRoot);
      // Sur l'Explorer, seul le pied de page est concerné (les sections ont SectionMotion).
      void this.startReveal(false);
      if (bascule === 'to-explorer') await this.introExplorer(this.explorer);
      else {
        // Arrivée sans bascule (ex. depuis une étude de cas) : plus de poussière en suspens.
        this.suspendOnLoad = false;
        if (this.director?.suspended) {
          this.director.suspended = null;
          this.director.idle();
          this.director.renderer.clear();
        }
        this.html.classList.remove('dots-suspended');
        this.bootExplorer(this.explorer);
      }
    } else {
      this.html.classList.remove('dots-ready');
      if (carnetRoot) this.page = new CarnetPage(carnetRoot);
      if (articleRoot) this.page = new ArticlePage(articleRoot);
      if (bascule === 'to-carnet') await this.introCarnet();
      else if (bascule === 'filter' || bascule === 'lire') {
        void this.introLire(bascule);
        this.director?.idle();
      } else {
        void this.startReveal(false);
        this.director?.attachStage(null);
        this.director?.idle();
        this.director?.renderer.clear();
        this.suspendOnLoad = true;
      }
      // Arrivée directe sur une page Lire : on précharge en tâche de fond ce dont le retour
      // vers l'Explorer aura besoin (three.js, GSAP), pour que la bascule démarre au clic.
      const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
      const warm = (): void => {
        void this.getDirector().then((d) => {
          // Arrivée directe : la poussière de points apparaît doucement, en suspens.
          if (!d || !this.suspendOnLoad || !document.querySelector('[data-carnet], [data-article]')) return;
          this.suspendOnLoad = false;
          this.html.classList.add('dots-suspended');
          void d.suspend(1400, d.library.at(0));
        });
        void import('./site/PageMotion');
      };
      if (ric) ric(warm, { timeout: 3000 });
      else window.setTimeout(warm, 1500);
    }
  }

  /**
   * ScrollReveal (GSAP chargé à la demande). animateVisible : après une bascule, ce qui est
   * déjà à l'écran arrive lui aussi ; à l'arrivée directe, on n'y touche pas (LCP).
   */
  private async startReveal(animateVisible: boolean, delay = 0): Promise<void> {
    const gen = this.generation;
    const { ScrollReveal } = await import('./site/ScrollReveal');
    if (gen !== this.generation) return;
    this.reveal?.destroy();
    this.reveal = new ScrollReveal(document, { animateVisible, delay });
  }

  /** Arrivée directe sur l'Explorer : le texte d'abord, les points ensuite (LCP). */
  private bootExplorer(explorer: Explorer): void {
    if (!this.webgl) return;
    const go = (): void => {
      void this.getDirector().then((d) => {
        if (!d || this.explorer !== explorer) return;
        d.renderer.fade = 1;
        explorer.attach(d);
        this.html.classList.add('dots-ready');
      });
    };
    const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    if (ric) ric(go, { timeout: 1200 });
    else window.setTimeout(go, 200);
  }

  /* -------------------------------- bascule -------------------------------- */

  private prepare(e: TransitionBeforePreparationEvent): void {
    const from = e.from.pathname;
    const to = e.to.pathname;
    this.traverse = e.navigationType === 'traverse';
    let outro: (() => Promise<void>) | null = null;
    if (isExplorerPath(from) && isCarnetPath(to)) {
      this.bascule = 'to-carnet';
      outro = () => this.outroExplorer();
    } else if (isCarnetPath(from) && isExplorerPath(to)) {
      this.bascule = 'to-explorer';
      outro = () => this.outroCarnet();
    } else if (isCarnetPath(from) && isCarnetPath(to) && from !== to) {
      const kind = isListing(from) && isListing(to) ? 'filter' : 'lire';
      this.bascule = kind;
      outro = () => this.outroLire(kind);
    } else this.bascule = null;
    if (!outro) return;
    const original = e.loader;
    // La page cible se charge PENDANT l'animation de sortie : pas de temps mort.
    e.loader = async () => {
      let loaded = false;
      const page = original().finally(() => (loaded = true));
      await outro();
      // Sortie finie, page pas encore là : on ne laisse pas l'écran figé. Après un court délai
      // (invisible sur une bonne connexion), les points montrent qu'on attend.
      if (!loaded) {
        const timer = window.setTimeout(() => this.setWaiting(true), WAIT_DELAY);
        try {
          await page;
        } finally {
          window.clearTimeout(timer);
          this.setWaiting(false);
        }
      } else await page;
    };
  }

  private setWaiting(on: boolean): void {
    this.html.classList.toggle('is-waiting', on);
    if (this.director) this.director.waiting = on;
  }

  private beforeSwap(e: TransitionBeforeSwapEvent): void {
    // Le routeur recopie les attributs du <html> de la page cible : on y reporte l'état client
    // (le script inline qui remplace no-js → js ne se rejoue pas lors d'une navigation client).
    const root = e.newDocument.documentElement;
    root.classList.replace('no-js', 'js');
    for (const c of ['no-webgl', 'dots-ready', 'dots-busy', 'dots-suspended']) if (this.html.classList.contains(c)) root.classList.add(c);
    // Retour vers l'Explorer avec WebGL : la forme statique (image de secours) ne doit pas
    // apparaître le temps que les points prennent le relais.
    // (labels-wait : les étiquettes de la forme attendent que les points soient rassemblés.)
    if (this.bascule === 'to-explorer' && this.director) root.classList.add('dots-returning', 'labels-wait');
    if (this.bascule === 'filter') root.classList.add('is-refiltering');
    else if (this.bascule) root.classList.add('is-arriving');
  }

  /** Sortie d'une page Lire vers une autre page Lire (filtre, ou Carnet ↔ Article). */
  private async outroLire(kind: 'filter' | 'lire'): Promise<void> {
    const root = document.querySelector<HTMLElement>('[data-carnet], [data-article]');
    const motion = await import('./site/PageMotion');
    if (!root) return;
    if (kind === 'filter') {
      // Si la barre de filtres est collée en haut, on y revient après le changement ; sinon on ne bouge pas.
      const bar = root.querySelector<HTMLElement>('[data-filter-bar]');
      const header = document.querySelector<HTMLElement>('.site-header')?.offsetHeight ?? 0;
      const barTop = bar ? bar.getBoundingClientRect().top + window.scrollY - header : 0;
      this.keepY = this.traverse ? null : Math.min(window.scrollY, Math.max(0, barTop));
      await motion.exitList(root);
    } else await motion.exitPage(root);
  }

  private async introLire(kind: 'filter' | 'lire'): Promise<void> {
    const root = document.querySelector<HTMLElement>('[data-carnet], [data-article]');
    const motion = await import('./site/PageMotion');
    if (kind === 'filter' && this.keepY !== null) window.scrollTo({ top: this.keepY, behavior: 'instant' });
    this.keepY = null;
    if (!root) {
      this.html.classList.remove('is-refiltering', 'is-arriving');
      return;
    }
    if (kind === 'filter') motion.prepareList(root);
    else motion.preparePage(root);
    await this.startReveal(true, kind === 'filter' ? 0.12 : 0.3);
    this.html.classList.remove('is-refiltering', 'is-arriving');
    await (kind === 'filter' ? motion.enterList(root) : motion.enterPage(root));
  }

  /**
   * Explorer → Lire. Les points partent dans tous les sens et s'effacent (≈ 1,4 s) ;
   * le texte de la section sort ; la page Lire arrive ~350 ms après le clic et s'installe
   * PENDANT que les points finissent de s'envoler.
   */
  private async outroExplorer(): Promise<void> {
    this.html.classList.add('is-leaving', 'dots-busy');
    const d = this.director;
    if (d && this.explorer) {
      // La scène va quitter le DOM : on la détache (sinon l'observateur de visibilité coupe la boucle).
      d.attachStage(null);
      // Les points explosent puis restent en suspens, très pâles, dans la page Lire.
      this.flight = d.suspend(1600);
    }
    await wait(350);
  }

  private async introCarnet(): Promise<void> {
    const root = document.querySelector<HTMLElement>('[data-carnet], [data-article]');
    const motion = root ? await import('./site/PageMotion') : null;
    if (root && motion) motion.preparePage(root);
    await this.startReveal(true, 0.3);
    this.html.classList.remove('is-arriving');
    await Promise.all([root && motion ? motion.enterPage(root) : Promise.resolve(), this.flight ?? Promise.resolve()]);
    this.flight = null;
    if (this.director?.suspended) this.html.classList.add('dots-suspended');
    this.html.classList.remove('dots-busy');
  }

  /** Lire → Explorer : la page Lire sort en cascade… */
  private async outroCarnet(): Promise<void> {
    const root = document.querySelector<HTMLElement>('[data-carnet], [data-article]');
    const [motion] = await Promise.all([import('./site/PageMotion'), this.getDirector()]);
    this.html.classList.add('is-leaving');
    // La poussière en suspens continue de flotter : c'est elle qui formera la section.
    if (root) await motion.exitPage(root);
    else await wait(300);
  }

  /** …et les points arrivent de partout pour former la section d'origine. */
  private async introExplorer(explorer: Explorer): Promise<void> {
    // Le routeur peut appliquer l'ancre (#section) ou la position restaurée après page-load :
    // on place nous-mêmes la page sur l'ancre, puis on laisse passer une image avant de mesurer.
    const anchor = location.hash ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null;
    anchor?.scrollIntoView({ block: 'start', behavior: 'instant' });
    await nextFrame();
    explorer.timeline.measure();
    const d = this.director;
    if (!d) {
      this.html.classList.remove('is-arriving', 'dots-returning', 'labels-wait');
      return;
    }
    this.html.classList.add('dots-ready', 'dots-busy');
    this.html.classList.remove('dots-suspended');
    const target = Math.round(explorer.timeline.valueAt(window.scrollY));
    this.html.classList.remove('is-arriving');
    // Les mêmes points : la poussière en suspens se rassemble (sinon, arrivée de partout).
    // dots-ready masque désormais l'image de secours (avec son propre fondu) : on retire la classe de retour.
    this.html.classList.remove('dots-returning');
    if (d.suspended) await d.reform(explorer.stage, d.library.at(target), 1500);
    else {
      d.attachStage(explorer.stage);
      await d.gather(d.library.at(target), 1300);
    }
    this.html.classList.remove('dots-busy');
    this.revealLabels(explorer);
    if (this.explorer === explorer) explorer.attach(d, target);
  }

  /** Les étiquettes (années, légendes) apparaissent en fondu, en cascade, une fois la forme posée. */
  private revealLabels(explorer: Explorer): void {
    this.html.classList.remove('labels-wait');
    if (prefersReducedMotion()) return;
    const labels = explorer.stage.querySelectorAll<HTMLElement>('[data-labels-for]:not([hidden]) :is(.stage__label, .stage__leader)');
    labels.forEach((el, k) =>
      el.animate(
        [{ opacity: 0, filter: 'blur(4px)', translate: '0 6px' }, { opacity: 1, filter: 'blur(0)', translate: '0 0' }],
        { duration: 600, delay: k * 70, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'backwards' },
      ),
    );
  }
}

const site = new Site();
site.start();
if (import.meta.env.DEV) (window as unknown as { __site: Site }).__site = site;
