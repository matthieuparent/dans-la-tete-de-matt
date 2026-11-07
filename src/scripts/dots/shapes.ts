/**
 * Formes de points — module isomorphe (build Node + navigateur, aucune dépendance DOM).
 *
 * Portage des formules des maquettes (`Sections.dc.html` : intro(), projets(), enseignement(),
 * jeu(), ia(), famille()). Repère : l'espace « scène » de la maquette, 720 × 708 px,
 * origine en haut à gauche, y vers le bas. z en px (même échelle), positif vers le spectateur.
 *
 * Chaque générateur reçoit une densité `d` (≈ 1 = densité de la maquette) qui module les
 * remplissages aléatoires et le pas des contours, pour tenir le budget de points
 * (6 000 bureau, 1 500 mobile, 700 appareils modestes) sans trouer les silhouettes.
 */
import type { ShapeId } from '../../data/sections';
import { PROJETS } from '../../data/projets';

export const STAGE_W = 720;
export const STAGE_H = 708;
export const PIVOT_X = 360;
export const PIVOT_Y = 354;
/** Rayon de référence du cerveau (px scène) : sert aussi à normaliser la profondeur. */
export const DEPTH_SCALE = 270;

/** Attributs par point : x, y, z, rayon (px scène), opacité, accent (0 encre, 1 surligneur). */
export const STRIDE = 6;

export interface ShapeLabel {
  readonly x: number;
  readonly y: number;
  readonly text: string;
  readonly anchor: 'start' | 'middle';
}

export interface Nucleus {
  readonly x: number;
  readonly y: number;
  readonly r: number;
  readonly index: number;
}

export interface RawShape {
  readonly id: ShapeId | 'lines';
  /** Points indispensables (centres, halos, contours) : jamais retirés au sous-échantillonnage. */
  readonly key: number[];
  /** Points de remplissage : sous-échantillonnables. */
  readonly fill: number[];
  /** Rotation au repos [pitch, yaw] en radians (n'affecte pas les points d'accent). */
  readonly rot: readonly [number, number];
  /** Vitesse de rotation lente (rad/s) au repos. */
  readonly spin: number;
  /** Amplitude de dérive (px scène) au repos. */
  readonly drift: number;
  readonly labels: readonly ShapeLabel[];
  readonly nuclei: readonly Nucleus[];
  /** Ligne de rappel (intro : du halo vers l'étiquette). */
  readonly leader?: readonly [number, number, number, number];
}

export interface PackedShape {
  readonly id: RawShape['id'];
  readonly count: number;
  /** x, y, z par point. */
  readonly pos: Float32Array;
  /** rayon, opacité, accent par point. */
  readonly meta: Float32Array;
  readonly rot: readonly [number, number];
  readonly spin: number;
  readonly drift: number;
}

/* ------------------------------------------------------------------ */
/* Hasard déterministe (Park–Miller, identique aux maquettes)          */
/* ------------------------------------------------------------------ */

export interface Rng {
  (): number;
  /** Gaussienne centrée réduite (Box–Muller). */
  g(): number;
}

export function rng(seed: number): Rng {
  let s = seed;
  const R = (() => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  }) as Rng;
  R.g = () => {
    const u = Math.max(1e-6, R());
    const v = R();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  return R;
}

/* ------------------------------------------------------------------ */
/* Constructeur                                                        */
/* ------------------------------------------------------------------ */

class ShapeBuilder {
  readonly key: number[] = [];
  readonly fill: number[] = [];
  readonly labels: ShapeLabel[] = [];
  readonly nuclei: Nucleus[] = [];
  /** Petite profondeur aléatoire (±0,05 × 270 px) pour que la rotation garde du volume. */
  private readonly zr: Rng;

  constructor(
    readonly d: number,
    seed: number,
  ) {
    this.zr = rng(seed + 1000);
  }

  private z(): number {
    return (this.zr() * 2 - 1) * 0.05 * DEPTH_SCALE;
  }

  /** Pas d'échantillonnage d'un contour : plus lâche à faible densité. */
  step(base: number): number {
    return base / Math.min(1.35, Math.max(0.55, Math.sqrt(this.d)));
  }

