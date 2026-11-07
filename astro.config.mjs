// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import node from '@astrojs/node';

// Charge .env dans process.env (dev, build, preview). En production : `node --env-file=.env`.
try {
  process.loadEnvFile();
} catch {
  /* pas de fichier .env : variables du système uniquement */
}

// TODO(Matthieu) : remplacer par le vrai domaine (ou définir SITE_URL au build).
// `.example` est un TLD réservé : impossible de le publier par erreur.
const site = process.env.SITE_URL ?? 'https://matthieuparent.example';

export default defineConfig({
  site,
  trailingSlash: 'never',
  build: { format: 'file' },
  integrations: [mdx()],
  // Site statique, sauf les routes `prerender = false` (/api/status*) servies par Node.
  adapter: node({ mode: 'standalone' }),
  // Code : monospace système sur fond vert profond (pas de thème Shiki coloré, cf. DA).
  markdown: { syntaxHighlight: false },
  prefetch: { prefetchAll: false, defaultStrategy: 'hover' },
  devToolbar: { enabled: false },
});
