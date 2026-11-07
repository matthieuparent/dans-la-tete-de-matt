/**
 * Formes en SVG statique, générées au build par le MÊME code que le WebGL.
 * Servent : d'image d'attente avant le WebGL, de secours sans WebGL / sans JS,
 * et d'illustration lisible par les robots.
 */
import type { APIRoute, GetStaticPaths } from 'astro';
import { SHAPE_IDS, sectionById, type ShapeId } from '../../data/sections';
import { buildShape, shapeToSvg } from '../../scripts/dots/shapes';

export const getStaticPaths = (() => SHAPE_IDS.map((id) => ({ params: { id } }))) satisfies GetStaticPaths;

export const GET: APIRoute = ({ params }) => {
  const id = params.id as ShapeId;
  // Densité 0,75 : assez de points pour lire la forme, fichier léger (~30–60 ko, ~15 ko gzip).
  const svg = shapeToSvg(buildShape(id, 0.75), sectionById(id)?.shapeLabel ?? id);
  return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml; charset=utf-8' } });
};
