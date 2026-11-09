import type { APIRoute } from 'astro';

/**
 * Stratégie GEO : être trouvé et cité, sans servir à entraîner des modèles.
 * - Moteurs de recherche et robots de recherche des assistants (OAI-SearchBot, ChatGPT-User,
 *   Claude-SearchBot, Claude-User, PerplexityBot…) : autorisés (règle générale).
 * - Robots d'entraînement : bloqués. Google-Extended ne touche ni Google Search ni les
 *   AI Overviews ; il ne fait que retirer le contenu de l'entraînement de Gemini.
 */
const TRAINING_BOTS = [
  'GPTBot', // OpenAI
  'ClaudeBot', // Anthropic
  'Google-Extended', // Google (Gemini)
  'Applebot-Extended', // Apple Intelligence
  'meta-externalagent', // Meta
  'CCBot', // Common Crawl (jeux de données d'entraînement)
  'Bytespider', // ByteDance
  'cohere-training-data-crawler', // Cohere
  'Amazonbot', // Amazon
];

export const GET: APIRoute = ({ site }) => {
  const blocked = TRAINING_BOTS.map((ua) => `User-agent: ${ua}\nDisallow: /`).join('\n\n');
  const body = `User-agent: *\nAllow: /\n\n# Entraînement de modèles d'IA : refusé.\n${blocked}\n\nSitemap: ${new URL('/sitemap.xml', site).href}\n`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
