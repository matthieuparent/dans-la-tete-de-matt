// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

// TODO(Matthieu) : remplacer par le vrai domaine (ou définir SITE_URL au build).
// `.example` est un TLD réservé : impossible de le publier par erreur.
const site = process.env.SITE_URL ?? 'https://matthieuparent.example';

export default defineConfig({
  site,
  trailingSlash: 'never',
  build: { format: 'file' },
  integrations: [mdx()],
  // Code : monospace système sur fond vert profond (pas de thème Shiki coloré, cf. DA).
  markdown: { syntaxHighlight: false },
  prefetch: { prefetchAll: false, defaultStrategy: 'hover' },
  devToolbar: { enabled: false },
});
