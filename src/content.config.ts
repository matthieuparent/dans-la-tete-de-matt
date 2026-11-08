import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { CARNET_SECTIONS } from './data/sections';

const carnet = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/carnet' }),
  schema: z.object({
    title: z.string(),
    /** Une phrase : sert d'extrait, de meta description et de résumé citable (GEO). */
    description: z.string().max(200),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    section: z.enum(CARNET_SECTIONS),
    /** Sections « reliées » affichées en pied d'article. */
    related: z.array(z.enum(CARNET_SECTIONS)).default([]),
    /** Partie du titre à surligner (doit apparaître telle quelle dans `title`). */
    highlight: z.string().optional(),
    /** Image de partage (Open Graph), chemin absolu depuis /public. */
    image: z.string().optional(),
    /** Vignette des cartes du Carnet (16:10), chemin absolu depuis /public. */
    thumb: z.string().optional(),
    minutes: z.number().int().positive().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { carnet };
