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

// Domaine de production ; SITE_URL permet de le remplacer au build (déploiement, essais).
const site = process.env.SITE_URL ?? 'https://matthieuparent.com';

export default defineConfig({
  site,
  trailingSlash: 'never',
  build: { format: 'file' },
  integrations: [mdx()],
  // Site statique, sauf les routes `prerender = false` (/api/status*) servies par Node.
  adapter: node({ mode: 'standalone' }),
  // Code : monospace système sur fond vert profond (pas de thème Shiki coloré, cf. DA).
  markdown: { syntaxHighlight: false },
  // Pages légères (~25 Ko) : on précharge chaque lien interne dès qu'il entre à l'écran,
  // sur mobile aussi (pas de survol au doigt). Astro s'abstient en mode économie de données.
  prefetch: { prefetchAll: true, defaultStrategy: 'viewport' },
  devToolbar: { enabled: false },
});