  /** Nombre de points de remplissage à densité courante. */
  n(base: number): number {
    return Math.max(1, Math.round(base * this.d));
  }

  dot(x: number, y: number, r: number, o: number, opts: { acc?: boolean; key?: boolean; z?: number } = {}): void {
    const target = opts.key ? this.key : this.fill;
    target.push(x, y, opts.z ?? this.z(), r, o, opts.acc ? 1 : 0);
  }

  line(x1: number, y1: number, x2: number, y2: number, step: number, r: number, o: number, opts: { acc?: boolean; key?: boolean } = {}): void {
    const L = Math.hypot(x2 - x1, y2 - y1);
    const n = Math.max(1, Math.round(L / step));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      this.dot(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, r, o, opts);
    }
  }

  ring(cx: number, cy: number, rad: number, step: number, r: number, o: number): void {
    const n = Math.max(6, Math.round((2 * Math.PI * rad) / step));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      this.dot(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad, r, o, { key: true });
    }
  }

  /**
   * Halo surligneur : un seul gros point d'accent (disque parfait, comme la maquette).
   * Les halos occupent les premiers indices de chaque forme (cf. packShape) : d'une section
   * à l'autre, un halo glisse vers le halo suivant au lieu de se dissoudre.
   */
  halo(cx: number, cy: number, R: number): void {
    this.dot(cx, cy, R, 0.9, { acc: true, key: true, z: 0 });
  }

  label(x: number, y: number, text: string, anchor: ShapeLabel['anchor'] = 'middle'): void {
    this.labels.push({ x, y, text, anchor });
  }

  build(id: RawShape['id'], extra: Partial<Pick<RawShape, 'rot' | 'spin' | 'drift' | 'leader'>> = {}): RawShape {
    return {
      id,
      key: this.key,
      fill: this.fill,
      labels: this.labels,
      nuclei: this.nuclei,
      rot: extra.rot ?? [0, 0],
      spin: extra.spin ?? 0,
      drift: extra.drift ?? 0,
      ...(extra.leader ? { leader: extra.leader } : {}),
    };
  }
}

/* ------------------------------------------------------------------ */
/* Générateurs                                                         */
/* ------------------------------------------------------------------ */

/**
 * 00 · Cerveau. Sphère déformée (replis = produit de sinus), cervelet (2e ellipsoïde)
 * et tronc (cylindre incliné). Points stockés NON tournés : la rotation [0,22 ; −0,6]
 * est appliquée dans le shader (et dans le rendu SVG), pour pouvoir la faire varier.
 * Rayon/opacité de base = valeur à profondeur moyenne ; la profondeur les module ensuite
 * (gros et opaques devant, fins et pâles derrière) comme dans la maquette.
 */
function intro(d: number): RawShape {
  const b = new ShapeBuilder(d, 7);
  const R = rng(7);
  const n = b.n(1700);
  for (let i = 0; i < n; i++) {
    let x: number;
    let y: number;
    let z: number;
    const part = R();
    if (part < 0.86) {
      // Tirage uniforme sur la sphère : v = acos(2r − 1) évite l'entassement aux pôles.
      const u = R() * Math.PI * 2;
      const v = Math.acos(2 * R() - 1);
      const f = 1 + 0.045 * Math.sin(11 * u + 7 * v) * Math.sin(9 * v - 5 * u) + 0.02 * Math.sin(23 * u);
      x = Math.sin(v) * Math.cos(u) * f;
      y = 0.74 * Math.cos(v) * f;
      z = 0.68 * Math.sin(v) * Math.sin(u) * f;
      if (y < -0.3) y = -0.3 + (y + 0.3) * 0.45; // base aplatie
      if (x > -0.1 && x < 0.7 && y < 0) y -= 0.12 * Math.sin(((x + 0.1) / 0.8) * Math.PI); // lobe temporal
      if (Math.abs(z) < 0.06 && y > 0.2) {
        z += z < 0 ? -0.06 : 0.06; // scissure inter-hémisphérique
        y -= 0.05;
      }
    } else if (part < 0.97) {
      const u = R() * Math.PI * 2;
      const v = Math.acos(2 * R() - 1);
      x = -0.62 + 0.32 * Math.sin(v) * Math.cos(u);
      y = -0.42 + 0.2 * Math.cos(v);
      z = 0.5 * Math.sin(v) * Math.sin(u);
      y += 0.015 * Math.sin(60 * y); // lamelles du cervelet
    } else {
      const t = R();
      const a = R() * Math.PI * 2;
      x = -0.25 + 0.09 * Math.cos(a) - t * 0.12;
      y = -0.35 - t * 0.5;
      z = 0.09 * Math.sin(a);
    }
    // Repère maquette : y vers le haut → on retourne pour l'espace scène.
    b.dot(PIVOT_X + x * DEPTH_SCALE, PIVOT_Y - 4 - y * DEPTH_SCALE, 1.25, 0.6, { z: z * DEPTH_SCALE });
  }
  b.halo(470, 230, 78);
  b.label(556, 112, 'Prochaine pensée : Projets', 'start');
  return b.build('intro', { rot: [0.22, -0.6], spin: 0.09, leader: [470, 230, 570, 122] });
}

