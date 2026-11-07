/** Icônes PNG et image de partage, rastérisées au build avec sharp (dépendance d'Astro). */
import type { APIRoute, GetStaticPaths } from 'astro';
import sharp from 'sharp';
import { ACCENT, INK, IVORY, MP_PATHS, boxSvg } from '../lib/brand';
import { buildShape, shapeToSvg } from '../scripts/dots/shapes';

const SIZES: Record<string, number> = { 'apple-touch-icon': 180, 'icon-192': 192, 'icon-512': 512 };

export const getStaticPaths = (() => [...Object.keys(SIZES), 'og'].map((icon) => ({ params: { icon } }))) satisfies GetStaticPaths;

function ogSvg(): string {
  // Le cerveau (rendu SVG du même générateur) à droite, la boîte MP et un trait de surligneur à gauche.
  const brain = shapeToSvg(buildShape('intro', 1.4), 'Cerveau en points').replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '').replace(/<text[\s\S]*?<\/text>/g, '');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <rect width="1200" height="630" fill="${IVORY}"/>
    <g stroke="${INK}" stroke-opacity=".12"><line x1="64" y1="0" x2="64" y2="630"/><line x1="480" y1="0" x2="480" y2="630"/><line x1="1136" y1="0" x2="1136" y2="630"/></g>
    <svg x="520" y="-20" width="660" height="650" viewBox="0 0 720 708">${brain}</svg>
    <g transform="translate(96 96) scale(4)"><rect width="44" height="44" fill="${ACCENT}"/><path fill="${INK}" fill-rule="evenodd" d="${MP_PATHS}"/></g>
    <rect x="96" y="420" width="300" height="56" fill="${ACCENT}"/>
    <g fill="${INK}"><rect x="96" y="500" width="340" height="10"/><rect x="96" y="524" width="260" height="10"/></g>
  </svg>`;
}

export const GET: APIRoute = async ({ params }) => {
  const name = params.icon!;
  const svg = name === 'og' ? ogSvg() : boxSvg(SIZES[name] ?? 192);
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
