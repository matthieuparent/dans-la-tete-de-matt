/**
 * Arrivée au défilement pour tout ce qui n'est pas une section de l'Explorer :
 * contenu des articles et des études de cas, notes du Carnet, pied de page.
 * Même langage que SectionMotion (page d'accueil) :
 * - titres : lettres qui montent depuis l'intérieur des mots, légère rotation qui se redresse,
 *   numéro qui se balaie de gauche à droite ;
 * - blocs : arrivent de loin (70 px) en sortant d'un flou, en cascade ;
 * - lignes de fiche (dt/dd) : se tracent de gauche à droite.
 * Déclenché par le défilement, jamais lié à lui. Le sens compte (en remontant, on arrive du haut).
 * UNE SEULE FOIS : contrairement aux sections de l'accueil, on lit ici en continu ; un bloc qui
 * s'efface au bord de l'écran puis revient donnait un défilement saccadé.
 *
 * Ce qui est déjà à l'écran à la création :
 * - arrivée directe (animateVisible = false) : laissé tel quel (LCP, pas de flash) ;
 * - après une bascule (animateVisible = true) : animé tout de suite, après `delay`.
 * Mouvement réduit : rien n'est caché, rien n'est animé.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { splitChars } from './split';

gsap.registerPlugin(ScrollTrigger);

type Dir = 1 | -1;

const TITLES = '.prose > h2, .site-footer .logo-long';
const ROWS = '.case__facts > div, .credits > div';
const BLOCKS = [
  '.case__cover',
  '.prose > :not(h2, .phones, .credits)',
  '.phones li',
  '.note-list > li',
  '.notes__empty',
  '.article__foot > *',
  '.site-footer__tag',
  '.site-footer__cols > *',
  '.site-footer__legal',
].join(', ');

export interface RevealOptions {
  readonly animateVisible: boolean;
  /** Secondes avant la première arrivée (laisser l'en-tête de page s'installer). */
  readonly delay?: number;
}

export class ScrollReveal {
  private readonly mm = gsap.matchMedia();

  constructor(root: ParentNode, opts: RevealOptions) {
    this.mm.add(
      { motion: '(prefers-reduced-motion: no-preference)', mobile: '(max-width: 899px)' },
      (ctx) => {
        const { motion, mobile } = ctx.conditions as { motion: boolean; mobile: boolean };
        if (!motion) return;
        const startAt = performance.now() + (opts.delay ?? 0) * 1000;
        const lag = (): number => Math.max(0, startAt - performance.now()) / 1000;
        const onScreen = (el: Element): boolean => {
          const r = el.getBoundingClientRect();
          return r.top < window.innerHeight - 8 && r.bottom > 0 && r.height > 0;
        };
        /** Déjà à l'écran à la création : on ignore son premier « onEnter ». */
        const settled = new WeakSet<Element>();
        /** Éléments actuellement cachés (en attente d'arrivée). */
        const waiting = new Set<HTMLElement>();
        const q = (sel: string): HTMLElement[] => Array.from(root.querySelectorAll<HTMLElement>(sel));
        // clamp() au départ : le bas de page (pied, dernières notes) n'atteindrait jamais 86 % de
        // l'écran. Pas à la fin : une fin ramenée au bas de page ferait « sortir » le pied en l'atteignant.
        const trigger = { start: mobile ? 'clamp(top 92%)' : 'clamp(top 86%)', end: 'bottom top' };

        const titles = q(TITLES).map((el) => new Title(el));
        const rows = q(ROWS);
        const blocks = q(BLOCKS).filter((el) => !el.closest('.toc'));

        // Une seule interface pour les trois familles ; elle tient à jour la liste des éléments cachés
        // et n'anime jamais deux fois le même élément.
        const titleAnim: Anim = {
          set: (els) => titles.filter((t) => els.includes(t.el)).forEach((t) => t.set()),
          show: (els, dir, delay) => titles.filter((t) => els.includes(t.el)).forEach((t) => t.show(dir, delay)),
        };
        const tracked = (a: Anim): Anim => ({
          set: (els) => (els.forEach((el) => waiting.add(el)), a.set(els)),
          show: (els, dir, delay) => {
            const due = els.filter((el) => waiting.has(el));
            due.forEach((el) => waiting.delete(el));
            if (due.length) a.show(due, dir, delay);
          },
        });
        const families: Array<[HTMLElement[], Anim]> = [
          [titles.map((t) => t.el), tracked(titleAnim)],
          [blocks, tracked(BLOCK)],
          [rows, tracked(ROW)],
        ];

        const fresh = (els: Element[]): HTMLElement[] =>
          (els as HTMLElement[]).filter((el) => (settled.has(el) ? (settled.delete(el), false) : true));

        for (const [els, anim] of families) {
          if (!els.length) continue;
          const visible = els.filter(onScreen);
          visible.forEach((el) => settled.add(el));
          anim.set(els.filter((el) => !settled.has(el) || opts.animateVisible));
          if (opts.animateVisible) anim.show(visible, 1, lag());
          ScrollTrigger.batch(els, {
            ...trigger,
            interval: 0.08,
            onEnter: (e) => anim.show(fresh(e), 1, lag()),
            onEnterBack: (e) => anim.show(fresh(e), -1, lag()),
          });
        }

        // Rattrapage : la ligne de départ (86 %) laisse une bande en bas d'écran. Si la page
        // s'arrête là (fin de défilement, polices chargées, hauteur qui change), ce qui y est
        // visible ne doit pas rester caché : on le fait arriver.
        const sweep = (): void => {
          for (const [els, anim] of families) {
            const due = els.filter((el) => waiting.has(el) && onScreen(el));
            if (due.length) anim.show(due, 1, lag());
          }
        };
        ScrollTrigger.addEventListener('scrollEnd', sweep);
        ScrollTrigger.addEventListener('refresh', sweep);
        const sweepTimer = window.setTimeout(sweep, 600);

        return () => {
          ScrollTrigger.removeEventListener('scrollEnd', sweep);
          ScrollTrigger.removeEventListener('refresh', sweep);
          window.clearTimeout(sweepTimer);
          for (const t of titles) t.reset();
          gsap.set([...rows, ...blocks], { clearProps: 'all' });
        };
      },
    );
    void document.fonts?.ready.then(() => ScrollTrigger.refresh());
    // La hauteur de page bouge après coup (scène de l'Explorer, images, polices) : on recalcule,
    // sinon les déclencheurs du bas de page restent hors d'atteinte.
    let lastH = document.body.scrollHeight;
    this.ro = new ResizeObserver(() => {
      const h = document.body.scrollHeight;
      if (h === lastH) return;
      lastH = h;
      window.clearTimeout(this.refreshTimer);
      this.refreshTimer = window.setTimeout(() => ScrollTrigger.refresh(), 150);
    });
    this.ro.observe(document.body);
  }