/** Taille commune des noyaux (px scène) : centre ≈ 4,4 px de rayon, nuage ≈ 14 px. */
const NUCLEUS_SIZE = 8;

/** Position d'un noyau sur la ligne de temps (t ∈ [0,1]). */
function nucleusAt(t: number): { x: number; y: number } {
  return { x: 80 + t * 560, y: 540 - t * 360 + 60 * Math.sin(t * 7) };
}

/** 01 · Projets : un noyau par projet (taille = envergure, ordre = année), reliés par une ligne de temps. */
function projets(d: number): RawShape {
  const b = new ShapeBuilder(d, 21);
  const R = rng(21);
  const N = PROJETS.length;
  const nodes = PROJETS.map((p, i) => {
    const { x, y } = nucleusAt(N > 1 ? i / (N - 1) : 0.5);
    // Tous les noyaux ont la même taille (retour client) : seule la position (l'année) varie.
    return { x, y, s: NUCLEUS_SIZE, featured: !!p.featured, year: p.year };
  });

  const featured = nodes.find((n) => n.featured);
  if (featured) b.halo(featured.x, featured.y, featured.s * 3.4);

  for (let i = 0, n = b.n(260); i < n; i++) b.dot(20 + R() * 680, 40 + R() * 640, 0.7, 0.1 + R() * 0.2);

  for (let i = 0; i < N - 1; i++) {
    const a = nodes[i]!;
    const c = nodes[i + 1]!;
    b.line(a.x, a.y, c.x, c.y, b.step(7), 0.7, 0.3, { key: true });
  }

  nodes.forEach((nd, i) => {
    // Nuage gaussien autour du centre : |N(0,1)| × 1,7 × taille.
    for (let k = 0, n = b.n(48); k < n; k++) {
      const a = R() * Math.PI * 2;
      const rr = Math.abs(R.g()) * nd.s * 1.7;
      b.dot(nd.x + Math.cos(a) * rr, nd.y + Math.sin(a) * rr, 0.7 + R() * 0.9, 0.3 + R() * 0.55);
    }
    // Quatre petits arcs d'orbite.
    for (let k = 0; k < 4; k++) {
      const a = R() * Math.PI * 2;
      const rr = nd.s * (2.4 + R() * 1.6);
      for (let j = 0; j <= 4; j++) {
        const t = a - (0.45 * j) / 4;
        b.dot(nd.x + Math.cos(t) * rr, nd.y + Math.sin(t) * rr, 0.75, 0.4, { key: true });
      }
    }
    b.dot(nd.x, nd.y, nd.s * 0.55, 1, { key: true });
    b.nuclei.push({ x: nd.x, y: nd.y, r: nd.s, index: i });
    if (i % 5 === 0) b.label(nd.x, nd.y + nd.s * 3 + 16, nd.year);
  });
  return b.build('projets', { drift: 4 });
}

