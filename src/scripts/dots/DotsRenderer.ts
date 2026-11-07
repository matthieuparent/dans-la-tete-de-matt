/**
 * Rendu WebGL des points : un seul `BufferGeometry`, deux `THREE.Points` qui le partagent
 * (passe 0 = points d'accent/surligneur, passe 1 = encre) pour que le surligneur reste
 * toujours DERRIÈRE l'encre, comme dans les maquettes, sans tri ni depth buffer.
 *
 * La transformation A → B est faite dans le vertex shader : on ne réécrit les attributs
 * que lorsqu'on franchit une frontière de section (≈ 6 000 × 12 floats, négligeable).
 * Aucune matrice de caméra : les positions sont en px « scène » (720 × 708) et converties
 * directement en clip space via le rectangle de la scène à l'écran (uniform `uStage`).
 */
import {
  BufferAttribute,
  BufferGeometry,
  NormalBlending,
  OrthographicCamera,
  Points,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  Vector4,
  WebGLRenderer,
  type IUniform,
} from 'three';
import { DEPTH_SCALE, PIVOT_X, PIVOT_Y, STAGE_H, STAGE_W, project, rng, type PackedShape } from './shapes';

export interface StageRect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/** Délai max par point dans la progression (0 à 25 %, cf. fiche). */
const MAX_DELAY = 0.25;
/** Amplitude (px scène) de l'écart « nébuleuse » au milieu d'une transformation. */
const SWIRL = 46;

