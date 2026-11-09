/** Contrôleurs légers des pages Carnet, Article et du menu mobile. */

/**
 * Carnet : bascule liste / cartes (module à part) et puce active visible.
 * La barre de filtres est simplement collante (CSS) : elle défile avec la page jusqu'à toucher
 * l'en-tête, puis reste en place. Elle ne se masque plus en descendant (elle bougeait avant
 * même d'atteindre sa zone).
 */
export class CarnetPage {
  private readonly abort = new AbortController();

  constructor(root: HTMLElement) {
    // Liste / cartes (mémorisé), transition et vignette au survol : chargé à part (GSAP).
    const notes = root.querySelector<HTMLElement>('[data-notes]');
    if (notes) {
      void import('./NotesView').then(({ NotesView }) => {
        if (this.abort.signal.aborted) return;
        this.view = new NotesView(root, notes);
      });
    }

    // Filtre actif : on garde la puce visible dans la barre qui défile à l'horizontale (mobile).
    root.querySelector('[aria-current="page"]')?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'instant' });
  }

  private view: { destroy(): void } | null = null;

  destroy(): void {
    this.abort.abort();
    this.view?.destroy();
  }
}

/** Article : barre de progression de lecture et sommaire actif. */
export class ArticlePage {
  private readonly abort = new AbortController();
  private readonly io: IntersectionObserver | null = null;
  private raf = 0;

  constructor(root: HTMLElement) {
    const bar = root.querySelector<HTMLElement>('[data-progress]');
    const body = root.querySelector<HTMLElement>('[data-article-body]');
    const sig = { signal: this.abort.signal };
    if (bar && body) {
      const update = (): void => {
        this.raf = 0;
        const r = body.getBoundingClientRect();
        const total = r.height - window.innerHeight * 0.6;
        const p = Math.min(1, Math.max(0, (window.innerHeight * 0.4 - r.top) / Math.max(1, total)));
        bar.style.setProperty('--p', p.toFixed(4));
        bar.setAttribute('aria-valuenow', String(Math.round(p * 100)));
      };
      window.addEventListener('scroll', () => {
        if (!this.raf) this.raf = requestAnimationFrame(update);
      }, { passive: true, ...sig });
      update();
    }
    // Mobile : sommaire replié par défaut (cf. maquette Mobile).
    const toc = root.querySelector<HTMLDetailsElement>('[data-toc] details');
    if (toc && window.matchMedia('(max-width: 899px)').matches) toc.open = false;

    const links = new Map<string, HTMLAnchorElement>();
    root.querySelectorAll<HTMLAnchorElement>('[data-toc] a[href^="#"]').forEach((a) => links.set(decodeURIComponent(a.hash.slice(1)), a));
    if (links.size) {
      this.io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (!e.isIntersecting) continue;
            links.forEach((a) => a.removeAttribute('aria-current'));
            links.get(e.target.id)?.setAttribute('aria-current', 'true');
          }
        },
        { rootMargin: '-20% 0px -70% 0px' },
      );
      links.forEach((_, id) => {
        const h = document.getElementById(id);
        if (h) this.io!.observe(h);
      });
    }
  }

  destroy(): void {
    cancelAnimationFrame(this.raf);
    this.io?.disconnect();
    this.abort.abort();
  }
}

/** Menu plein écran (mobile) : <dialog> natif, fermé au clic d'un lien. */
export class Menu {
  private readonly abort = new AbortController();
  constructor() {
    const dialog = document.querySelector<HTMLDialogElement>('[data-menu]');
    const open = document.querySelector<HTMLButtonElement>('[data-menu-open]');
    if (!dialog || !open) return;
    const sig = { signal: this.abort.signal };
    open.addEventListener('click', () => {
      dialog.showModal();
      open.setAttribute('aria-expanded', 'true');
    }, sig);
    dialog.addEventListener('close', () => {
      open.setAttribute('aria-expanded', 'false');
    }, sig);
    dialog.querySelectorAll('a, [data-menu-close]').forEach((el) => el.addEventListener('click', () => dialog.close(), sig));
  }
  destroy(): void {
    this.abort.abort();
  }
}