/** 02 · Enseignement : tableau (cadre, lignes « à la craie », schéma) + 3 rangées de pupitres. */
function enseignement(d: number): RawShape {
  const b = new ShapeBuilder(d, 5);
  const R = rng(5);
  const x0 = 70;
  const y0 = 110;
  const x1 = 650;
  const y1 = 450;
  const st = b.step(5);
  b.halo(520, 270, 74);
  b.line(x0, y0, x1, y0, st, 1.3, 0.9, { key: true });
  b.line(x0, y1, x1, y1, st, 1.3, 0.9, { key: true });
  b.line(x0, y0, x0, y1, st, 1.3, 0.9, { key: true });
  b.line(x1, y0, x1, y1, st, 1.3, 0.9, { key: true });
  b.line(x0 - 14, y1 + 14, x1 + 14, y1 + 14, b.step(4), 1, 0.6, { key: true }); // rebord à craie

  // Lignes « à la craie » : mots de longueur aléatoire.
  const rows: Array<[number, number]> = [[160, 300], [196, 220], [232, 260], [290, 180], [326, 230], [362, 150]];
  for (const [yy, len] of rows) {
    let x = 110;
    while (x < 110 + len) {
      const word = 18 + R() * 46;
      for (let k = 0; k < word && x < 110 + len; k += st, x += st) b.dot(x, yy + (R() - 0.5) * 4, 1.1, 0.85);
      x += 12;
    }
  }
  // Schéma : un cercle, une flèche.
  b.ring(520, 270, 52, b.step(6), 1.3, 0.95);
  b.line(400, 390, 472, 324, b.step(6), 1.2, 0.9, { key: true });
  b.dot(462, 328, 1.2, 0.9, { key: true });
  b.dot(470, 338, 1.2, 0.9, { key: true });

  // Pupitres : 3 rangées en perspective (plus larges vers l'avant).
  for (let row = 0; row < 3; row++) {
    const yy = 540 + row * 52;
    const gap = 92 + row * 22;
    for (let j = 0; j < 5; j++) {
      const xx = 360 + (j - 2) * gap;
      for (let k = 0, n = b.n(26); k < n; k++) b.dot(xx + R.g() * 6, yy - 10 + R.g() * 6, 0.8 + R() * 0.8, 0.4 + R() * 0.5);
      b.line(xx - 18, yy + 8, xx + 18, yy + 8, b.step(4), 1, 0.7, { key: true });
    }
  }
  b.label(360, 96, '[Cours en vedette]');
  return b.build('enseignement');
}

/** 03 · Jeu : console portable (corps arrondi, écran vide, 2 joysticks, 4 boutons en losange). */
function jeu(d: number): RawShape {
  const b = new ShapeBuilder(d, 9);
  const R = rng(9);
  const x0 = 120;
  const x1 = 600;
  const y0 = 230;
  const y1 = 460;
  const rad = 70;
  const inBody = (x: number, y: number): boolean => {
    if (y < y0 || y > y1) return false;
    if (x >= x0 + rad && x <= x1 - rad) return true;
    const cx = x < x0 + rad ? x0 + rad : x1 - rad;
    const cy = y < y0 + rad ? y0 + rad : y > y1 - rad ? y1 - rad : y;
    return Math.hypot(x - cx, y - cy) <= rad;
  };
  const inScreen = (x: number, y: number): boolean => x > 214 && x < 506 && y > 248 && y < 442;
  b.halo(554, 300, 30);
  const target = b.n(1300);
  let placed = 0;
  let tries = 0;
  while (placed < target && tries < target * 16) {
    tries++;
    const x = x0 + R() * (x1 - x0);
    const y = y0 + R() * (y1 - y0);
    if (!inBody(x, y)) continue;
    placed++;
    if (inScreen(x, y)) {
      if (R() < 0.82) continue; // écran presque vide
      b.dot(x, y, 0.8, 0.25);
    } else b.dot(x, y, 0.8 + R() * 0.6, 0.4 + R() * 0.45);
  }
  b.ring(166, 300, 18, b.step(4), 1.2, 1);
  b.ring(554, 390, 18, b.step(4), 1.2, 1);
  for (const [x, y] of [[554, 284], [554, 316], [538, 300], [570, 300]] as const) b.dot(x, y, 4, 1, { key: true });
  return b.build('jeu');
}