const vertexShader = /* glsl */ `
  attribute vec3 aPosA;   // forme de départ (px scène, z vers le spectateur)
  attribute vec3 aMetaA;  // rayon (px scène), opacité, accent (0|1)
  attribute vec3 aPosB;   // forme d'arrivée
  attribute vec3 aMetaB;
  attribute vec4 aSeed;   // x : délai ∈ [0, 0.25] ; yzw : aléas ∈ [0,1]

  uniform float uProgress;   // progression globale A → B ∈ [0,1] (liée au défilement)
  uniform float uReduced;    // 1 : mouvement réduit → fondu enchaîné, pas de trajet
  uniform float uEaseOut;    // 0 : départ et arrivée doux (défilement) ; 1 : départ vif (bascule)
  uniform float uTime;       // secondes, pour la dérive au repos
  uniform float uPass;       // 0 : accent, 1 : encre
  uniform vec2  uRotA;       // rotation [tangage, lacet] de la forme A (radians)
  uniform vec2  uRotB;
  uniform float uDriftA;     // amplitude de dérive (px scène)
  uniform float uDriftB;
  uniform vec4  uStage;      // rectangle de la scène à l'écran : x, y, largeur, hauteur (px CSS)
  uniform vec2  uViewport;   // taille du canvas (px CSS)
  uniform float uPixelRatio;
  uniform float uSizeScale;  // échelle des rayons d'encre (≈ échelle de la scène, adoucie)
  uniform float uStageScale; // échelle exacte de la scène (halos et fils : ce sont des surfaces)

  varying float vAlpha;
  varying float vAccent;
  varying float vSize;

  const float PI = 3.14159265;
  const vec3 PIVOT = vec3(${PIVOT_X.toFixed(1)}, ${PIVOT_Y.toFixed(1)}, 0.0);

  // easeInOutCubic : départ et arrivée doux pour chaque point.
  float ease(float t) {
    float inOut = t < 0.5 ? 4.0 * t * t * t : 1.0 - pow(-2.0 * t + 2.0, 3.0) * 0.5;
    float outQuart = 1.0 - pow(1.0 - t, 4.0); // easeOutQuart : les points partent d'un coup
    return mix(inOut, outQuart, uEaseOut);
  }

  // Lacet (autour de y) puis tangage (autour de x), dans un repère y-haut centré sur le pivot.
  // Même ordre que la maquette (et que project() côté CPU).
  vec3 rotateStage(vec3 p, vec2 r) {
    vec3 q = vec3(p.x - PIVOT.x, -(p.y - PIVOT.y), p.z);
    float cy = cos(r.y), sy = sin(r.y);
    float x = q.x * cy + q.z * sy;
    float z = -q.x * sy + q.z * cy;
    float cx = cos(r.x), sx = sin(r.x);
    float y = q.y * cx - z * sx;
    z = q.y * sx + z * cx;
    return vec3(PIVOT.x + x, PIVOT.y - y, z);
  }

  void main() {
    // Progression locale : chaque point part avec un léger retard aléatoire,
    // et tous arrivent à uProgress = 1 (division par 1 - MAX_DELAY).
    float local = clamp((uProgress - aSeed.x) / ${(1 - MAX_DELAY).toFixed(2)}, 0.0, 1.0);
    float e = mix(ease(local), step(0.5, uProgress), uReduced);

    vec3 pos = mix(aPosA, aPosB, e);
    vec3 meta = mix(aMetaA, aMetaB, e);
    float acc = meta.z;

    // Nébuleuse : écart maximal à mi-chemin (sin(πe)), nul aux deux extrémités.
    pos.xy += sin(e * PI) * (aSeed.yz - 0.5) * ${SWIRL.toFixed(1)} * (1.0 - uReduced);

    // Les points d'accent (halos, fils) ne tournent pas : ce sont des repères 2D.
    vec2 rot = mix(uRotA, uRotB, e) * (1.0 - acc);
    pos = rotateStage(pos, rot);

    // Dérive au repos : champ de flux lent, cohérent localement (les noyaux bougent d'un bloc).
    float drift = mix(uDriftA, uDriftB, e);
    pos.xy += vec2(sin(uTime * 0.35 + pos.y * 0.018 + aSeed.w * 0.6),
                   cos(uTime * 0.29 + pos.x * 0.018)) * drift;

    // Profondeur → taille et opacité (normalisées à 1 à mi-profondeur, comme la maquette).
    float dn = clamp((pos.z / ${DEPTH_SCALE.toFixed(1)} + 1.0) * 0.5, 0.0, 1.0);
    float sizeMul = (0.7 + dn * 1.1) / 1.25;
    float alphaMul = min(1.0, (0.2 + dn * 0.8) / 0.6);

    // Mouvement réduit : fondu enchaîné (disparaît puis réapparaît) sur place.
    float fade = mix(1.0, abs(1.0 - 2.0 * uProgress), uReduced);

    bool keep = (uPass < 0.5) == (acc >= 0.5);
    vec2 screen = uStage.xy + pos.xy * (uStage.z / ${STAGE_W.toFixed(1)});
    vec2 clip = vec2(screen.x / uViewport.x * 2.0 - 1.0, 1.0 - screen.y / uViewport.y * 2.0);

    vAccent = acc;
    vAlpha = meta.y * mix(alphaMul, 1.0, acc) * fade;
    vSize = (2.0 * meta.x * mix(uSizeScale * sizeMul, uStageScale, acc) + 1.0) * uPixelRatio;
    gl_PointSize = keep ? vSize : 0.0;
    gl_Position = keep ? vec4(clip, 0.0, 1.0) : vec4(2.0, 2.0, 2.0, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision mediump float;
  uniform vec3 uInk;
  uniform vec3 uAccent;
  uniform float uFade;   // fondu global (bascule vers les vrais titres)
  varying float vAlpha;
  varying float vAccent;
  varying float vSize;

  void main() {
    // Disque antialiasé : bord adouci sur ~1 px physique.
    float d = length(gl_PointCoord - 0.5) * 2.0;
    float aa = 2.0 / max(vSize, 1.0);
    float a = 1.0 - smoothstep(1.0 - aa, 1.0, d);
    if (a <= 0.0) discard;
    vec3 color = mix(uInk, uAccent, smoothstep(0.25, 0.75, vAccent));
    gl_FragColor = vec4(color, a * vAlpha * uFade);
  }
`;

