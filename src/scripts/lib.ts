/** Petits utilitaires partagés (sans dépendance). */
import { STAGE_H, STAGE_W } from './dots/shapes';
import type { StageRect } from './dots/DotsRenderer';

export const clamp = (v: number, a = 0, b = 1): number => Math.min(b, Math.max(a, v));

export const prefersReducedMotion = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

export const nextFrame = (): Promise<void> => new Promise((r) => requestAnimationFrame(() => r()));

/** Observer minimaliste typé. */
export class Emitter<E extends Record<string, unknown>> {
  private readonly map = new Map<keyof E, Set<(v: never) => void>>();
  on<K extends keyof E>(k: K, fn: (v: E[K]) => void): () => void {
    const set = this.map.get(k) ?? new Set();
    set.add(fn as (v: never) => void);
    this.map.set(k, set);
    return () => set.delete(fn as (v: never) => void);
  }
  emit<K extends keyof E>(k: K, v: E[K]): void {
    this.map.get(k)?.forEach((fn) => (fn as (v: E[K]) => void)(v));
  }
}

/**
 * Rectangle 720 × 708 inscrit (« contain ») dans l'élément scène, en px CSS du viewport.
 * Le même calcul sert au WebGL, au survol des noyaux et au placement des étiquettes.
 */
export function fitStage(el: Element): StageRect {
  const r = el.getBoundingClientRect();
  const s = Math.min(r.width / STAGE_W, r.height / STAGE_H);
  const w = STAGE_W * s;
  const h = STAGE_H * s;
  return { x: r.left + (r.width - w) / 2, y: r.top + (r.height - h) / 2, w, h };
}

/** Rectangle par défaut quand aucune scène n'est dans la page (Carnet) : centré dans le viewport. */
export function viewportStage(): StageRect {
  const s = Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H) * 0.8;
  const w = STAGE_W * s;
  const h = STAGE_H * s;
  return { x: (window.innerWidth - w) / 2, y: (window.innerHeight - h) / 2, w, h };
}

/** Budget de points selon l'appareil (cf. fiche, « Contraintes »). */
export function pointBudget(): number {
  const nav = navigator as Navigator & { deviceMemory?: number };
  if ((nav.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 4) return 700;
  if (window.matchMedia('(max-width: 899px), (pointer: coarse)').matches) return 1500;
  return 6000;
}

export function supportsWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') ?? c.getContext('webgl');
    const ok = !!gl;
    (gl as WebGLRenderingContext | null)?.getExtension('WEBGL_lose_context')?.loseContext();
    return ok;
  } catch {
    return false;
  }
}

export const isExplorerPath = (p: string): boolean => p === '/' || p === '/index.html' || p === '';
/** Pages du mode Lire : Carnet, notes ET études de cas (/projets/…), toutes reliées par les bascules. */
export const isCarnetPath = (p: string): boolean => p === '/carnet' || p.startsWith('/carnet/') || p.startsWith('/projets/');
