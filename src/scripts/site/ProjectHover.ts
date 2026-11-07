/**
 * Survol (bureau) / toucher (mobile) des noyaux de la section Projets.
 * Test de distance en espace écran sur les centres (pas de raycasting point par point) :
 * les centres viennent du même générateur que la forme, donc ça marche aussi sans WebGL.
 */
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

  constructor(
    private readonly stage: HTMLElement,
    private readonly f: () => number,
  ) {
    this.ring = stage.querySelector('[data-nucleus-ring]');
    const sig = { signal: this.abort.signal };
    stage.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'mouse' && !this.pinned) this.pick(e.clientX, e.clientY, false);
    }, sig);
    stage.addEventListener('pointerleave', (e) => {
      if (e.pointerType === 'mouse' && !this.pinned && !this.card?.matches(':hover')) this.close();
    }, sig);
    stage.addEventListener('click', (e) => this.pick(e.clientX, e.clientY, true), sig);
    this.card?.addEventListener('pointerleave', (e) => {
      if (e.pointerType === 'mouse' && !this.pinned) this.close();
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

  private pick(cx: number, cy: number, pin: boolean): void {
    if (!this.isActive()) return;
    const s = fitStage(this.stage);
    const k = s.w / STAGE_W;
    let best = -1;
    let bestD = Infinity;
    for (const n of this.nuclei) {
      const d = Math.hypot(s.x + n.x * k - cx, s.y + n.y * k - cy);
      const hit = Math.max(22, n.r * 3 * k);
      if (d < hit && d < bestD) {
        best = n.index;
        bestD = d;
      }
    }
    if (best >= 0) this.open(best, pin);
    else if (pin) this.close();
    else if (!this.pinned) this.close();
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
      const w = 260;
      const left = x + 40 + w > window.innerWidth - 16 ? x - 40 - w : x + 40;
      const top = Math.min(Math.max(112, y - 60), window.innerHeight - 340);
      this.card.style.left = `${Math.round(left)}px`;
      this.card.style.top = `${Math.round(top)}px`;
    } else {
      this.card.style.left = '';
      this.card.style.top = '';
    }
  }

  close(): void {
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
