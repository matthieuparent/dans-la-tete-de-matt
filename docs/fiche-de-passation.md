# Fiche de passation — « Dans la tête de Matt »

Portfolio de Matthieu Parent. Maquettes de référence : [canevas « Portfolio — L'Atlas »](https://claude.ai/artifact/VCKqffeLkmhbozWTuhxuDn)
(pages *V1·C — sections*, *Logo*, *Carnet (mode Lire)*, *Mobile*). Les pages *Pistes d'accueil* et *V1 — couleurs et typo* sont des archives, pas des cibles.

---

## Intention

Le visiteur doit sentir qu'il entre dans la tête de quelqu'un qui pense en systèmes, sait expliquer et s'amuse en le faisant. Le site est sérieux et sobre ; le spectacle vient d'une seule matière, des points, qui changent de forme selon ce dont on parle.

## Interaction signature

**Les points qui changent de forme au défilement.**

- **Déclencheur** : le défilement vertical **natif et libre**. Le visiteur avance à son rythme, comme sur une page normale.
- **Interdit** : pas de défilement automatique, pas de *scroll snapping*, pas d'effet « un coup de molette = une section » (carrousel vertical), pas de détournement de la molette.
- **Comportement** : la transformation est **liée à la position de défilement** (*scrub*). Entre deux sections, la progression de la transformation (0 → 1) suit exactement la distance parcourue : si le visiteur s'arrête à mi-chemin, la forme reste à mi-chemin ; s'il remonte, elle revient en arrière. Chaque point a un léger décalage aléatoire dans cette progression (0 à 25 %) pour que la transformation paraisse organique.
- **Distance** : environ 1 hauteur d'écran de défilement par transformation, puis ~0,5 écran où la forme est stable pendant qu'on lit le texte de la section. Un lissage très léger (interpolation sur ~100 ms) évite les saccades de la molette, sans jamais prendre le contrôle du défilement.
- **Au repos** : la forme « respire » doucement (rotation lente pour l'intro, dérive pour les projets), indépendamment du défilement.
- **Ressenti visé** : « c'est la même matière qui pense à autre chose », et c'est moi qui décide du rythme. Jamais un changement de page.

| # | Section | Forme des points | Interaction propre |
|---|---|---|---|
| 00 | Intro | Cerveau en nuage de points, vue ¾, rotation liée au défilement | Halo vert-jaune « Prochaine pensée : Projets » |
| 01 | Projets | ~16 noyaux (un par projet) reliés par une ligne de temps ; taille = envergure, position = année | Survol (bureau) ou toucher (mobile) d'un noyau → fiche projet |
| 02 | Enseignement | Tableau de classe (cadre, lignes « à la craie », schéma) + 3 rangées de pupitres | Le tableau affiche le cours en vedette |
| 03 | Jeu | Silhouette simple de console portable : corps arrondi, écran vide, 2 joysticks, 4 boutons en losange | Les boutons surlignés lancent une démo jouable (plus tard) |
| 04 | IA | Réseau de neurones artificiel : 5 couches, un chemin activé en surligneur | Survol d'un neurone → courte note |
| 05 | Famille | 5 silhouettes : papa, maman, garçon 12 ans, filles 6 et 2 ans ; reliées par un fil | Aucune ; pas de visages, pas de noms |
| 06 | Carnet | Les points s'alignent en lignes de texte | Transition vers le mode Lire |

Les formules des formes sont dans le code des maquettes (`Sections.dc.html`, méthodes `intro()`, `projets()`, `enseignement()`, `jeu()`, `ia()`, `famille()`). Elles produisent des positions 2D ; en WebGL, leur donner une petite profondeur (z aléatoire ±0,05) pour que la rotation garde du volume.

## Parcours

1. **Arrivée** : en-tête (boîte MP, Explorer/Lire, navigation), cerveau, titre « Dans la tête de Matt » (« Matt » surligné), fiche Profil (Nom, Rôle, Disciplines, Basé à, Statut). Index des sections à droite.
2. **Défilement libre** : 00 → 06, au rythme du visiteur. La zone des points reste fixe à l'écran (`position: sticky`) pendant que le texte de chaque section défile normalement dans la colonne de gauche (numéro surligné, titre condensé, texte, 2–3 infos clés). Les points se transforment au fil du défilement. L'index de droite suit et permet aussi de sauter directement à une section (défilement doux vers son ancre, que le visiteur peut interrompre).
3. **Bascule Explorer → Lire**, possible depuis n'importe quelle section :
   - 0 ms : clic sur « Lire ». L'URL devient `/carnet/<section>` **sans rechargement** (`history.pushState`).
   - 0–600 ms : les points glissent et s'alignent en lignes ; le texte de la section s'estompe.
   - 600–900 ms : les lignes se fondent dans les vrais titres d'articles.
   - Retour (« Explorer » ou bouton Précédent) : le même mouvement à l'envers, on retombe sur la même section.
4. **Carnet** : arrive filtré sur la section d'origine. En remontant, le grand titre « Carnet de Matt » et la barre de filtres apparaissent ; la barre devient collante dès qu'on remonte (masquée en descendant). Filtre « Tous les articles » disponible.
5. **Article** : barre de progression en points, tête d'article, démo interactive éventuelle, corps en 3 colonnes (sommaire / texte / notes de marge), sections liées, note précédente/suivante, « Revenir à l'exploration · <section> ».

## Direction artistique

**Couleurs** (aucune autre)

| Rôle | Valeur |
|---|---|
| Fond | `#E9E5DA` (ivoire) |
| Encre, texte, points | `#16241C` (vert profond) |
| Texte secondaire | `#55605A` (contraste 5,3:1 sur le fond) |
| Surligneur | `#D4E35A` — **jamais pour du texte**, uniquement en fond derrière de l'encre |
| Surface carte/feuille | `#F4F1E8` |
| Filets | `#16241C` à 12–25 % |

**Typographies**

- Titres, logo, filtres : **Archivo**, graisse 800, `font-variation-settings: 'wdth' 64–66`, capitales.
- Texte, interface : **Instrument Sans** 400/500/600, casse normale. Corps d'article 19 px / 1,65 (17 px sur mobile).
- Code : monospace système. **Pas de typo mono décorative ailleurs** (choix explicite du client).

**Le geste de la marque : le surligneur.** Il sert à : « Matthieu » dans le logo, « Matt » dans les titres, la section active, le filtre actif, le halo dans les formes, les repères de notes. **Survol** : le surligneur balaie l'élément de gauche à droite avec un bord en biais (`linear-gradient(100deg, #D4E35A …)`, `background-size` animé, ~180 ms). Pas de soulignement, pas de changement de couleur du texte.

**Formes** : angles droits partout (filtres, boutons, cartes). Seuls arrondis : le sélecteur Explorer/Lire (6 px) et les points.

**Logo** : boîte vert-jaune 44 px avec « MP » (Archivo condensé) dans l'en-tête ; version longue « **Matthieu** Parent » (prénom surligné) pour le pied de page, le partage et l'icône. Favicon : la boîte MP.

**Grille bureau** : colonnes à 64 / 480 / 1200 / 1376 px (sur 1440), filets verticaux très légers visibles. Zone des points : 720 × 708 px au centre.

**Son** : aucun pour l'instant.

## Essentiel vs simplifiable

**À ne pas sacrifier**
- Une seule matière (des points) pour toutes les sections, et la continuité entre elles.
- La bascule Explorer ↔ Lire sans rechargement, qui ramène au bon endroit.
- Le surligneur comme seul accent, et la sobriété générale (ivoire, vert, condensé).
- La pudeur de la section Famille.

**Simplifiable en V1**
- Les démos jouables (Jeu) et les notes au survol (IA) : afficher un lien à la place.
- La fiche projet au survol peut devenir une liste sous les noyaux.
- Les icônes en points du Carnet peuvent être des SVG statiques.
- La barre de progression en points peut être une barre pleine fine.

## Technologies recommandées

- **Astro** + îlots, avec le routeur client d'Astro (View Transitions) : navigation sans rechargement, le `<canvas>` WebGL persiste entre les pages (`transition:persist`), contenu statique rapide et bon référencement.
- **Articles en MDX** dans le dépôt : permet d'insérer des démos interactives (ex. le cerveau réglable) comme composants.
- **Three.js** : un seul `THREE.Points` avec un `ShaderMaterial`. Chaque forme est calculée une fois sur le CPU en `Float32Array` ; la transformation interpole `positionA → positionB` dans le vertex shader (uniform `uProgress` + attribut `aDelay` par point). La profondeur règle taille et opacité, comme dans les maquettes.
- **Défilement** : GSAP ScrollTrigger en mode `scrub` (sans `snap`, sans `pin` qui bloque le défilement) pour lier `uProgress` à la position de défilement. Garder le défilement natif du navigateur ; pas de bibliothèque qui remplace la molette.
- **Survol des noyaux** : test de distance en espace écran sur les 16 centres (pas de raycasting point par point).

## Contraintes

- **Nombre de points** : ~6 000 sur bureau, ~1 500 sur mobile, ~700 si `navigator.hardwareConcurrency <= 4` ou `deviceMemory <= 4`. Les points non utilisés par une forme deviennent une poussière très pâle.
- **Mobile** (page *Mobile*) : index → barre fixe en bas ; survol → toucher qui ouvre un panneau ; menu plein écran vert ; filtres en barre qui défile à l'horizontale ; notes de marge sous leur paragraphe ; sommaire replié.
- **`prefers-reduced-motion`** : pas de transformation ; fondu enchaîné de 200 ms entre formes fixes ; pas de rotation continue ; l'index saute aux sections sans défilement animé.
- **Sans WebGL** : chaque forme rendue en SVG statique (les maquettes le font déjà) ; tout le contenu reste lisible.
- **Accessibilité** : le texte de chaque section existe en HTML réel, indépendamment du canvas (le canvas est `aria-hidden`, avec une description courte de la forme) ; vrais `<button>` / `<a>` ; cibles ≥ 44 px ; ordre de tabulation logique ; le mode Lire est une vraie liste d'articles navigable au clavier ; contraste du texte ≥ 4,5:1.
- **Performance** : LCP < 2,5 s (le titre et le texte s'affichent avant le WebGL) ; le canvas se charge après la première peinture ; pause du rendu quand l'onglet est caché ou la zone hors écran.

## Critères de réussite

- Un visiteur qui fait défiler sans lire comprend qu'il change de sujet **uniquement en regardant les points**.
- Le défilement se comporte comme sur n'importe quelle page : on peut s'arrêter au milieu d'une transformation, remonter, aller vite ou lentement ; rien ne « saute » tout seul.
- Personne ne se demande s'il a quitté la page lors de la bascule vers le Carnet.
- Le retour depuis un article ramène à la bonne section, au bon état.
- Sur un téléphone moyen, la transformation reste fluide (≥ 50 images/s).
- Le site reste parfaitement utilisable avec le mouvement réduit et sans WebGL.

## Contenu à fournir par Matthieu

- Profil : disciplines, ville, statut.
- Projets : nom, année, type, technos, une phrase, aperçu (image ou vidéo courte), lien — pour chaque noyau.
- Enseignement : depuis quand, cours, approche.
- Jeu : jeu du moment, jeu de toujours, game jams.
- IA : outils, place en classe, position.
- Famille : une ou deux phrases.
- Carnet : premiers articles (les titres des maquettes sont des exemples de sujets).
