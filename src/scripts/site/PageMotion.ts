/**
 * Entrée et sortie des pages « Lire » (Carnet, Article) pendant la bascule.
 * L'entrée se joue PENDANT que les points partent dans tous les sens : la page Lire
 * s'installe tranquillement, on ne voit jamais d'écran vide ni de coupure.
 */
import { gsap } from 'gsap';
import { prefersReducedMotion, wait } from '../lib';
import { splitChars } from './split';

/** Fin d'une timeline, ou délai de sécurité (onglet caché = images suspendues = timeline figée). */
const done = (tl: gsap.core.Timeline): Promise<void> =>
  Promise.race([new Promise<void>((resolve) => void tl.eventCallback('onComplete', () => resolve())), wait(tl.duration() * 1000 + 400)]);

interface Targets {
  title: HTMLElement | null;
  bar: HTMLElement[];
  blocks: HTMLElement[];
}

function targets(root: HTMLElement): Targets {
  const q = (sel: string): HTMLElement[] => Array.from(root.querySelectorAll<HTMLElement>(sel));
  if (root.matches('[data-carnet]')) {
    return {
      title: root.querySelector('.carnet__band h1'),
      bar: q('.filters li'),
      blocks: [...q('.carnet__band .lede'), ...q('.carnet__hint'), ...q('.carnet__chapter > *'), ...q('.notes__empty, .note--featured, .note-list > li')],
    };
  }
  return {
    title: root.querySelector('.article__title'),
    bar: [],
    blocks: [...q('.article__head .back-link'), ...q('.article__meta, .article__title-block .lede, .article__byline'), ...q('.article__layout, .article__foot')],
  };
}

/** Prépare l'état caché (avant de retirer `is-arriving`), pour éviter tout flash. */
export function preparePage(root: HTMLElement): void {
  if (prefersReducedMotion()) return;
  const t = targets(root);
  const chars = t.title ? splitChars(t.title) : [];
  gsap.set(chars, { yPercent: 115, rotate: 8 });
  gsap.set(t.bar, { autoAlpha: 0, y: -24 });
  gsap.set(t.blocks, { autoAlpha: 0, y: 60, filter: 'blur(12px)' });
}

export function enterPage(root: HTMLElement): Promise<void> {
  if (prefersReducedMotion()) return Promise.resolve();
  const t = targets(root);
  const chars = t.title ? splitChars(t.title) : [];
  const tl = gsap.timeline();
  tl.to(chars, { yPercent: 0, rotate: 0, duration: 1.1, ease: 'expo.out', stagger: 0.03 }, 0.1);
  tl.to(t.bar, { autoAlpha: 1, y: 0, duration: 0.8, ease: 'expo.out', stagger: 0.05 }, 0.2);
  tl.to(t.blocks, { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 1.1, ease: 'expo.out', stagger: 0.08, clearProps: 'filter,transform' }, 0.25);
  return done(tl);
}

export function exitPage(root: HTMLElement): Promise<void> {
  if (prefersReducedMotion()) {
    root.style.opacity = '0';
    return Promise.resolve();
  }
  const t = targets(root);
  const all = [...(t.title ? [t.title] : []), ...t.bar, ...t.blocks];
  const tl = gsap.timeline();
  tl.to(all, { autoAlpha: 0, y: -40, filter: 'blur(10px)', duration: 0.45, ease: 'power2.in', stagger: 0.025 });
  return done(tl);
}
