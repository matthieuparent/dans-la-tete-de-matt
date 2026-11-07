# Dans la tête de Matt

Portfolio de Matthieu Parent — Astro 6 + MDX + Three.js. Spécifications : [docs/fiche-de-passation.md](docs/fiche-de-passation.md).

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # site statique dans dist/ (SITE_URL=https://… npm run build)
npm run check    # types + diagnostics Astro
```

## Arborescence

```
src/
  data/sections.ts        contenu des sections (00–06) + profil — placeholders [entre crochets]
  data/projets.ts         les 16 noyaux (ordre du tableau = chronologie)
  content/carnet/*.mdx    articles (draft: true = visible en dev seulement)
  scripts/dots/shapes.ts  formes de points, isomorphe (build SVG + WebGL)
  scripts/dots/DotsRenderer.ts   THREE.Points + ShaderMaterial (morph A→B dans le vertex shader)
  scripts/dots/DotsDirector.ts   boucle, pilotes (défilement / transition), pause hors écran
  scripts/ScrollTimeline.ts      défilement natif → progression des formes (scrub, sans snap)
  scripts/main.ts          racine client : bascule Explorer ↔ Lire via le routeur Astro
  pages/formes/[id].svg.ts formes en SVG statique (attente LCP, secours sans WebGL/JS)
  pages/{sitemap.xml,robots.txt,rss.xml,llms.txt}.ts, [icon].png.ts (OG + icônes via sharp)
```

## Écrire un article

```mdx
---
title: Mon titre
highlight: partie surlignée du titre
description: Une phrase (extrait, meta description, résumé citable).
date: 2026-11-07
section: projets   # projets | enseignement | jeu | ia | famille
related: [ia]
---

Paragraphe.<sup class="note-ref"><a href="#note-1">1</a></sup>

<Note n={1}>Note de marge.</Note>
<Quote>« Citation avec <mark>surligneur</mark>. »</Quote>
<BrainDemo />
```