/** 04 · IA : perceptron 5 couches (4-7-9-7-3), un chemin activé au surligneur. */
function ia(d: number): RawShape {
  const b = new ShapeBuilder(d, 13);
  const R = rng(13);
  const xs = [90, 230, 370, 510, 640];
  const counts = [4, 7, 9, 7, 3];
  const layers = xs.map((x, l) => {
    const n = counts[l]!;
    return Array.from({ length: n }, (_, k) => ({ x, y: 340 + (k - (n - 1) / 2) * 56 }));
  });
  const path = [1, 4, 5, 2, 1];
  // Connexions : pointillé très pâle (fill → sous-échantillonnable).
  for (let l = 0; l < layers.length - 1; l++)
    for (const a of layers[l]!)
      for (const c of layers[l + 1]!) b.line(a.x, a.y, c.x, c.y, b.step(13), 0.6, 0.2);
  for (let l = 0; l < path.length - 1; l++) {
    const a = layers[l]![path[l]!]!;
    const c = layers[l + 1]![path[l + 1]!]!;
    b.line(a.x, a.y, c.x, c.y, 3.2, 3.5, 1, { acc: true, key: true });
    b.line(a.x, a.y, c.x, c.y, b.step(4), 0.8, 1, { key: true });
  }
  layers.forEach((arr, l) =>
    arr.forEach((nd, k) => {
      const on = path[l] === k;
      if (on) b.halo(nd.x, nd.y, 18);
      for (let i = 0, n = b.n(16); i < n; i++) b.dot(nd.x + R.g() * 4.5, nd.y + R.g() * 4.5, 0.7 + R() * 0.8, 0.35 + R() * 0.5);
      b.dot(nd.x, nd.y, on ? 4.5 : 3, 1, { key: true });
    }),
  );
  b.label(90, 600, 'question');
  b.label(370, 640, 'couches cachées');
  b.label(640, 460, 'réponse');
  return b.build('ia');
}

