/**
 * Survol (bureau) / toucher (mobile) des noyaux de la section Projets.
 * Test de distance en espace écran sur les centres (pas de raycasting point par point) :
 * les centres viennent du même générateur que la forme, donc ça marche aussi sans WebGL.
 *
 * Souris : la fiche est un APERÇU (non cliquable, la souris la traverse). C'est le noyau qu'on
 * clique pour ouvrir le projet ; on passe librement d'un noyau à l'autre.
 * Tactile : 1er toucher = fiche (panneau bas, avec lien et « Fermer »), 2e toucher = projet.
 *
 * Arrivée de la fiche (Web Animations API, pas de GSAP sur l'accueil au chargement) :
 * l'anneau surligneur éclot sur le noyau, un fil se trace du noyau vers la fiche, la fiche
 * se déplie depuis le bout du fil (léger flip 3D), puis l'image se pose et les lignes montent.
 * Changement de noyau, fiche ouverte : elle se replie, le halo voyage, et la nouvelle fiche
 * refait son arrivée complète quand le halo approche.
 *
 * Halo (WebGL) : posé sur le projet le plus récent, il glisse LE LONG de la ligne de temps
 * jusqu'au noyau survolé, puis revient au plus récent quand on s'en va. Il remplace l'anneau
 * HTML (un seul disque jaune, un seul sens : « où tu es sur la ligne de temps »).
 * Sans WebGL, l'anneau HTML reste.
 */
import { navigate } from 'astro:transitions/client';
import { PROJETS } from '../../data/projets';
import { buildShape, HALO_K, nucleusAt, STAGE_W, type Nucleus } from '../dots/shapes';
import { fitStage, prefersReducedMotion } from '../lib';

const PROJETS_INDEX = 1;
const GAP = 72;
const EXPO = 'cubic-bezier(0.16, 1, 0.3, 1)';
const OVERSHOOT = 'cubic-bezier(0.34, 1.45, 0.64, 1)';

interface Spot {
  /** Centre du noyau (écran). */
  readonly x: number;
  readonly y: number;
  /** Rayon de l'anneau (px). */
  readonly r: number;
  readonly left: number;
  readonly top: number;
  /** La fiche est à droite du noyau. */
  readonly right: boolean;
}

export class ProjectHover {
  private readonly nuclei: readonly Nucleus[] = buildShape('projets', 0.3).nuclei;
  private readonly card: HTMLElement | null = document.querySelector('[data-project-card]');
  private readonly ring: HTMLElement | null;
  private readonly leader: HTMLDivElement;
  private readonly abort = new AbortController();
  private readonly fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  private current = -1;
  private pinned = false;
  private closeTimer = 0;
  /** Intention : on ne change de projet qu'après un très court arrêt sur un autre noyau. */
  private switchTimer = 0;
  private switchTo = -1;
  private hideTimer = 0;
  private returnTo: HTMLElement | null = null;
  /** Déplace le halo WebGL (px scène) ; null sans WebGL. */
  private halo: ((x: number, y: number, scale: number) => void) | null = null;
  /** Position du halo sur la ligne de temps (t ∈ [0,1], 1 = plus récent). */
  private haloT = 1;
  private haloScale = 1;
  private haloRaf = 0;
  /** Ouverture différée (attente du halo) ; le jeton invalide une ouverture dépassée. */
  private showTimer = 0;
  private openToken = 0;