/** Hex sRGB → vec3 sans conversion linéaire : les couleurs sortent identiques au CSS. */
const hex = (h: string): Vector3 => {
  const n = Number.parseInt(h.slice(1), 16);
  return new Vector3(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
};

type Uniforms = Record<string, IUniform>;

export class DotsRenderer {
  readonly count: number;
  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly camera = new OrthographicCamera();
  private readonly geometry = new BufferGeometry();
  private readonly materials: ShaderMaterial[] = [];
  private readonly uniforms: Uniforms;
  private readonly attrs: Record<'posA' | 'metaA' | 'posB' | 'metaB', BufferAttribute>;
  private readonly seeds: Float32Array;
  private pairKey = '';
  private shapeA: PackedShape | null = null;
  private shapeB: PackedShape | null = null;
  private stage: StageRect = { x: 0, y: 0, w: STAGE_W, h: STAGE_H };

  constructor(
    private readonly canvas: HTMLCanvasElement,
    count: number,
  ) {
    this.count = count;
    this.renderer = new WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'high-performance' });
    this.renderer.setClearColor(0x000000, 0);

    const n = count;
    this.attrs = {
      posA: new BufferAttribute(new Float32Array(n * 3), 3),
      metaA: new BufferAttribute(new Float32Array(n * 3), 3),
      posB: new BufferAttribute(new Float32Array(n * 3), 3),
      metaB: new BufferAttribute(new Float32Array(n * 3), 3),
    };
    this.seeds = new Float32Array(n * 4);
    const R = rng(4242);
    for (let i = 0; i < n; i++) {
      this.seeds[i * 4] = R() * MAX_DELAY;
      this.seeds[i * 4 + 1] = R();
      this.seeds[i * 4 + 2] = R();
      this.seeds[i * 4 + 3] = R();
    }
    // `position` est requis par three pour compter les sommets ; on ne l'utilise pas.
    this.geometry.setAttribute('position', new BufferAttribute(new Float32Array(n * 3), 3));
    this.geometry.setAttribute('aPosA', this.attrs.posA);
    this.geometry.setAttribute('aMetaA', this.attrs.metaA);
    this.geometry.setAttribute('aPosB', this.attrs.posB);
    this.geometry.setAttribute('aMetaB', this.attrs.metaB);
    this.geometry.setAttribute('aSeed', new BufferAttribute(this.seeds, 4));

    this.uniforms = {
      uProgress: { value: 0 },
      uReduced: { value: 0 },
      uEaseOut: { value: 0 },
      uTime: { value: 0 },
      uRotA: { value: new Vector2() },
      uRotB: { value: new Vector2() },
      uDriftA: { value: 0 },
      uDriftB: { value: 0 },
      uStage: { value: new Vector4(0, 0, STAGE_W, STAGE_H) },
      uViewport: { value: new Vector2(1, 1) },
      uPixelRatio: { value: 1 },
      uSizeScale: { value: 1 },
      uStageScale: { value: 1 },
      uInk: { value: hex('#16241C') },
      uAccent: { value: hex('#D4E35A') },
      uFade: { value: 1 },
    };

    [0, 1].forEach((pass) => {
      const mat = new ShaderMaterial({
        vertexShader,
        fragmentShader,
        // Uniforms partagés par référence, sauf uPass propre à chaque passe.
        uniforms: { ...this.uniforms, uPass: { value: pass } },
        transparent: true,
        depthTest: false,
        depthWrite: false,
        blending: NormalBlending,
      });
      const pts = new Points(this.geometry, mat);
      pts.frustumCulled = false; // positions calculées dans le shader : pas de bounding sphere fiable
      pts.renderOrder = pass;
      this.materials.push(mat);
      this.scene.add(pts);
    });

    this.resize();
  }

  /* --------------------------- état --------------------------- */

  get progress(): number {
    return this.uniforms.uProgress!.value as number;
  }
  set progress(v: number) {
    this.uniforms.uProgress!.value = Math.min(1, Math.max(0, v));
  }
  set easeOut(v: boolean) {
    this.uniforms.uEaseOut!.value = v ? 1 : 0;
  }
  set reduced(v: boolean) {
    this.uniforms.uReduced!.value = v ? 1 : 0;
  }
  get fade(): number {
    return this.uniforms.uFade!.value as number;
  }
  set fade(v: number) {
    this.uniforms.uFade!.value = Math.min(1, Math.max(0, v));
  }
  set time(t: number) {
    this.uniforms.uTime!.value = t;
  }
  get pair(): [PackedShape | null, PackedShape | null] {
    return [this.shapeA, this.shapeB];
  }

  setRotation(a: readonly [number, number], b: readonly [number, number]): void {
    (this.uniforms.uRotA!.value as Vector2).set(a[0], a[1]);
    (this.uniforms.uRotB!.value as Vector2).set(b[0], b[1]);
  }

  setDrift(a: number, b: number): void {
    this.uniforms.uDriftA!.value = a;
    this.uniforms.uDriftB!.value = b;
  }

  /** Installe la paire A → B ; ne réécrit le GPU que si la paire change vraiment. */
  setPair(a: PackedShape, b: PackedShape, key = `${a.id}>${b.id}`): void {
    if (key === this.pairKey && a === this.shapeA && b === this.shapeB) return;
    this.pairKey = key;
    this.shapeA = a;
    this.shapeB = b;
    (this.attrs.posA.array as Float32Array).set(a.pos);
    (this.attrs.metaA.array as Float32Array).set(a.meta);
    (this.attrs.posB.array as Float32Array).set(b.pos);
    (this.attrs.metaB.array as Float32Array).set(b.meta);
    for (const attr of Object.values(this.attrs)) attr.needsUpdate = true;
  }

  get stageRect(): StageRect {
    return this.stage;
  }

  setStage(rect: StageRect): void {
    this.stage = rect;
    (this.uniforms.uStage!.value as Vector4).set(rect.x, rect.y, rect.w, rect.h);
    // Les rayons suivent l'échelle de la scène, mais adoucie (puissance 0,6) pour que
    // les points restent lisibles sur mobile ; un peu plus gros quand ils sont rares.
    const scale = rect.w / STAGE_W;
    this.uniforms.uSizeScale!.value = Math.pow(scale, 0.6) * (this.count < 2000 ? 1.25 : 1);
    this.uniforms.uStageScale!.value = scale;
  }

  resize(): void {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    (this.uniforms.uViewport!.value as Vector2).set(w, h);
    this.uniforms.uPixelRatio!.value = dpr;
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  setAnimationLoop(cb: ((now: number) => void) | null): void {
    this.renderer.setAnimationLoop(cb);
  }

  clear(): void {
    this.renderer.clear();
  }

  /**
   * Instantané CPU de l'état affiché (mêmes maths que le vertex shader, sans la dérive),
   * rotation « cuite » dans les positions. Sert de point de départ aux transitions
   * temporelles (bascule Explorer ↔ Lire) quand on est au milieu d'une transformation.
   */
  snapshot(): PackedShape {
    const a = this.shapeA;
    const b = this.shapeB;
    if (!a || !b) throw new Error('DotsRenderer.snapshot: aucune forme installée');
    const n = this.count;
    const pos = new Float32Array(n * 3);
    const meta = new Float32Array(n * 3);
    const p = this.progress;
    const reduced = (this.uniforms.uReduced!.value as number) > 0.5;
    const rA = this.uniforms.uRotA!.value as Vector2;
    const rB = this.uniforms.uRotB!.value as Vector2;
    for (let i = 0; i < n; i++) {
      const local = Math.min(1, Math.max(0, (p - this.seeds[i * 4]!) / (1 - MAX_DELAY)));
      const inOut = local < 0.5 ? 4 * local ** 3 : 1 - (-2 * local + 2) ** 3 / 2;
      const out = 1 - (1 - local) ** 4;
      const eo = this.uniforms.uEaseOut!.value as number;
      const e = reduced ? (p >= 0.5 ? 1 : 0) : inOut + (out - inOut) * eo;
      const o = i * 3;
      const mix = (x: number, y: number): number => x + (y - x) * e;
      let x = mix(a.pos[o]!, b.pos[o]!);
      let y = mix(a.pos[o + 1]!, b.pos[o + 1]!);
      let z = mix(a.pos[o + 2]!, b.pos[o + 2]!);
      const acc = mix(a.meta[o + 2]!, b.meta[o + 2]!);
      if (!reduced) {
        const s = Math.sin(e * Math.PI);
        x += s * (this.seeds[i * 4 + 1]! - 0.5) * SWIRL;
        y += s * (this.seeds[i * 4 + 2]! - 0.5) * SWIRL;
      }
      const k = 1 - acc;
      [x, y, z] = project(x, y, z, mix(rA.x, rB.x) * k, mix(rA.y, rB.y) * k);
      pos[o] = x;
      pos[o + 1] = y;
      pos[o + 2] = z;
      meta[o] = mix(a.meta[o]!, b.meta[o]!);
      meta[o + 1] = mix(a.meta[o + 1]!, b.meta[o + 1]!);
      meta[o + 2] = acc >= 0.5 ? 1 : 0;
    }
    return { id: 'lines', count: n, pos, meta, rot: [0, 0], spin: 0, drift: 0 };
  }

  dispose(): void {
    this.geometry.dispose();
    for (const m of this.materials) m.dispose();
    this.scene.clear();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }
}