/** 05 · Famille : cinq silhouettes (pas de visages), reliées main à main par un fil surligné. */
function famille(d: number): RawShape {
  const b = new ShapeBuilder(d, 17);
  const R = rng(17);
  const ground = 600;
  const segD = (px: number, py: number, ax: number, ay: number, bx: number, by: number): number => {
    const dx = bx - ax;
    const dy = by - ay;
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(px - ax - t * dx, py - ay - t * dy);
  };
  const people = [
    { cx: 100, h: 360, head: 0.072, hair: 0, t: 'papa' },
    { cx: 262, h: 330, head: 0.074, hair: 1.6, t: 'maman' },
    { cx: 412, h: 285, head: 0.08, hair: 0, t: '12 ans' },
    { cx: 542, h: 215, head: 0.095, hair: 1.4, t: '6 ans' },
    { cx: 650, h: 165, head: 0.11, hair: 0.9, t: '2 ans' },
  ];
  const hands: Array<{ l: [number, number]; r: [number, number] }> = [];
  for (const p of people) {
    const top = ground - p.h;
    const hr = p.h * p.head;
    const hy = top + hr;
    const sh = hy + hr + p.h * 0.03;
    const hip = sh + p.h * 0.32;
    const sw = p.h * 0.13;
    const limb = p.h * 0.034;
    const legGap = p.h * 0.045;
    const armL = [p.cx - sw, sh + limb, p.cx - sw - p.h * 0.05, hip + p.h * 0.04] as const;
    const armR = [p.cx + sw, sh + limb, p.cx + sw + p.h * 0.05, hip + p.h * 0.04] as const;
    const legL = [p.cx - legGap, hip, p.cx - legGap - p.h * 0.01, ground - limb] as const;
    const legR = [p.cx + legGap, hip, p.cx + legGap + p.h * 0.01, ground - limb] as const;
    hands.push({ l: [armL[2], armL[3]], r: [armR[2], armR[3]] });
    const inside = (x: number, y: number): boolean => {
      if (Math.hypot(x - p.cx, y - hy) < hr) return true;
      if (y > sh && y < hip) {
        const k = (y - sh) / (hip - sh);
        if (Math.abs(x - p.cx) < sw * (1 - 0.18 * k)) return true;
      }
      if (segD(x, y, ...armL) < limb || segD(x, y, ...armR) < limb) return true;
      if (segD(x, y, ...legL) < limb * 1.15 || segD(x, y, ...legR) < limb * 1.15) return true;
      if (p.hair > 0) {
        const dd = Math.hypot(x - p.cx, y - hy);
        if (dd >= hr && dd < hr * 1.2 && y < hy + hr * 0.3) return true;
        if (y >= hy && y < hy + hr * p.hair && Math.abs(x - p.cx) > hr * 0.8 && Math.abs(x - p.cx) < hr * 1.2) return true;
      }
      return false;
    };
    const bx0 = p.cx - p.h * 0.25;
    const bw = p.h * 0.5;
    const n = b.n(p.h * 1.7);
    let placed = 0;
    let tries = 0;
    while (placed < n && tries < n * 16) {
      tries++;
      const x = bx0 + R() * bw;
      const y = top - 4 + R() * (p.h + 4);
      if (!inside(x, y)) continue;
      placed++;
      b.dot(x, y, 1.05, 0.55 + R() * 0.3);
    }
    b.label(p.cx, ground + 30, p.t);
  }
  // Le fil : courbe de Bézier quadratique entre la main droite de l'un et la gauche du suivant.
  for (let i = 0; i < hands.length - 1; i++) {
    const a = hands[i]!.r;
    const c = hands[i + 1]!.l;
    const mx = (a[0] + c[0]) / 2;
    const my = Math.max(a[1], c[1]) + 18;
    for (let k = 0; k <= 20; k++) {
      const t = k / 20;
      const x = (1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * mx + t * t * c[0];
      const y = (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * my + t * t * c[1];
      b.dot(x, y, 1.7, 1, { acc: true, key: true, z: 0 });
    }
  }
  b.line(30, ground + 6, 690, ground + 6, b.step(6), 0.8, 0.35, { key: true });
  return b.build('famille');
}

/** 06 · Carnet : les points s'alignent en lignes de texte (un titre, puis des paragraphes). */
function carnet(d: number): RawShape {
  const b = new ShapeBuilder(d, 31);
  const R = rng(31);
  const st = b.step(4.2);
  const lineOf = (x: number, y: number, len: number, r: number, o: number, thick = 1): void => {
    let cx = x;
    while (cx < x + len) {
      const word = 14 + R() * 52;
      for (let k = 0; k < word && cx < x + len; k += st, cx += st)
        for (let t = 0; t < thick; t++) b.dot(cx, y + t * st * 0.9 + (R() - 0.5) * 1.5, r, o, { key: thick > 1 });
      cx += 11;
    }
  };
  b.halo(118, 132, 22);
  lineOf(100, 120, 380, 1.6, 1, 3);
  lineOf(100, 160, 260, 1.6, 1, 3);
  const widths = [520, 500, 540, 380, 0, 520, 510, 470, 300, 0, 530, 490, 260];
  let y = 236;
  for (const w of widths) {
    if (w > 0) lineOf(100, y, w, 1.05, 0.8);
    y += w > 0 ? 30 : 22;
  }
  return b.build('carnet');
}

const GENERATORS: Record<ShapeId, (d: number) => RawShape> = { intro, projets, enseignement, jeu, ia, famille, carnet };

export function buildShape(id: ShapeId, density: number): RawShape {
  return GENERATORS[id](density);
}

/* ------------------------------------------------------------------ */
/* Empaquetage pour le GPU                                             */
/* ------------------------------------------------------------------ */

/** Poussière : position stable par indice, pour que les points inutilisés ne volent pas d'une forme à l'autre. */
function hash01(n: number): number {
  // Hachage entier (type « lowbias32 ») : des graines consécutives donnent des valeurs décorrélées
  // (un Park–Miller amorcé par i produirait des alignements visibles).
  let x = (n | 0) ^ 0x9e3779b9;
  x = Math.imul(x ^ (x >>> 16), 0x21f0aaad);
  x = Math.imul(x ^ (x >>> 15), 0x735a2d97);
  x ^= x >>> 15;
  return (x >>> 0) / 4294967296;
}
function dustAt(i: number, out: Float32Array, o: number): void {
  out[o] = -20 + hash01(i * 3 + 1) * (STAGE_W + 40);
  out[o + 1] = -10 + hash01(i * 3 + 2) * (STAGE_H + 20);
  out[o + 2] = (hash01(i * 3 + 3) * 2 - 1) * 20;
}

/**
 * Ramène une forme à exactement `count` points :
 * - trop de points → on garde tous les `key`, on sous-échantillonne `fill` au hasard ;
 * - pas assez → les indices restants deviennent une poussière très pâle.
 * Les points retenus sont mélangés (Fisher–Yates déterministe) : la correspondance
 * indice → indice entre deux formes est donc aléatoire et uniforme, ce qui donne
 * la nébuleuse organique au milieu d'une transformation.
 */
export function packShape(raw: RawShape, count: number): PackedShape {
  const R = rng(raw.id.length * 977 + 13);
  const keyN = raw.key.length / STRIDE;
  const fillN = raw.fill.length / STRIDE;
  const room = Math.max(0, count - keyN);
  const fillIdx = Array.from({ length: fillN }, (_, i) => i);
  for (let i = fillN - 1; i > 0; i--) {
    const j = Math.floor(R() * (i + 1));
    [fillIdx[i], fillIdx[j]] = [fillIdx[j]!, fillIdx[i]!];
  }
  const chosen: Array<[number[], number]> = [];
  for (let i = 0; i < Math.min(keyN, count); i++) chosen.push([raw.key, i]);
  for (let i = 0; i < Math.min(room, fillN); i++) chosen.push([raw.fill, fillIdx[i]!]);
  for (let i = chosen.length - 1; i > 0; i--) {
    const j = Math.floor(R() * (i + 1));
    [chosen[i], chosen[j]] = [chosen[j]!, chosen[i]!];
  }
  // Points d'accent en tête, du plus gros au plus petit : halo ↔ halo d'une forme à l'autre.
  const isAcc = ([src, k]: [number[], number]): boolean => src[k * STRIDE + 5] === 1;
  const radius = ([src, k]: [number[], number]): number => src[k * STRIDE + 3]!;
  chosen.sort((a, b) => (isAcc(a) === isAcc(b) ? (isAcc(a) ? radius(b) - radius(a) : 0) : isAcc(a) ? -1 : 1));

  const pos = new Float32Array(count * 3);
  const meta = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const c = chosen[i];
    if (c) {
      const [src, k] = c;
      const s = k * STRIDE;
      pos[i * 3] = src[s]!;
      pos[i * 3 + 1] = src[s + 1]!;
      pos[i * 3 + 2] = src[s + 2]!;
      meta[i * 3] = src[s + 3]!;
      meta[i * 3 + 1] = src[s + 4]!;
      meta[i * 3 + 2] = src[s + 5]!;
    } else {
      dustAt(i, pos, i * 3);
      meta[i * 3] = 0.7;
      meta[i * 3 + 1] = 0.07;
      meta[i * 3 + 2] = 0;
    }
  }
  return { id: raw.id, count, pos, meta, rot: raw.rot, spin: raw.spin, drift: raw.drift };
}

/**
 * « Les points partent dans tous les sens » (bascule Explorer ↔ Lire) : chaque point est
 * projeté loin du centre de la scène, dans sa propre direction (radiale + aléa de ±40°),
 * à 1,4–3 largeurs de scène, donc hors de l'écran ; les halos redeviennent de simples points.
 * Utilisé dans les deux sens : explosion à l'aller, convergence au retour.
 */
export function scatterShape(s: PackedShape, seed = 77): PackedShape {
  const R = rng(seed);
  const pos = new Float32Array(s.pos.length);
  const meta = new Float32Array(s.meta);
  for (let i = 0; i < s.count; i++) {
    const o = i * 3;
    const dx = s.pos[o]! - PIVOT_X;
    const dy = s.pos[o + 1]! - PIVOT_Y;
    const a = (Math.hypot(dx, dy) < 8 ? R() * Math.PI * 2 : Math.atan2(dy, dx)) + (R() - 0.5) * 1.4;
    const dist = STAGE_W * (0.7 + R() * 0.8) + Math.hypot(dx, dy);
    pos[o] = PIVOT_X + Math.cos(a) * dist;
    pos[o + 1] = PIVOT_Y + Math.sin(a) * dist;
    pos[o + 2] = (R() * 2 - 1) * DEPTH_SCALE * 0.8;
    meta[o] = Math.min(meta[o]!, 1.6) * 0.8;
    meta[o + 2] = 0;
  }
  return { id: 'lines', count: s.count, pos, meta, rot: [0, 0], spin: 0, drift: 0 };
}

/* ------------------------------------------------------------------ */
/* Projection CPU (rendu SVG de secours, instantané pour la bascule)   */
/* ------------------------------------------------------------------ */

/**
 * Rotation autour du pivot de la scène dans un repère y-haut (comme la maquette) :
 * lacet (yaw, autour de y) puis tangage (pitch, autour de x).
 * Retourne aussi la profondeur normalisée d ∈ [0,1] (0 = loin, 1 = près).
 */
export function project(x: number, y: number, z: number, pitch: number, yaw: number): [number, number, number, number] {
  const px = x - PIVOT_X;
  const py = -(y - PIVOT_Y);
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const cx = Math.cos(pitch);
  const sx = Math.sin(pitch);
  const X = px * cy + z * sy;
  let Z = -px * sy + z * cy;
  const Y = py * cx - Z * sx;
  Z = py * sx + Z * cx;
  const dn = Math.max(0, Math.min(1, (Z / DEPTH_SCALE + 1) / 2));
  return [PIVOT_X + X, PIVOT_Y - Y, Z, dn];
}

/** Modulateurs de profondeur (normalisés pour valoir 1 à mi-profondeur). Identiques au shader. */
export const depthSize = (dn: number): number => (0.7 + dn * 1.1) / 1.25;
export const depthAlpha = (dn: number): number => Math.min(1, (0.2 + dn * 0.8) / 0.6);

const INK = '#16241C';
const ACCENT = '#D4E35A';

/** Rendu SVG statique d'une forme (secours sans WebGL / sans JS, et emblèmes). */
export function shapeToSvg(raw: RawShape, title: string, withLabels = false): string {
  const all = [...raw.key, ...raw.fill];
  const pts: Array<{ x: number; y: number; r: number; o: number; acc: boolean; z: number }> = [];
  for (let i = 0; i < all.length; i += STRIDE) {
    const acc = all[i + 5] === 1;
    const [x, y, z, dn] = acc ? [all[i]!, all[i + 1]!, 0, 0.5] : project(all[i]!, all[i + 1]!, all[i + 2]!, raw.rot[0], raw.rot[1]);
    pts.push({ x, y, z, acc, r: all[i + 3]! * depthSize(dn), o: all[i + 4]! * depthAlpha(dn) });
  }
  pts.sort((a, b) => (a.acc === b.acc ? a.z - b.z : a.acc ? -1 : 1));
  const f = (n: number): string => (Math.round(n * 10) / 10).toString();
  const circles = pts
    .map((p) => {
      const paint = p.acc ? ` fill="${ACCENT}"` : p.o < 0.995 ? ` opacity="${(Math.round(p.o * 100) / 100).toString()}"` : '';
      return `<circle cx="${f(p.x)}" cy="${f(p.y)}" r="${f(Math.max(0.5, p.r))}"${paint}/>`;
    })
    .join('');
  const leader = withLabels && raw.leader
    ? `<line x1="${raw.leader[0]}" y1="${raw.leader[1]}" x2="${raw.leader[2]}" y2="${raw.leader[3]}" stroke="${INK}" stroke-width="1"/>`
    : '';
  const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const labels = (withLabels ? raw.labels : [])
    .map((l) => `<text x="${l.x}" y="${l.y}" text-anchor="${l.anchor}">${esc(l.text)}</text>`)
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${STAGE_W} ${STAGE_H}" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title><g fill="${INK}">${circles}</g>${leader}<g font-family="'Instrument Sans', system-ui, sans-serif" font-size="13" fill="${INK}">${labels}</g></svg>`;
}