  constructor(
    private readonly stage: HTMLElement,
    private readonly f: () => number,
  ) {
    this.ring = stage.querySelector('[data-nucleus-ring]');
    this.leader = document.createElement('div');
    this.leader.className = 'project-leader';
    this.leader.hidden = true;
    this.leader.setAttribute('aria-hidden', 'true');
    document.body.append(this.leader);

    const sig = { signal: this.abort.signal };
    stage.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      const i = this.hit(e.clientX, e.clientY);
      this.stage.style.cursor = i >= 0 && this.hasPage(i) ? 'pointer' : '';
      if (this.pinned) return;
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
      if ((this.fine.matches || (this.current === i && this.pinned)) && this.go(i)) return;
      if (!this.fine.matches) this.open(i, true);
    }, sig);
    this.card?.querySelector('[data-card-close]')?.addEventListener('click', () => this.close(), sig);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.current >= 0) this.close();
    }, sig);
    window.addEventListener('scroll', () => {
      if (!this.isActive()) {
        if (this.current >= 0) this.close();
        // Hors de la section : le halo revient à sa place tout de suite (la forme suivante a ses propres halos).
        if (this.haloT !== 1) this.snapHalo(1);
      } else if (this.current >= 0) this.apply(this.spot(this.current));
    }, { passive: true, ...sig });
  }

  /** Branche le halo WebGL (l'Explorer l'appelle quand les points sont prêts). */
  setHalo(fn: ((x: number, y: number, scale: number) => void) | null): void {
    this.halo?.(0, 0, 1);
    this.halo = fn;
    this.snapHalo(1);
    if (fn && this.ring) this.ring.hidden = true;
  }

  private tOf(i: number): number {
    const n = PROJETS.length;
    return n > 1 ? i / (n - 1) : 1;
  }

  private setHaloAt(t: number, scale = 1): void {
    this.haloT = t;
    this.haloScale = scale;
    const p = nucleusAt(t);
    const home = nucleusAt(1);
    this.halo?.(p.x - home.x, p.y - home.y, scale);
  }

  private snapHalo(t: number): void {
    cancelAnimationFrame(this.haloRaf);
    this.haloRaf = 0;
    this.setHaloAt(t);
  }

  /** Le halo glisse sur la courbe (pas en ligne droite) : plus long s'il traverse plusieurs années. */
  /** Retourne la durée du trajet (ms), 0 si le halo saute ou ne bouge pas. */
  private glideHalo(to: number): number {
    if (!this.halo) return 0;
    cancelAnimationFrame(this.haloRaf);
    const from = this.haloT;
    if (Math.abs(to - from) < 1e-4 || prefersReducedMotion()) {
      this.snapHalo(to);
      return 0;
    }
    const steps = Math.abs(to - from) * Math.max(1, PROJETS.length - 1);
    const ms = Math.min(900, 280 + steps * 150);
    const start = performance.now();
    // Trajet interrompu (on change de noyau en route) : on repart de la taille actuelle, sans saut.
    const startShrink = (1 - this.haloScale) / 0.55;
    const tick = (now: number): void => {
      const k = Math.min(1, (now - start) / ms);
      // easeInOutSine : départ et arrivée doux, sans à-coup.
      const e = -(Math.cos(Math.PI * k) - 1) / 2;
      // Il rapetisse en voyageant (≈ 45 % au plus petit, en début de trajet) et regrossit en
      // approchant du noyau : sin² décalé, à pleine taille pile à l'arrivée.
      const shrink = Math.max(Math.pow(Math.sin(Math.PI * Math.pow(k, 0.75)), 2), startShrink * (1 - k) * (1 - k));
      this.setHaloAt(from + (to - from) * e, 1 - 0.55 * shrink);
      this.haloRaf = k < 1 ? requestAnimationFrame(tick) : 0;
    };
    this.haloRaf = requestAnimationFrame(tick);
    return ms;
  }

  private isActive(): boolean {
    return Math.abs(this.f() - PROJETS_INDEX) < 0.25;
  }

  private get desktop(): boolean {
    return window.matchMedia('(min-width: 900px)').matches;
  }

  private hasPage(i: number): boolean {
    const url = PROJETS[i]?.url;
    return !!url && url !== '#';
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
    if (!this.hasPage(i)) return false;
    const url = PROJETS[i]!.url;
    if (url.startsWith('/')) void navigate(url);
    else window.location.assign(url);
    return true;
  }

  private closeSoon(ms = 160): void {
    if (this.closeTimer) return;
    this.closeTimer = window.setTimeout(() => {
      this.closeTimer = 0;
      if (!this.pinned) this.close();
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
      if (!this.pinned) this.open(i, false);
    }, 70);
  }

  private cancelSwitch(): void {
    window.clearTimeout(this.switchTimer);
    this.switchTimer = 0;
    this.switchTo = -1;
  }

  /* --------------------------------------------------------------- */

  private fill(i: number): void {
    const p = PROJETS[i]!;
    const card = this.card!;
    const set = (sel: string, v: string): void => {
      const el = card.querySelector(sel);
      if (el) el.textContent = v;
    };
    set('[data-card-meta]', `${p.year} · ${p.type}`);
    set('[data-card-name]', p.name);
    set('[data-card-summary]', p.summary);
    set('[data-card-tech]', p.tech);
    set('[data-card-hint]', this.hasPage(i) ? 'Cliquez sur le point pour ouvrir le projet' : 'Étude de cas à venir');
    const link = card.querySelector<HTMLAnchorElement>('[data-card-link]');
    if (link) link.href = p.url;
    card.classList.toggle('is-placeholder', !this.hasPage(i));
    const thumb = card.querySelector<HTMLImageElement>('[data-card-thumb]');
    const placeholder = card.querySelector<HTMLElement>('[data-card-placeholder]');
    if (thumb) {
      if (p.thumb) thumb.src = p.thumb;
      else thumb.removeAttribute('src');
      thumb.hidden = !p.thumb;
    }
    if (placeholder) placeholder.hidden = !!p.thumb;
  }

  /**
   * Ouvre la fiche du noyau i. Fiche déjà ouverte : elle se replie, le halo voyage, puis la
   * nouvelle fiche refait son arrivée complète quand le halo approche du noyau (on le voit
   * bouger, et l'arrivée n'est pas perdue).
   */
  open(i: number, pin: boolean, returnFocus?: HTMLElement): void {
    if (!PROJETS[i] || !this.card) return;
    const wasOpen = this.current >= 0 && !this.card.hidden;
    window.clearTimeout(this.hideTimer);
    window.clearTimeout(this.showTimer);
    const token = ++this.openToken;
    this.pinned = pin;
    this.current = i;
    const glide = this.glideHalo(this.tOf(i));
    if (wasOpen && !prefersReducedMotion()) this.foldOut();
    // La fiche s'ouvre vers 55 % du trajet du halo (son dépliage dure ~200 ms de plus avant de
    // se voir) ; après un repli, on laisse celui-ci finir.
    const wait = Math.max(wasOpen ? 220 : 0, glide * 0.55 - 200);
    const show = (): void => {
      if (token !== this.openToken || this.current !== i || !this.card) return;
      this.ring?.getAnimations().forEach((a) => a.cancel());
      this.leader.getAnimations().forEach((a) => a.cancel());
      this.card.classList.toggle('is-preview', this.fine.matches && !this.pinned);
      this.fill(i);
      this.card.hidden = false;
      const s = this.spot(i);
      this.apply(s);
      this.animateIn(s);
    };
    if (wait > 0 && !prefersReducedMotion()) this.showTimer = window.setTimeout(show, wait);
    else show();
    if (returnFocus) {
      this.card.querySelector<HTMLElement>('[data-card-close]')?.focus();
      this.returnTo = returnFocus;
    }
  }

  /** Position du noyau et de la fiche. Bureau : à droite du noyau (à gauche si elle déborde). */
  private spot(i: number): Spot {
    const n = this.nuclei[i]!;
    const s = fitStage(this.stage);
    const k = s.w / STAGE_W;
    const x = s.x + n.x * k;
    const y = s.y + n.y * k;
    const r = (this.halo ? n.r * HALO_K : Math.max(14, n.r * 3.4)) * k;
    const w = this.card!.offsetWidth;
    const h = this.card!.offsetHeight;
    const right = !(x + GAP + w > window.innerWidth - 16);
    const left = right ? x + GAP : x - GAP - w;
    const top = Math.min(Math.max(112, y - h * 0.3), window.innerHeight - h - 24);
    return { x, y, r, left, top, right };
  }

  private apply(s: Spot): void {
    if (this.ring && !this.halo) {
      // En px par rapport à la boîte de la scène (la zone sticky n'a pas forcément les
      // proportions 720 × 708 ; le dessin y est inscrit, cf. fitStage()).
      const box = this.stage.getBoundingClientRect();
      this.ring.style.cssText = `--x:${(s.x - box.left).toFixed(1)}px;--y:${(s.y - box.top).toFixed(1)}px;--r:${s.r.toFixed(1)}px`;
      this.ring.hidden = false;
    }
    if (!this.desktop) {
      // Mobile : panneau bas (CSS), pas de fil.
      this.card!.style.left = '';
      this.card!.style.top = '';
      this.leader.hidden = true;
      return;
    }
    this.card!.style.left = `${Math.round(s.left)}px`;
    this.card!.style.top = `${Math.round(s.top)}px`;
    // Fil : du bord de l'anneau au bord de la fiche, à la hauteur du noyau.
    const x0 = s.right ? s.x + s.r : s.left + this.card!.offsetWidth;
    const x1 = s.right ? s.left : s.x - s.r;
    this.leader.style.cssText = `left:${x0.toFixed(1)}px;top:${s.y.toFixed(1)}px;width:${Math.max(0, x1 - x0).toFixed(1)}px;transform-origin:${s.right ? 'left' : 'right'} center`;
    this.leader.classList.toggle('is-left', !s.right);
    this.leader.hidden = false;
  }

  private parts(): HTMLElement[] {
    return Array.from(this.card!.querySelectorAll<HTMLElement>('.project-card__body > *'));
  }

  private animateIn(s: Spot): void {
    const card = this.card!;
    if (prefersReducedMotion()) return;
    card.getAnimations({ subtree: true }).forEach((a) => a.cancel());
    const img = card.querySelector<HTMLElement>('.project-card__media > :not([hidden])');

    if (this.ring && !this.halo) {
      this.ring.animate([{ scale: 0 }, { scale: 1 }], { duration: 420, easing: OVERSHOOT });
    }
    if (!this.desktop) {
      // Mobile : le panneau monte du bas, son contenu suit.
      card.animate([{ translate: '0 100%' }, { translate: '0 0' }], { duration: 520, easing: EXPO });
      this.stagger(this.parts(), 140);
      return;
    }
    this.leader.animate([{ scale: '0 1' }, { scale: '1 1' }], { duration: 220, easing: 'cubic-bezier(0.5, 0, 0.2, 1)', delay: 60, fill: 'backwards' });
    // Point d'ancrage : le bout du fil (bord de la fiche, hauteur du noyau).
    const oy = Math.min(Math.max(s.y - s.top, 0), card.offsetHeight);
    card.style.transformOrigin = `${s.right ? '0%' : '100%'} ${oy.toFixed(0)}px`;
    const side = s.right ? 1 : -1;
    const fromClip = s.right
      ? `inset(${oy}px 100% calc(100% - ${oy}px) 0)`
      : `inset(${oy}px 0 calc(100% - ${oy}px) 100%)`;
    card.animate(
      [
        { opacity: 0, clipPath: fromClip, transform: `perspective(900px) rotateY(${-38 * side}deg) scale(0.6)`, boxShadow: '0 0 0 var(--hl)' },
        { opacity: 1, clipPath: 'inset(0 0 0 0)', transform: 'perspective(900px) rotateY(0deg) scale(1)', boxShadow: '0 0 0 var(--hl)', offset: 0.7 },
        { opacity: 1, clipPath: 'inset(0 0 0 0)', transform: 'none', boxShadow: '8px 8px 0 var(--hl)' },
      ],
      { duration: 720, easing: EXPO, delay: 200, fill: 'backwards' },
    );
    img?.animate([{ scale: 1.35, filter: 'blur(6px)' }, { scale: 1, filter: 'blur(0)' }], { duration: 1000, easing: EXPO, delay: 260, fill: 'backwards' });
    this.stagger(this.parts(), 380);
  }

  private stagger(els: HTMLElement[], delay: number, amount = 1): void {
    els.forEach((el, k) =>
      el.animate(
        [{ opacity: 0, transform: `translateY(${14 * amount}px)` }, { opacity: 1, transform: 'none' }],
        { duration: 560, easing: EXPO, delay: delay + k * 45, fill: 'backwards' },
      ),
    );
  }

  close(): void {
    this.cancelClose();
    this.cancelSwitch();
    const card = this.card;
    const wasOpen = this.current >= 0 && card && !card.hidden;
    this.current = -1;
    window.clearTimeout(this.showTimer);
    this.openToken++;
    // Le halo revient sur le projet le plus récent.
    this.glideHalo(1);
    this.pinned = false;
    if (this.returnTo) {
      this.returnTo.focus();
      this.returnTo = null;
    }
    if (!card || !wasOpen) return;
    const finish = (): void => {
      card.hidden = true;
      if (this.ring) this.ring.hidden = true;
      this.leader.hidden = true;
    };
    if (prefersReducedMotion()) return finish();
    this.foldOut();
    window.clearTimeout(this.hideTimer);
    this.hideTimer = window.setTimeout(() => {
      finish();
      card.getAnimations({ subtree: true }).forEach((a) => a.cancel());
      this.leader.getAnimations().forEach((a) => a.cancel());
      this.ring?.getAnimations().forEach((a) => a.cancel());
    }, 210);
  }

  /** Sortie rapide : la fiche se replie vers le noyau, le fil se rétracte (état final figé). */
  private foldOut(): void {
    const card = this.card!;
    card.getAnimations({ subtree: true }).forEach((a) => a.cancel());
    const out = this.desktop
      ? [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'perspective(900px) scale(0.85)' }]
      : [{ translate: '0 0' }, { translate: '0 100%' }];
    card.animate(out, { duration: 200, easing: 'cubic-bezier(0.5, 0, 0.75, 0)', fill: 'forwards' });
    this.leader.animate([{ scale: '1 1' }, { scale: '0 1' }], { duration: 160, easing: 'ease-in', fill: 'forwards' });
    if (this.ring && !this.halo) this.ring.animate([{ scale: 1 }, { scale: 0 }], { duration: 200, easing: 'ease-in', fill: 'forwards' });
  }

  destroy(): void {
    window.clearTimeout(this.hideTimer);
    window.clearTimeout(this.showTimer);
    cancelAnimationFrame(this.haloRaf);
    this.halo?.(0, 0, 1);
    this.halo = null;
    this.close();
    if (this.card) this.card.hidden = true;
    this.leader.remove();
    this.abort.abort();
  }
}
