/**
 * Carnet : bascule liste ↔ cartes animée, et vignette qui suit la souris en mode liste.
 *
 * Bascule (même langage que ScrollReveal) : ce qui est à l'écran s'efface en tombant dans un
 * flou, on change de mode, puis le nouveau contenu visible arrive de 40 px en sortant du flou,
 * en cascade. Les boutons de bascule restent au même endroit à l'écran (on compense le
 * défilement : le titre de section change de place entre les deux modes).
 * Pas de FLIP : une ligne de liste et une carte n'ont ni la même forme ni le même contenu,
 * un morphing étirerait le texte.
 *
 * On anime les `.note` (pas les `li`) : ScrollReveal garde la main sur les `li` encore cachés.
 * Mouvement réduit : bascule instantanée, pas de vignette mobile.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

type View = 'list' | 'cards';

const reduced = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export class NotesView {
  private readonly abort = new AbortController();
  private readonly buttons: HTMLButtonElement[];
  private busy: gsap.core.Timeline | null = null;
  private readonly peek: Peek | null;

  constructor(
    private readonly root: HTMLElement,
    private readonly notes: HTMLElement,
  ) {
    const sig = { signal: this.abort.signal };
    this.buttons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-view-btn]'));
    for (const btn of this.buttons) {
      btn.addEventListener('click', () => this.switchTo((btn.dataset.viewBtn as View) ?? 'list'), sig);
    }
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    this.peek = fine && !reduced() ? new Peek(notes) : null;
  }

  private get view(): View {
    return this.notes.dataset.view === 'cards' ? 'cards' : 'list';
  }

  private apply(view: View): void {
    this.notes.dataset.view = view;
    for (const b of this.buttons) b.setAttribute('aria-pressed', String(b.dataset.viewBtn === view));
    try {
      localStorage.setItem('carnet-view', view);
    } catch {
      /* stockage indisponible : le choix vaut pour cette page seulement */
    }
    this.peek?.hide(true);
  }

  /** Ce qui bouge pendant la bascule : en-tête de section et notes visibles. */
  private targets(): HTMLElement[] {
    const onScreen = (el: Element): boolean => {
      const r = el.getBoundingClientRect();
      return r.bottom > 0 && r.top < window.innerHeight && r.height > 0;
    };
    const chapter = Array.from(this.root.querySelectorAll<HTMLElement>('.carnet__chapter > *'));
    const notes = Array.from(this.notes.querySelectorAll<HTMLElement>('.note-list > li'))
      // Un li encore caché par ScrollReveal arrivera seul, au défilement.
      .filter((li) => gsap.getProperty(li, 'opacity') !== 0)
      .map((li) => li.querySelector<HTMLElement>('.note'))
      .filter((n): n is HTMLElement => !!n);
    return [...chapter, ...notes].filter(onScreen);
  }

  switchTo(view: View): void {
    if (view === this.view && !this.busy) return;
    const tools = this.notes.querySelector<HTMLElement>('.notes__tools');
    const anchor = (): number => tools?.getBoundingClientRect().top ?? 0;

    if (reduced()) {
      const before = anchor();
      this.apply(view);
      window.scrollBy({ top: anchor() - before, behavior: 'instant' });
      ScrollTrigger.refresh();
      return;
    }

    this.busy?.progress(1);
    const out = this.targets();
    // Pendant la bascule, pas de vignette (la souris se retrouve sur une ligne sans avoir bougé).
    this.notes.classList.add('is-switching');
    const tl = gsap.timeline({ onComplete: () => void (this.busy = null) });
    this.busy = tl;
    tl.to(out, { autoAlpha: 0, y: 24, filter: 'blur(8px)', duration: 0.28, ease: 'power2.in', stagger: { each: 0.018, from: 'start' } });
    tl.add(() => {
      gsap.set(out, { clearProps: 'opacity,visibility,transform,filter' });
      const before = anchor();
      this.apply(view);
      window.scrollBy({ top: anchor() - before, behavior: 'instant' });
      ScrollTrigger.refresh();
      const inn = this.targets();
      window.setTimeout(() => this.notes.classList.remove('is-switching'), 700);
      gsap.fromTo(
        inn,
        { autoAlpha: 0, y: 40, filter: 'blur(10px)' },
        { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 0.9, ease: 'expo.out', stagger: { each: 0.045, from: 'start' }, clearProps: 'opacity,visibility,transform,filter' },
      );
    });
  }

  destroy(): void {
    this.busy?.kill();
    this.abort.abort();
    this.peek?.destroy();
  }
}

/* ------------------------------------------------------------------ */

