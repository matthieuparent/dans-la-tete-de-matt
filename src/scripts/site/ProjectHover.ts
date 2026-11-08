/**
 * Survol (bureau) / toucher (mobile) des noyaux de la section Projets.
 * Test de distance en espace écran sur les centres (pas de raycasting point par point) :
 * les centres viennent du même générateur que la forme, donc ça marche aussi sans WebGL.
 */
import { navigate } from 'astro:transitions/client';
import { PROJETS } from '../../data/projets';
import { buildShape, STAGE_W, type Nucleus } from '../dots/shapes';
import { fitStage } from '../lib';

const PROJETS_INDEX = 1;

export class ProjectHover {
  private readonly nuclei: readonly Nucleus[] = buildShape('projets', 0.3).nuclei;
  private readonly card: HTMLElement | null = document.querySelector('[data-project-card]');
  private readonly ring: HTMLElement | null;
  private readonly abort = new AbortController();
  private current = -1;
  private pinned = false;
  /** Délai de grâce : le temps d'aller du noyau à la fiche sans qu'elle se ferme. */
  private closeTimer = 0;
  /** Intention de survol : on ne change de projet qu'après un court arrêt sur un autre noyau. */
  private switchTimer = 0;
  private switchTo = -1;
  private overCard = false;

  constructor(
    private readonly stage: HTMLElement,
    private readonly f: () => number,
  ) {
    this.ring = stage.querySelector('[data-nucleus-ring]');
    const sig = { signal: this.abort.signal };
    stage.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      const i = this.hit(e.clientX, e.clientY);
      this.stage.style.cursor = i >= 0 ? 'pointer' : '';
      if (this.pinned) return;
      // En route vers la fiche : aucun autre noyau ne prend la main, la fiche ne se ferme pas.
      if (this.inCorridor(e.clientX, e.clientY)) {
        this.cancelSwitch();
        this.cancelClose();
        return;
      }
      if (i < 0) {
        this.cancelSwitch();
        if (this.current >= 0) this.closeSoon();
        return;
      }
      this.cancelClose();
      if (this.current < 0) this.open(i, false);
      else if (i !== this.current) this.switchSoon(i);
      else this.cancelSwitch();
    }, sig);
    stage.addEventListener('pointerleave', (e) => {
      if (e.pointerType === 'mouse' && !this.pinned) {
        this.cancelSwitch();
        this.closeSoon();
      }
    }, sig);
    // Souris : clic sur un noyau = ouvrir le projet.
    // Tactile (pas de survol) : 1er toucher = fiche, 2e toucher sur le même noyau = projet.
    stage.addEventListener('click', (e) => {
      const i = this.hit(e.clientX, e.clientY);
      if (i < 0) return this.close();
      const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
      if ((canHover || (this.current === i && this.pinned)) && this.go(i)) return;
      this.open(i, true);
    }, sig);
    this.card?.addEventListener('pointerenter', () => {
      this.overCard = true;
      this.cancelClose();
      this.cancelSwitch();
    }, sig);
    this.card?.addEventListener('pointerleave', (e) => {
      this.overCard = false;
      if (e.pointerType === 'mouse' && !this.pinned) this.closeSoon(250);
    }, sig);
    this.card?.querySelector('[data-card-close]')?.addEventListener('click', () => this.close(), sig);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.current >= 0) this.close();
    }, sig);
    window.addEventListener('scroll', () => {
      if (this.current >= 0 && !this.isActive()) this.close();
      else if (this.current >= 0) this.place(this.current);
    }, { passive: true, ...sig });

    // Liste accessible (clavier / lecteur d'écran) : mêmes fiches.
    document.querySelectorAll<HTMLButtonElement>('[data-open-project]').forEach((btn) =>
      btn.addEventListener('click', () => this.open(Number(btn.dataset.openProject), true, btn), sig),
    );
  }

  private isActive(): boolean {
    return Math.abs(this.f() - PROJETS_INDEX) < 0.25;
  }

  /** Indice du noyau sous le pointeur (test de distance en espace écran), ou -1. */
  private hit(cx: number, cy: number): number {
    if (!this.isActive()) return -1;
    const s = fitStage(this.stage);
    const k = s.w / STAGE_W;
    let best = -1;
    let bestD = Infinity;
    for (const n of this.nuclei) {
      const d = Math.hypot(s.x + n.x * k - cx, s.y + n.y * k - cy);
      if (d < Math.max(22, n.r * 3 * k) && d < bestD) {
        best = n.index;
        bestD = d;
      }
    }
    return best;
  }

  /** Ouvre la page du projet. Faux si le projet n'a pas encore de page. */
  private go(i: number): boolean {
    const url = PROJETS[i]?.url;
    if (!url || url === '#') return false;
    if (url.startsWith('/')) void navigate(url);
    else window.location.assign(url);
    return true;
  }

  /**
   * Couloir entre le noyau actif et la fiche : rectangle allant du noyau au bord le plus proche
   * de la fiche, sur toute la hauteur de la fiche (+ marge). Le pointeur qui le traverse va
   * vers la fiche, même s'il frôle un noyau voisin en chemin.
   */
  private inCorridor(px: number, py: number): boolean {
    const n = this.nuclei[this.current];
    if (!n || !this.card || this.card.hidden) return false;
    const s = fitStage(this.stage);
    const k = s.w / STAGE_W;
    const nx = s.x + n.x * k;
    const ny = s.y + n.y * k;
    const c = this.card.getBoundingClientRect();
    const edge = c.left > nx ? c.left : c.right;
    const x0 = Math.min(nx, edge) - 4;
    const x1 = Math.max(nx, edge) + 4;
    const y0 = Math.min(ny, c.top) - 24;
    const y1 = Math.max(ny, c.bottom) + 24;
    return px >= x0 && px <= x1 && py >= y0 && py <= y1 && Math.hypot(px - nx, py - ny) > 6;
  }

  private closeSoon(ms = 450): void {
    if (this.closeTimer) return;
    this.closeTimer = window.setTimeout(() => {
      this.closeTimer = 0;
      if (!this.overCard && !this.pinned) this.close();
    }, ms);
  }

  private cancelClose(): void {
    window.clearTimeout(this.closeTimer);
    this.closeTimer = 0;
  }

  private switchSoon(i: number): void {
    if (this.switchTo === i) return;
    this.cancelSwitch();
    this.switchTo = i;
    this.switchTimer = window.setTimeout(() => {
      this.switchTimer = 0;
      this.switchTo = -1;
      if (!this.overCard && !this.pinned) this.open(i, false);
    }, 140);
  }

  private cancelSwitch(): void {
    window.clearTimeout(this.switchTimer);
    this.switchTimer = 0;
    this.switchTo = -1;
  }

  open(i: number, pin: boolean, returnFocus?: HTMLElement): void {
    const p = PROJETS[i];
    if (!p || !this.card) return;
    this.pinned = pin;
    this.current = i;
    const set = (sel: string, v: string): void => {
      const el = this.card!.querySelector(sel);
      if (el) el.textContent = v;
    };
    set('[data-card-meta]', `${p.year} · ${p.type}`);
    set('[data-card-name]', p.name);
    set('[data-card-summary]', p.summary);
    set('[data-card-tech]', p.tech);
    const link = this.card.querySelector<HTMLAnchorElement>('[data-card-link]');
    if (link) link.href = p.url;
    // Projet sans page (placeholder) : la carte n'est pas cliquable.
    this.card.classList.toggle('is-placeholder', !p.url || p.url === '#');
    const thumb = this.card.querySelector<HTMLImageElement>('[data-card-thumb]');
    const placeholder = this.card.querySelector<HTMLElement>('[data-card-placeholder]');
    if (thumb) {
      if (p.thumb) thumb.src = p.thumb;
      else thumb.removeAttribute('src');
      thumb.hidden = !p.thumb;
    }
    if (placeholder) placeholder.hidden = !!p.thumb;
    this.card.hidden = false;
    this.place(i);
    if (returnFocus) {
      this.card.querySelector<HTMLElement>('[data-card-close]')?.focus();
      this.returnTo = returnFocus;
    }
  }

  private returnTo: HTMLElement | null = null;

  private place(i: number): void {
    const n = this.nuclei[i];
    if (!n || !this.card) return;
    const s = fitStage(this.stage);
    const k = s.w / STAGE_W;
    const x = s.x + n.x * k;
    const y = s.y + n.y * k;
    if (this.ring) {
      const r = Math.max(14, n.r * 3.4) * k;
      // En px par rapport à la boîte de la scène (et non en % : la zone sticky n'a pas
      // forcément les proportions 720 × 708 ; le dessin y est inscrit, cf. fitStage()).
      const box = this.stage.getBoundingClientRect();
      this.ring.style.cssText = `--x:${(x - box.left).toFixed(1)}px;--y:${(y - box.top).toFixed(1)}px;--r:${r.toFixed(1)}px`;
      this.ring.hidden = false;
    }
    // Bureau : la fiche flotte à droite du noyau (à gauche si elle déborde). Mobile : panneau bas (CSS).
    if (window.matchMedia('(min-width: 900px)').matches) {
      // Taille réelle de la fiche (elle varie avec l'écran et le contenu).
      const w = this.card.offsetWidth;
      const h = this.card.offsetHeight;
      const left = x + 40 + w > window.innerWidth - 16 ? x - 40 - w : x + 40;
      const top = Math.min(Math.max(112, y - h * 0.3), window.innerHeight - h - 24);
      this.card.style.left = `${Math.round(left)}px`;
      this.card.style.top = `${Math.round(top)}px`;
    } else {
      this.card.style.left = '';
      this.card.style.top = '';
    }
  }

  close(): void {
    this.cancelClose();
    this.cancelSwitch();
    this.overCard = false;
    if (this.card) this.card.hidden = true;
    if (this.ring) this.ring.hidden = true;
    this.current = -1;
    this.pinned = false;
    if (this.returnTo) {
      this.returnTo.focus();
      this.returnTo = null;
    }
  }

  destroy(): void {
    this.close();
    this.abort.abort();
  }
}
