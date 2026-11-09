/**
 * Animations d'arrivée et de sortie du contenu des sections (GSAP + ScrollTrigger).
 *
 * DÉCLENCHÉES par le défilement (toggle), pas liées à lui (pas de scrub) : le défilement
 * reste natif et libre. Le sens compte : en descendant, le contenu monte ; en remontant, l'inverse.
 *
 * Arrivée (~1,2 s au total) :
 * - le numéro surligné se balaie de gauche à droite (le geste de la marque) ;
 * - le titre monte lettre par lettre depuis l'intérieur de chaque mot (masque), avec une
 *   légère rotation qui se redresse ;
 * - le reste arrive en cascade, de loin (70 px), en sortant d'un flou ;
 * - les lignes de la fiche se tracent de gauche à droite.
 * Mouvement réduit : rien n'est caché, rien n'est animé.
 * L'intro n'est pas cachée au chargement (LCP) : elle ne s'anime qu'à partir de sa première sortie.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { splitChars } from './split';

gsap.registerPlugin(ScrollTrigger);

type Dir = 1 | -1;

interface Parts {
  readonly section: HTMLElement;
  readonly num: HTMLElement[];
  readonly chars: HTMLElement[];
  readonly rows: HTMLElement[];
  readonly rest: HTMLElement[];
  readonly intro: boolean;
}

export class SectionMotion {
  private readonly mm = gsap.matchMedia();
  private parts: Parts[] = [];

  constructor(private readonly root: HTMLElement) {
    this.mm.add(
      { motion: '(prefers-reduced-motion: no-preference)', mobile: '(max-width: 899px)' },
      (ctx) => {
        const { motion, mobile } = ctx.conditions as { motion: boolean; mobile: boolean };
        if (!motion) return;
        this.parts = this.collect();
        for (const p of this.parts) this.wire(p, mobile);
        return () => {
          for (const p of this.parts) gsap.set([...p.num, ...p.chars, ...p.rows, ...p.rest], { clearProps: 'all' });
        };
      },
    );
    void document.fonts?.ready.then(() => ScrollTrigger.refresh());
  }

  private collect(): Parts[] {
    return Array.from(this.root.querySelectorAll<HTMLElement>('[data-shape]')).map((section) => {
      const intro = section.dataset.shape === 'intro';
      const q = <T extends HTMLElement>(sel: string): T[] => Array.from(section.querySelectorAll<T>(sel));
      const title = section.querySelector<HTMLElement>(intro ? '.sec__hero h1' : '.sec__body > h2');
      return {
        section,
        intro,
        num: intro ? q('.sec__hero mark') : q('.kicker .num'),
        chars: title ? splitChars(title) : [],
        rows: q('.facts dt, .facts dd'),
        rest: intro ? q('.sec__hero :is(.sec__id, .lede)') : [...q('.sec__text'), ...q('.sec__body > :is(details, .latest, .button, .sec__hint, .sec__actions)')],
      };
    });
  }

  private wire(p: Parts, mobile: boolean): void {
    const body = p.section.querySelector<HTMLElement>(p.intro ? '.sec__first' : '.sec__body') ?? p.section;
    let armed = !p.intro;
    if (!p.intro) this.hide(p, 1, true);
    ScrollTrigger.create({
      trigger: body,
      // Zone de lecture (et non le bas de l'écran) : on voit l'animation se jouer.
      start: mobile ? 'top 78%' : 'top 62%',
      end: mobile ? 'bottom 55%' : 'bottom 30%',
      onEnter: () => armed && this.show(p, 1),
      onEnterBack: () => armed && this.show(p, -1),
      onLeave: () => {
        armed = true;
        this.hide(p, 1);
      },
      onLeaveBack: () => {
        armed = true;
        this.hide(p, -1);
      },
    });
  }

  /** Arrivée. dir = 1 : on descend (le contenu monte depuis le bas). */
  private show(p: Parts, dir: Dir): void {
    const all = [...p.num, ...p.chars, ...p.rows, ...p.rest];
    gsap.killTweensOf(all);
    const tl = gsap.timeline();
    tl.fromTo(
      p.chars,
      { yPercent: 115 * dir, rotate: 9 * dir, autoAlpha: 1 },
      { yPercent: 0, rotate: 0, duration: 1.05, ease: 'expo.out', stagger: { each: 0.045, from: dir === 1 ? 'start' : 'end' } },
      0,
    );
    if (p.intro) tl.fromTo(p.num, { autoAlpha: 1, backgroundSize: '0% 100%' }, { backgroundSize: '100% 100%', duration: 0.6, ease: 'power3.inOut' }, 0.05);
    // Sections : le badge (surligneur + chiffres) se révèle d'un balayage de gauche à droite.
    else tl.fromTo(p.num, { autoAlpha: 1, clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.55, ease: 'power3.inOut' }, 0.05);
    tl.fromTo(
      p.rows,
      { autoAlpha: 0, x: -40, clipPath: 'inset(0 100% 0 0)' },
      { autoAlpha: 1, x: 0, clipPath: 'inset(0 0% 0 0)', duration: 0.9, ease: 'expo.out', stagger: 0.06 },
      0.25,
    );
    tl.fromTo(
      p.rest,
      { autoAlpha: 0, y: 70 * dir, filter: 'blur(12px)' },
      { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 1.1, ease: 'expo.out', stagger: { each: 0.09, from: dir === 1 ? 'start' : 'end' } },
      0.2,
    );
  }

  /** Sortie. dir = 1 : on descend (le contenu part vers le haut). */
  private hide(p: Parts, dir: Dir, instant = false): void {
    const all = [...p.num, ...p.chars, ...p.rows, ...p.rest];
    gsap.killTweensOf(all);
    if (instant) {
      gsap.set(p.chars, { yPercent: 115, rotate: 9 });
      gsap.set(p.num, p.intro ? { backgroundSize: '0% 100%' } : { clipPath: 'inset(0% 100% 0% 0%)' });
      gsap.set(p.rows, { autoAlpha: 0, x: -40, clipPath: 'inset(0 100% 0 0)' });
      gsap.set(p.rest, { autoAlpha: 0, y: 70, filter: 'blur(12px)' });
      return;
    }
    const tl = gsap.timeline();
    tl.to(p.chars, { yPercent: -115 * dir, rotate: -6 * dir, duration: 0.5, ease: 'power3.in', stagger: { each: 0.02, from: dir === 1 ? 'start' : 'end' } }, 0);
    // Sortie : le badge se replie vers la droite (le balayage continue dans le même sens).
    tl.to(p.num, p.intro ? { backgroundSize: '0% 100%', duration: 0.35, ease: 'power2.in' } : { clipPath: 'inset(0% 0% 0% 100%)', duration: 0.35, ease: 'power2.in' }, 0);
    tl.to(p.rows, { autoAlpha: 0, x: 30, duration: 0.4, ease: 'power2.in', stagger: 0.02 }, 0);
    tl.to(p.rest, { autoAlpha: 0, y: -40 * dir, filter: 'blur(8px)', duration: 0.45, ease: 'power2.in', stagger: 0.03 }, 0);
  }

  destroy(): void {
    // Ne défait que ses propres déclencheurs (ScrollReveal en a d'autres sur la même page).
    this.mm.revert();
  }
}
