/**
 * Statut dynamique « En train de… » côté client.
 *
 * - Lit /api/status (aucun secret ici : tout est calculé côté serveur) et rafraîchit
 *   discrètement toutes les 5 min tant que la page est visible.
 * - Changement de statut : fondu enchaîné entre l'ancien et le nouveau texte (empilés dans
 *   la même cellule de grille, donc sans saut de mise en page).
 * - Texte de survol : révélé au survol, au focus clavier et au toucher (bouton bascule),
 *   relié par aria-describedby ; Échap le masque (WCAG 1.4.13).
 * - Chargement ou erreur : textes du statut Défaut (déjà présents dans le HTML).
 */

interface StatusPayload {
  status: string;
  visibleText: string;
  hoverText: string;
  updatedAt: string;
}

const REFRESH_MS = 5 * 60_000;
const FETCH_TIMEOUT_MS = 8000;
const SWAP_MS = 700;

const isPayload = (v: unknown): v is StatusPayload => {
  const o = v as Partial<StatusPayload> | null;
  return !!o && typeof o.visibleText === 'string' && o.visibleText.length > 0 && typeof o.hoverText === 'string';
};

export class StatusLabel {
  private readonly abort = new AbortController();
  private readonly trigger: HTMLButtonElement;
  private readonly visible: HTMLElement;
  private readonly hover: HTMLElement;
  private readonly defaults: { visible: string; hover: string };
  private timer = 0;
  private lastFetch = 0;
  private inflight: AbortController | null = null;

  constructor(private readonly root: HTMLElement) {
    this.trigger = root.querySelector<HTMLButtonElement>('[data-status-trigger]')!;
    this.visible = root.querySelector<HTMLElement>('[data-status-visible]')!;
    this.hover = root.querySelector<HTMLElement>('[data-status-hover]')!;
    this.defaults = {
      visible: root.dataset.defaultVisible ?? this.visible.textContent ?? '',
      hover: root.dataset.defaultHover ?? this.hover.textContent ?? '',
    };

    const sig = { signal: this.abort.signal };
    // Toucher / clic : bascule l'ouverture (le survol et le focus clavier sont gérés en CSS).
    this.trigger.addEventListener('click', () => this.setOpen(!root.classList.contains('is-open')), sig);
    root.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.setOpen(false);
        root.classList.add('is-dismissed');
      }
    }, sig);
    const undismiss = (): void => root.classList.remove('is-dismissed');
    root.addEventListener('pointerleave', undismiss, sig);
    this.trigger.addEventListener('blur', undismiss, sig);
    document.addEventListener('pointerdown', (e) => {
      if (!root.contains(e.target as Node)) this.setOpen(false);
    }, sig);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.stop();
      else this.start();
    }, sig);

    this.start();
  }

  private setOpen(open: boolean): void {
    this.root.classList.toggle('is-open', open);
    this.root.classList.remove('is-dismissed');
  }

  private start(): void {
    this.stop();
    const due = Math.max(0, this.lastFetch + REFRESH_MS - Date.now());
    const tick = (): void => {
      void this.refresh();
      this.timer = window.setTimeout(tick, REFRESH_MS);
    };
    this.timer = window.setTimeout(tick, this.lastFetch ? due : 0);
  }

  private stop(): void {
    window.clearTimeout(this.timer);
    this.timer = 0;
  }

  private async refresh(): Promise<void> {
    this.inflight?.abort();
    const ctrl = new AbortController();
    this.inflight = ctrl;
    const t = window.setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch('/api/status', { headers: { Accept: 'application/json' }, signal: ctrl.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: unknown = await res.json();
      if (!isPayload(data)) throw new Error('réponse invalide');
      this.lastFetch = Date.now();
      this.apply(data.visibleText, data.hoverText || this.defaults.hover, data.status);
    } catch {
      if (this.abort.signal.aborted) return;
      this.lastFetch = Date.now();
      this.apply(this.defaults.visible, this.defaults.hover, 'defaut');
    } finally {
      window.clearTimeout(t);
      if (this.inflight === ctrl) this.inflight = null;
    }
  }

  private apply(visibleText: string, hoverText: string, status: string): void {
    this.root.dataset.status = status;
    if (this.hover.textContent !== hoverText) this.hover.textContent = hoverText;

    const current = this.visible.querySelector<HTMLElement>('.status__text:not(.is-leaving)');
    if (current?.textContent === visibleText) return;

    const next = document.createElement('span');
    next.className = 'status__text is-entering';
    next.textContent = visibleText;
    this.visible.append(next);
    // Deux images : laisser le navigateur peindre l'état de départ avant la transition.
    requestAnimationFrame(() => requestAnimationFrame(() => next.classList.remove('is-entering')));
    if (current) {
      current.classList.add('is-leaving');
      current.setAttribute('aria-hidden', 'true');
      window.setTimeout(() => current.remove(), SWAP_MS);
    }
  }

  destroy(): void {
    this.stop();
    this.inflight?.abort();
    this.abort.abort();
  }
}
