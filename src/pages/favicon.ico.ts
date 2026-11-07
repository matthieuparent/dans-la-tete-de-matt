/** favicon.ico (PNG 32 × 32 encapsulé dans un conteneur ICO), pour les vieux clients. */
import type { APIRoute } from 'astro';
import sharp from 'sharp';
import { boxSvg } from '../lib/brand';

export const GET: APIRoute = async () => {
  const png = await sharp(Buffer.from(boxSvg(32))).png().toBuffer();
  const header = Buffer.alloc(22);
  header.writeUInt16LE(0, 0); // réservé
  header.writeUInt16LE(1, 2); // type : icône
  header.writeUInt16LE(1, 4); // 1 image
  header.writeUInt8(32, 6);
  header.writeUInt8(32, 7);
  header.writeUInt8(0, 8);
  header.writeUInt8(0, 9);
  header.writeUInt16LE(1, 10);
  header.writeUInt16LE(32, 12);
  header.writeUInt32LE(png.length, 14);
  header.writeUInt32LE(22, 18);
  return new Response(new Uint8Array(Buffer.concat([header, png])), { headers: { 'Content-Type': 'image/x-icon' } });
};
