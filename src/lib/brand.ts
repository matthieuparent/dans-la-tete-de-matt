/**
 * Marque : la boîte MP (surligneur + « MP » en capitales condensées).
 * Les lettres sont dessinées en tracés (pas de police) pour que le favicon et les images
 * de partage soient identiques partout, y compris dans les rendus sans police web.
 */
export const INK = '#16241C';
export const ACCENT = '#D4E35A';
export const IVORY = '#E9E5DA';

/** « MP » condensé, graisse 800, dans une boîte de 44 × 44. */
export const MP_PATHS =
  'M6.5 33V11h4.9l2.6 9.6 2.6-9.6h4.9v22h-3.4V19.4l-2.6 9.2h-3l-2.6-9.2V33Z' +
  'M23.5 33V11h8.2a6.6 6.6 0 0 1 0 13.2h-4.6V33Zm3.6-12h4.3a3.4 3.4 0 0 0 0-6.8h-4.3Z';

export function boxSvg(size: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 44 44"><rect width="44" height="44" fill="${ACCENT}"/><path fill="${INK}" fill-rule="evenodd" d="${MP_PATHS}"/></svg>`;
}