/**
 * Vignette qui suit la souris au survol d'une ligne (mode liste seulement).
 * Reprend le contenu de `.note__media` de la ligne (image, ou « À venir » / gabarit rayé).
 * Suit avec un léger retard (quickTo) et s'incline selon la vitesse horizontale.
 * Décorative : aria-hidden, jamais interactive.
 */
class Peek {
  private readonly abort = new AbortController();
  private readonly el: HTMLDivElement;
  private readonly inner: HTMLDivElement;
  private readonly x: gsap.QuickToFunc;
  private readonly y: gsap.QuickToFunc;
  private readonly rot: gsap.QuickToFunc;
  private current: HTMLElement | null = null;
  private lastX = 0;
  private shown = false;
  private still = 0;

  constructor(private readonly notes: HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = 'note-peek';
    this.el.setAttribute('aria-hidden', 'true');
    this.inner = document.createElement('div');
    this.inner.className = 'note-peek__inner note__media';
    this.el.append(this.inner);
    document.body.append(this.el);
    gsap.set(this.el, { autoAlpha: 0, scale: 0.6, transformOrigin: '0% 0%' });
    this.x = gsap.quickTo(this.el, 'x', { duration: 0.55, ease: 'power3.out' });
    this.y = gsap.quickTo(this.el, 'y', { duration: 0.55, ease: 'power3.out' });
    this.rot = gsap.quickTo(this.el, 'rotation', { duration: 0.6, ease: 'power3.out' });

    const sig = { signal: this.abort.signal };
    notes.addEventListener('pointerover', (e) => this.over(e), sig);
    notes.addEventListener('pointermove', (e) => this.move(e), sig);
    notes.addEventListener('pointerleave', () => this.hide(), sig);
    window.addEventListener('scroll', () => this.hide(), { passive: true, ...sig });
  }

  private rowAt(target: EventTarget | null): HTMLElement | null {
    if (this.notes.dataset.view !== 'list' || this.notes.classList.contains('is-switching')) return null;
    return (target as Element | null)?.closest<HTMLElement>('.note') ?? null;
  }

  private over(e: PointerEvent): void {
    if (e.pointerType !== 'mouse') return;
    const row = this.rowAt(e.target);
    if (!row) return this.hide();
    if (row === this.current) return;
    this.current = row;
    const media = row.querySelector('.note__media');
    this.inner.replaceChildren(...Array.from(media?.childNodes ?? []).map((n) => n.cloneNode(true)));
    this.el.classList.toggle('is-avenir', row.classList.contains('note--avenir'));
    // Changement de ligne : petite pulsation de l'image, pas de nouvelle apparition.
    if (this.shown) gsap.fromTo(this.inner, { scale: 1.08 }, { scale: 1, duration: 0.5, ease: 'power3.out', overwrite: true });
    this.show(e);
  }

  private show(e: PointerEvent): void {
    if (!this.shown) {
      // Première apparition : on part de la souris, sans glisser depuis l'ancienne position.
      const [px, py] = this.place(e);
      gsap.set(this.el, { x: px, y: py });
      this.x(px);
      this.y(py);
      this.lastX = e.clientX;
    }
    this.shown = true;
    gsap.to(this.el, { autoAlpha: 1, scale: 1, duration: 0.45, ease: 'back.out(1.6)', overwrite: 'auto' });
  }

  /** Coin haut-gauche : en bas à droite du pointeur (on lit la ligne sans la masquer), côté opposé près des bords. */
  private place(e: PointerEvent): [number, number] {
    const GAP = 28;
    const w = this.el.offsetWidth;
    const h = this.el.offsetHeight;
    const x = e.clientX + GAP + w > window.innerWidth ? e.clientX - GAP - w : e.clientX + GAP;
    const y = e.clientY + GAP + h > window.innerHeight ? e.clientY - GAP - h : e.clientY + GAP;
    return [x, y];
  }

  private move(e: PointerEvent): void {
    if (!this.shown) return;
    const [px, py] = this.place(e);
    this.x(px);
    this.y(py);
    const vx = e.clientX - this.lastX;
    this.lastX = e.clientX;
    this.rot(gsap.utils.clamp(-8, 8, vx * 0.6));
    // La souris s'arrête : la vignette se redresse.
    window.clearTimeout(this.still);
    this.still = window.setTimeout(() => this.rot(0), 90);
  }

  hide(instant = false): void {
    if (!this.shown && !instant) return;
    this.shown = false;
    this.current = null;
    this.rot(0);
    if (instant) gsap.set(this.el, { autoAlpha: 0, scale: 0.6 });
    else gsap.to(this.el, { autoAlpha: 0, scale: 0.6, duration: 0.3, ease: 'power2.in', overwrite: 'auto' });
  }

  destroy(): void {
    window.clearTimeout(this.still);
    this.abort.abort();
    gsap.killTweensOf([this.el, this.inner]);
    this.el.remove();
  }
}
