import type { APIRoute } from 'astro';
import { boxSvg } from '../lib/brand';

export const GET: APIRoute = () => new Response(boxSvg(44), { headers: { 'Content-Type': 'image/svg+xml' } });