  private readonly ro: ResizeObserver;
  private refreshTimer = 0;

  destroy(): void {
    this.ro.disconnect();
    window.clearTimeout(this.refreshTimer);
    this.mm.revert();
  }
}

/* ------------------------------------------------------------------ */

interface Anim {
  set(els: HTMLElement[]): void;
  show(els: HTMLElement[], dir: Dir, delay: number): void;
}

const from = (dir: Dir): 'start' | 'end' => (dir === 1 ? 'start' : 'end');

const BLOCK: Anim = {
  set: (els) => void gsap.set(els, { autoAlpha: 0, y: 70, filter: 'blur(12px)' }),
  show(els, dir, delay) {
    if (!els.length) return;
    gsap.killTweensOf(els);
    gsap.fromTo(
      els,
      { autoAlpha: 0, y: 70 * dir, filter: 'blur(12px)' },
      { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 1.1, ease: 'expo.out', delay, stagger: { each: 0.09, from: from(dir) }, clearProps: 'filter' },
    );
  },
};

const ROW: Anim = {
  set: (els) => void gsap.set(els, { autoAlpha: 0, x: -40, clipPath: 'inset(0 100% 0 0)' }),
  show(els, _dir, delay) {
    if (!els.length) return;
    gsap.killTweensOf(els);
    gsap.fromTo(
      els,
      { autoAlpha: 0, x: -40, clipPath: 'inset(0 100% 0 0)' },
      { autoAlpha: 1, x: 0, clipPath: 'inset(0 0% 0 0)', duration: 0.9, ease: 'expo.out', delay, stagger: 0.06 },
    );
  },
};

/** Titre découpé en lettres ; le numéro (::before des h2 d'article) se balaie via `.is-in`. */
class Title {
  readonly chars: HTMLElement[];
  private readonly numbered: boolean;

  constructor(readonly el: HTMLElement) {
    this.numbered = el.matches('.prose > h2');
    const label = (el.textContent ?? '').replace(/\u00AD/g, '').replace(/\s+/g, ' ').trim();
    // h2 d'article en flex (numéro + texte) : les mots doivent rester dans un seul élément flex.
    if (this.numbered && !el.querySelector(':scope > .h2-text')) {
      const wrap = document.createElement('span');
      wrap.className = 'h2-text';
      wrap.append(...Array.from(el.childNodes));
      el.append(wrap);
    }
    this.chars = splitChars(this.numbered ? el.querySelector<HTMLElement>(':scope > .h2-text')! : el);
    if (this.numbered) {
      el.classList.add('reveal-num', 'is-in');
      // Lecteurs d'écran : l'étiquette est sur le span ; le titre garde son texte.
      el.setAttribute('aria-label', label);
    }
  }

  /** Les longs titres d'article ne doivent pas mettre deux secondes à s'écrire. */
  private get each(): number {
    return Math.min(0.045, 0.8 / Math.max(1, this.chars.length));
  }

  set(): void {
    gsap.set(this.chars, { yPercent: 115, rotate: 9 });
    this.el.classList.remove('is-in');
  }

  show(dir: Dir, delay: number): void {
    gsap.killTweensOf(this.chars);
    gsap.fromTo(
      this.chars,
      { yPercent: 115 * dir, rotate: 9 * dir },
      { yPercent: 0, rotate: 0, duration: 1.05, ease: 'expo.out', delay, stagger: { each: this.each, from: from(dir) } },
    );
    if (delay > 0) window.setTimeout(() => this.el.classList.add('is-in'), delay * 1000);
    else this.el.classList.add('is-in');
  }


  reset(): void {
    gsap.set(this.chars, { clearProps: 'all' });
    this.el.classList.remove('reveal-num');
    this.el.classList.add('is-in');
  }
}
