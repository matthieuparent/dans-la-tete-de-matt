/**
 * Mini études de cas (pages /projets/{slug}). Rendu serveur seulement.
 * Le slug doit correspondre à l'`id` du projet dans projets.ts.
 */
import { PROJETS, type Projet } from './projets';

export interface Credit {
  /** Expertise (ex. « Design UX/UI »). */
  readonly role: string;
  readonly names: readonly string[];
}

export interface Moment {
  readonly id: string;
  readonly title: string;
  readonly text: readonly string[];
  readonly image?: { readonly src: string; readonly alt: string; readonly width: number; readonly height: number; readonly narrow?: boolean };
  /** Galerie d'écrans mobiles (390 × 800 logiques). */
  readonly phones?: ReadonlyArray<{ readonly src: string; readonly alt: string; readonly label: string }>;
  /** Extrait de code (affiché tel quel). */
  readonly code?: { readonly lang: string; readonly caption: string; readonly source: string };
  /** Plan « page → pile de blocs » (page builder). */
  readonly blueprint?: { readonly caption: string; readonly pages: ReadonlyArray<{ readonly name: string; readonly blocks: readonly string[] }> };
}

/** Mini étude de cas : page /projets/{slug}. */
export interface Etude {
  readonly slug: string;
  readonly client: string;
  readonly lede: string;
  readonly role: string;
  readonly cover: { readonly src: string; readonly alt: string; readonly width: number; readonly height: number };
  readonly og: string;
  readonly moments: readonly Moment[];
  readonly credits: readonly Credit[];
}

const IMG = '/projets/synerlab';
const MDT = '/projets/mots-de-tete';
const IR = '/projets/inspirer-respirer';

const ETUDES_DATA: readonly Etude[] = [
  {
    slug: 'inspirer-respirer',
    client: "MRC d'Argenteuil",
    lede: "Le site d'attractivité d'une région de neuf municipalités : un page builder WordPress où chaque bloc choisit ses couleurs et se raccorde au précédent par un biseau, sur un front-end webpack en JavaScript orienté objet.",
    role: 'Structure et programmation',
    cover: { src: `${IR}/01-accueil.webp`, alt: "Accueil d'inspirer-respirer.com : paysage de collines, titre « L'aventure d'une vie », puis une section bleu marine coupée en biseau avec une vidéo et le texte « Ah! Te voilà! ».", width: 1440, height: 1000 },
    og: `${IR}/og.jpg`,
    moments: [
      {
        id: 'mandat',
        title: 'Le mandat',
        text: [
          "Inspirer. Respirer. est la campagne d'attractivité de la MRC d'Argenteuil : convaincre des familles, des travailleurs et des entrepreneurs de s'installer dans l'une de ses neuf municipalités. Le site devait porter quatre grandes rubriques — habiter, vivre, travailler, entreprendre —, une page par municipalité, un blogue, des vidéos, un babillard d'emplois et une charte d'inclusion à signer.",
          "Beaucoup de pages, beaucoup de contenus différents, et une équipe qui allait les faire vivre pendant des années. Mon travail : la structure du thème et toute la programmation, pour que le client puisse composer et enrichir ces pages lui-même.",
        ],
      },
      {
        id: 'page-builder',
        title: 'Quinze blocs pour tout le site',
        text: [
          "Comme sur mes autres projets WordPress, aucune page n'est codée en dur : le thème expose une bibliothèque de blocs que le client empile dans l'administration. Ici, elle en compte une quinzaine — hero, texte, texte-image, carrousel, citation, liste, vignette, FAQ, formulaire, grille, galerie, blogue, vidéos, article et emplois.",
          "Toutes les sections partagent la même enveloppe (section + grid-wrapper) ; chaque bloc, préfixé b-, ne s'occupe que de son contenu. Les pages de rubrique et celles des municipalités sont ainsi des recettes différentes faites avec les mêmes ingrédients.",
        ],
        blueprint: {
          caption: "Composition réelle des pages en ligne, relevée dans le HTML : chaque page est une pile de blocs choisie par le client.",
          pages: [
            { name: 'Habiter', blocks: ['hero --page', 'b-text', 'b-carousel --fig', 'b-quote', 'b-list', 'b-sticker', 'b-text', 'b-sticker'] },
            { name: 'Travailler', blocks: ['hero --page', 'b-text', 'b-sticker', 'b-list', 'b-carousel --fig'] },
            { name: 'Entreprendre', blocks: ['hero --page', 'b-text', 'b-quote', 'b-sticker'] },
            { name: 'Lachute', blocks: ['hero', 'b-text --reverse', 'b-text-image --fig', 'b-list', 'b-gallery'] },
            { name: 'Nous sommes Argenteuil', blocks: ['hero --page', 'b-text --reverse', 'b-grid', 'b-sticker', 'b-faq --fig', 'b-form', 'b-faq', 'videos', 'b-carousel', 'b-blog'] },
          ],
        },
      },
      {
        id: 'couleurs',
        title: 'Un système de couleurs par section',
        text: [
          "L'identité joue sur une palette vive : marine, vert, cyan, bleu pâle, rose, jaune, orange. Chaque rubrique a sa couleur, et chaque bloc expose trois réglages indépendants dans l'administration — le fond de la section, la couleur du contenu et celle des accents.",
          "Côté code, ces choix deviennent de simples classes (sections--colors-section-marine, sections--colors-content-green, sections--colors-highlight-pink) qui ne font que définir des variables. Le bloc, lui, ne connaît que ces variables : n'importe quel bloc prend n'importe quelle combinaison sans une ligne de CSS de plus.",
        ],
        image: { src: `${IR}/03-axes.webp`, alt: "Le bloc des quatre rubriques de l'accueil : Habiter en cyan, Vivre en rose, Travailler en orange et Entreprendre en marine, en damier avec des photos.", width: 1440, height: 1660, narrow: true },
      },
      {
        id: 'biseaux',
        title: 'Des biseaux qui se raccordent',
        text: [
          "La signature visuelle du site, ce sont les coupes en diagonale entre les sections. Elles sont dessinées en CSS (un dégradé à arrêt net, sans image) et activées par un modificateur : section--fig, inversé avec section--fig--reverse.",
          "Le défi : le biseau doit prendre la couleur de la section précédente, alors que le client peut réordonner les blocs à volonté. Un réglage section--colors-previous-{couleur} permet de la fixer, et l'option « automatique » laisse le thème la déduire lui-même. Le client déplace un bloc, la jonction suit.",
        ],
        image: { src: `${IR}/02-couleurs.webp`, alt: "Page Habiter : une section marine, puis une section cyan avec un carrousel de photos, raccordées par une coupe en diagonale, suivie d'une citation sur photo.", width: 1440, height: 1900 },
      },
      {
        id: 'webpack',
        title: 'Un front-end orienté objet',
        text: [
          "Le JavaScript suit l'architecture que j'utilise sur mes thèmes WordPress : des classes regroupées par webpack avec le SCSS, une classe Main qui démarre l'application et une ComponentFactory qui instancie la bonne classe pour chaque élément portant un attribut data-component.",
          "Sept composants couvrent le site : Header, Scrolly, Carousel, Accordion, Video, Filters et Icons. Chaque page n'instancie que ceux que ses blocs déclarent.",
        ],
      },
      {
        id: 'video',
        title: 'Des vidéos chargées à la demande',
        text: [
          "Le site mise beaucoup sur les témoignages vidéo. Pour ne pas alourdir les pages, chaque vidéo s'affiche d'abord comme une simple image avec un bouton de lecture : le lecteur YouTube n'est créé qu'au clic, et son API n'est chargée qu'une seule fois pour toute la page, peu importe le nombre de vidéos.",
          "La classe garde la liste de ses instances : quand une vidéo démarre, les autres se mettent en pause, et une vidéo qui sort de l'écran s'arrête d'elle-même grâce à un IntersectionObserver.",
        ],
        code: {
          lang: 'js',
          caption: 'Video (simplifié) : une API chargée une fois, une seule vidéo à la fois.',
          source: `export default class Video {
  static instances = [];

  constructor(element) {
    this.element = element;
    this.videoId = element.dataset.videoId;
    Video.instances.push(this);
    Video.loadScript(); // l'API YouTube n'est chargée qu'une fois
  }

  initPlayer() {
    this.player = new YT.Player(this.element.querySelector('.js-video'), {
      videoId: this.videoId,
      playerVars: { rel: 0, autoplay: 1 },
      events: {
        onStateChange: (e) => {
          if (e.data === YT.PlayerState.PLAYING) Video.pauseAll(this);
        },
      },
    });
  }

  static pauseAll(current) {
    Video.instances.forEach((v) => v !== current && v.player?.pauseVideo());
  }
}`,
        },
        image: { src: `${IR}/04-video.webp`, alt: "Bloc « Argenteuil en action » : deux vignettes vidéo avec bouton de lecture, Elena et Gabriel, Virginie et Lutresse.", width: 1440, height: 720 },
      },
      {
        id: 'emplois',
        title: 'Un babillard d’emplois filtrable',
        text: [
          "Les offres d'emploi sont un type de contenu à part, chacune avec sa page, son employeur, sa municipalité et son secteur. La page Emploi les liste toutes, et le composant Filters les trie par secteur et par municipalité sans recharger la page.",
          "Chaque carte porte ses critères en attributs (data-filter-sector, data-filter-location). Au changement d'un filtre, la classe affiche les cartes correspondantes, met à jour le compteur à partir d'un gabarit fourni par le HTML (« {xx} offre{s} correspondante{s} ») et inscrit le nombre de résultats à côté de chaque option.",
        ],
        image: { src: `${IR}/05-emplois.webp`, alt: "Page Emploi : « 63 offres correspondantes », filtres Secteur d'emploi et Municipalité, puis une grille de cartes d'offres avec municipalité, poste et employeur.", width: 1440, height: 1150 },
      },
      {
        id: 'charte',
        title: 'Une charte qu’on signe en ligne',
        text: [
          "La page Nous sommes Argenteuil montre la souplesse du page builder : une grille de valeurs, une FAQ en accordéon pour la charte d'inclusion, puis un bloc formulaire pour la signer, et des vidéos de témoignages. Le formulaire est un bloc comme les autres, géré par une extension WordPress et habillé par le thème.",
        ],
        image: { src: `${IR}/06-charte.webp`, alt: "Page Nous sommes Argenteuil : la charte en accordéon sur fond vert, puis le formulaire « Signe la Charte d'engagement! » sur fond marine.", width: 1440, height: 1600, narrow: true },
      },
      {
        id: 'mobile',
        title: 'Responsive par bloc',
        text: [
          "Chaque bloc gère sa propre adaptation : le damier des rubriques passe en colonne, les biseaux gardent leur angle, les filtres d'emploi s'empilent. Une page composée par le client reste correcte sur téléphone, peu importe l'ordre des blocs.",
        ],
        phones: [
          { src: `${IR}/mobile-accueil.webp`, label: 'Accueil · hero', alt: "Accueil sur téléphone : logo Inspirer Respirer, titre « L'aventure d'une vie » et biseau marine." },
          { src: `${IR}/mobile-habiter.webp`, label: 'Habiter · hero --page', alt: "Page Habiter sur téléphone : photo d'enfants, badge Habiter et titre coupé en diagonale." },
          { src: `${IR}/mobile-emplois.webp`, label: 'Emploi · filtres', alt: "Page Emploi sur téléphone : titre « Ton prochain emploi » et filtres empilés." },
          { src: `${IR}/mobile-lachute.webp`, label: 'Lachute · municipalité', alt: "Page de la municipalité de Lachute sur téléphone : photo, titre et texte d'introduction." },
        ],
      },
    ],
    credits: [
      { role: 'Client', names: ["MRC d'Argenteuil"] },
      { role: 'Gestion et structure', names: ['[À confirmer]'] }, // TODO(Matthieu) : noms à confirmer
      { role: 'Programmation', names: ['Matthieu Parent'] },
      { role: 'Design', names: ['[À confirmer]'] }, // TODO(Matthieu) : nom à confirmer
    ],
  },
  {
    slug: 'synerlab',
    client: "MRC d'Argenteuil — Synerlab",
    lede: "Un site WordPress bâti comme un jeu de blocs : un page builder maison qui laisse le client composer chaque page, sur un front-end webpack en JavaScript orienté objet.",
    role: 'Gestion, structure et programmation',
    cover: { src: `${IMG}/01-accueil.webp`, alt: "Accueil de synerlab.ca : photo noir et blanc traversée d'un biseau vert-turquoise, titre « Envie de transformer l'économie? » et bouton « Déposer un projet ».", width: 1440, height: 900 },
    og: `${IMG}/og-bureau.jpg`,
    moments: [
      {
        id: 'mandat',
        title: 'Le mandat',
        text: [
          "Synerlab, le centre d'innovation en économie circulaire de la MRC d'Argenteuil, devait présenter trois offres très différentes — facilitation, incubation, laboratoire industriel — plus un parc industriel et un appel à projets en continu. Et l'équipe devait pouvoir faire évoluer ces pages sans repasser par un développeur.",
          "Mon rôle : la gestion et la structure du projet avec Bernard Imbert, puis toute la programmation. Le concept visuel venait du design ; mon travail, c'était de le transformer en système que le client peut manipuler.",
        ],
      },
      {
        id: 'page-builder',
        title: 'Un page builder maison',
        text: [
          "Plutôt que des gabarits figés, le thème expose une bibliothèque de blocs. Dans l'administration, le client empile les sections qu'il veut, dans l'ordre qu'il veut, et remplit leurs champs : aucune page n'est codée en dur.",
          "Dix blocs couvrent tout le site : hero, texte-image, cartes, blocs de couleur, icônes, texte simple, citation, partenaires, liste d'articles et formulaire. Chaque section partage la même enveloppe (o-section) ; le bloc ne s'occupe que de son contenu.",
        ],
        blueprint: {
          caption: "Composition réelle des pages en ligne, relevée dans le HTML : chaque page est une pile de blocs choisie par le client.",
          pages: [
            { name: 'Accueil', blocks: ['hero', 'text-image', 'cards', 'partners', 'partners'] },
            { name: 'Synercité', blocks: ['hero --no-shape', 'simple-text', 'hero --no-shape', 'simple-text', 'type_icons', 'type_icons'] },
            { name: 'Laboratoire', blocks: ['simple-text', 'blocs', 'hero --standalone'] },
            { name: 'À propos', blocks: ['text-image --reverse', 'quote', 'simple-text', 'hero --standalone', 'type_icons'] },
            { name: 'Déposer un projet', blocks: ['simple-text', 'quote', 'simple-text', 'form'] },
          ],
        },
      },
      {
        id: 'variantes',
        title: 'Des variantes plutôt que des gabarits',
        text: [
          "Un même bloc couvre plusieurs besoins grâce à des modificateurs : le hero devient bandeau autonome (--standalone) ou perd sa forme géométrique (--no-shape), le texte-image s'inverse (--reverse) ou fait chevaucher son média, une section bascule sur le fond de couleur de la marque (--quaterny).",
          "Résultat : peu de code, beaucoup de combinaisons. Les trois pages de services utilisent exactement la même recette — texte, blocs de couleur, bandeau — et restent pourtant distinctes.",
        ],
        image: { src: `${IMG}/02-axes.webp`, alt: "Le bloc « cartes » de l'accueil : trois tuiles photo avec un biseau de couleur.", width: 1440, height: 560 },
      },
      {
        id: 'webpack',
        title: 'Un front-end orienté objet',
        text: [
          "Le JavaScript est découpé en classes, regroupées par webpack avec le SCSS du thème. Une classe Main démarre l'application, puis une ComponentFactory parcourt le DOM : chaque élément qui porte un attribut data-component reçoit l'instance de la classe correspondante.",
          "Le PHP n'a donc qu'à écrire data-component=\"Carousel\" dans le gabarit d'un bloc pour lui donner un comportement. Ajouter un composant, c'est écrire une classe et l'inscrire dans la liste.",
        ],
        code: {
          lang: 'js',
          caption: 'ComponentFactory (simplifié) : le lien entre les blocs PHP et les classes JS.',
          source: `export default class ComponentFactory {
  constructor() {
    this.componentInstances = [];
    this.componentList = { Carousel, Header, Scrolly };
    this.init();
  }

  init() {
    document.querySelectorAll('[data-component]').forEach((element) => {
      const Component = this.componentList[element.dataset.component];
      if (Component) this.componentInstances.push(new Component(element));
    });
  }
}`,
        },
      },
      {
        id: 'composants',
        title: 'Des composants configurables par attributs',
        text: [
          "Chaque composant lit ses options dans le HTML. Header masque l'en-tête au défilement si data-auto-hide est présent et gère la navigation mobile. Scrolly révèle les éléments avec un IntersectionObserver, avec un décalage en cascade (data-stagger) ou en boucle (data-repeat). Carousel enveloppe Swiper.",
          "Les blocs restent ainsi déclaratifs : le client choisit un bloc, le gabarit pose les bons attributs, la classe fait le reste.",
        ],
        image: { src: `${IMG}/05-labo.webp`, alt: "Le bloc « blocs » de la page Laboratoire : quatre tuiles de couleur.", width: 1280, height: 460 },
      },
      {
        id: 'css',
        title: 'Une structure CSS prévisible',
        text: [
          "Le SCSS suit une nomenclature à préfixes : o- pour les objets de mise en page (o-section, o-wrapper), u- pour les utilitaires (u-hidden-visually), et BEM pour les blocs (card__media, text-image__content, partners__content--white).",
          "On sait en lisant une classe d'où elle vient et ce qu'elle a le droit de toucher : un bloc ne déborde jamais sur un autre, ce qui rend les combinaisons du page builder sûres.",
        ],
      },
      {
        id: 'formulaire',
        title: 'Un dépôt de projet intégré',
        text: [
          "Le formulaire d'appel à projets est lui-même un bloc : le client le place où il veut, sous les sections d'explication. Le formulaire est géré par une extension WordPress et habillé par le thème, pour que l'équipe modifie ses champs sans toucher au code.",
        ],
      },
      {
        id: 'mobile',
        title: 'Responsive par bloc',
        text: [
          "Chaque bloc gère sa propre adaptation : les cartes s'empilent, le texte-image passe en colonne, la navigation bascule dans le menu mobile du composant Header. Une page composée par le client reste donc correcte sur téléphone, peu importe l'ordre des blocs.",
        ],
        phones: [
          { src: `${IMG}/mobile-accueil.webp`, label: 'Accueil · text-image + cards', alt: "Accueil sur téléphone : le bloc texte-image passe en colonne et les cartes de services s'empilent." },
          { src: `${IMG}/mobile-laboratoire.webp`, label: 'Laboratoire · blocs', alt: "Page Laboratoire sur téléphone : les quatre blocs de couleur empilés." },
          { src: `${IMG}/mobile-synercite.webp`, label: 'Synercité · hero + simple-text', alt: "Page Synercité sur téléphone : hero photo, en-tête avec menu mobile, puis texte simple." },
          { src: `${IMG}/mobile-formulaire.webp`, label: 'Déposer un projet · form', alt: "Page Déposer un projet sur téléphone : coordonnées puis champs du formulaire." },
        ],
      },
    ],
    credits: [
      { role: 'Client', names: ["MRC d'Argenteuil — Synerlab"] },
      { role: 'Gestion et structure', names: ['Matthieu Parent', 'Bernard Imbert'] },
      { role: 'Programmation', names: ['Matthieu Parent'] },
      { role: 'Design', names: ['[À confirmer]'] }, // TODO(Matthieu) : nom à retrouver
    ],
  },
  {
    slug: 'mots-de-tete',
    client: "Cégep Édouard-Montpetit — avec l'Office québécois de la langue française",
    lede: "Donner un équivalent français aux mots anglais qu'on utilise faute de mieux en clinique : un lexique WordPress de quelque 600 termes, pensé pour être enrichi facilement et pour retrouver un mot en une frappe, en français comme en anglais.",
    role: 'Développement web',
    cover: { src: `${MDT}/01-accueil.webp`, alt: "Accueil de motsdetete.ca : champ « Quel terme cherchez-vous? » et quatre cartes de domaines colorées.", width: 1440, height: 1100 },
    og: `${MDT}/og.jpg`,
    moments: [
      {
        id: 'mandat',
        title: 'Le mandat',
        text: [
          "En lunetterie, en orthodontie, en hygiène dentaire et en prothèses dentaires, beaucoup de mots du métier circulent d'abord en anglais — bracket, retainer, tie-wing — souvent sans traduction connue. Le projet Le français, au cœur de nos ambitions, financé par l'Office québécois de la langue française, voulait leur donner un équivalent français fiable.",
          "C'est un gros projet multidisciplinaire : des professeures et professeurs de quatre départements ont rédigé les fiches, une terminologue et traductrice agréée les a révisées, et l'équipe de Techniques d'intégration multimédia a conçu et programmé le site. Résultat : quelque 600 concepts, chacun validé.",
        ],
      },
      {
        id: 'fiches',
        title: 'Un terme = une fiche structurée',
        text: [
          "Chaque terme est un contenu WordPress à part entière, avec des champs plutôt qu'un texte libre : catégorie grammaticale, équivalent anglais, domaine, définition, notes, sources, image, date de révision et réviseures.",
          "Les variantes sont séparées en trois listes — termes à privilégier, termes utilisés dans certains contextes, termes à éviter — que le gabarit affiche avec un code de couleur et d'icônes. Les rédactrices remplissent un formulaire ; la mise en page ne dépend jamais d'elles, et toutes les fiches restent cohérentes.",
        ],
        image: { src: `${MDT}/03-fiche.webp`, alt: "Fiche du terme « boîtier » : équivalent anglais bracket, domaine, définition, notes, puis termes à privilégier, à utiliser selon le contexte et à éviter.", width: 1440, height: 1700 },
      },
      {
        id: 'domaines',
        title: 'Les domaines comme colonne vertébrale',
        text: [
          "Les quatre domaines structurent tout : l'adresse de chaque fiche (/orthodontie/boitier/), la page de répertoire, les filtres de recherche et même la couleur. Une classe de thème par domaine (o-theme-orthodontie, par exemple) donne sa teinte à la carte, à la bannière et à l'étiquette, sans gabarit dupliqué.",
        ],
      },
      {
        id: 'rolodex',
        title: 'Le rolodex : retrouver un mot sans le chercher',
        text: [
          "Chaque page de domaine est générée à partir des fiches : les termes sont triés, regroupés par lettre, et affichés avec leur équivalent anglais juste en dessous. En tête, un index de A à Z sert de rolodex ; les lettres sans terme sont désactivées automatiquement, donc l'index reste juste quand on ajoute ou retire une fiche.",
          "Un composant Spy suit le défilement et allume la lettre en cours : on sait toujours où l'on est dans le lexique, même sur une longue liste.",
        ],
        image: { src: `${MDT}/02-rolodex.webp`, alt: "Page Orthodontie : bannière jaune, index alphabétique de A à Z avec les lettres vides grisées, puis les termes de la lettre A avec leur équivalent anglais.", width: 1440, height: 1300 },
      },
      {
        id: 'recherche',
        title: 'Une recherche bilingue',
        text: [
          "Un seul champ, en français ou en anglais. La recherche ignore les accents — « boitier » trouve « boîtier » — et parcourt les quatre domaines en même temps.",
          "Les résultats arrivent avec des filtres par domaine et leur nombre de résultats. Tout passe par l'adresse (?s=boitier&d=orthodontie) : une recherche filtrée se partage ou se met en favori, et fonctionne sans JavaScript.",
        ],
        image: { src: `${MDT}/04-recherche.webp`, alt: "Résultats de recherche pour « boitier » : filtres Tous les domaines (12), Orthodontie (7), Prothèses dentaires (1), etc., puis des cartes de termes avec photo, équivalent anglais et définition.", width: 1440, height: 1560 },
      },
      {
        id: 'composants',
        title: 'Les mêmes fondations orientées objet',
        text: [
          "Le front-end reprend l'architecture de mes projets WordPress : des classes JavaScript regroupées par webpack, instanciées par une fabrique selon l'attribut data-component. Chaque page n'active que ce dont elle a besoin.",
          "La version en ligne est une compilation de production avec empreinte dans le nom du fichier (scripts.d4eea29d.js), ce qui permet une mise en cache longue sans risque de servir un vieux script.",
        ],
        blueprint: {
          caption: "Composants JavaScript réellement actifs sur chaque type de page (attribut data-component relevé dans le HTML).",
          pages: [
            { name: 'Partout', blocks: ['Header', 'Scrolly', 'Modal', 'Snackbar'] },
            { name: 'Domaine', blocks: ['Spy', 'Share', 'Print'] },
            { name: 'Fiche', blocks: ['Accordion', 'Share', 'Print'] },
            { name: 'Recherche', blocks: ['Form'] },
          ],
        },
      },
      {
        id: 'contribution',
        title: 'Un lexique qui peut grandir',
        text: [
          "Le vocabulaire n'est pas figé. Deux formulaires, ouverts dans une fenêtre modale, permettent de suggérer un nouveau terme ou une modification à une fiche ; une notification confirme l'envoi. Les suggestions arrivent à l'équipe, qui les fait réviser avant de les publier comme n'importe quelle fiche.",
          "Chaque fiche s'imprime proprement (composant Print) et se partage (Share) : utile en classe comme en clinique.",
        ],
      },
      {
        id: 'mobile',
        title: 'En clinique, sur le téléphone',
        text: [
          "On cherche souvent un mot sur le moment, téléphone en main. Le rolodex se fait défiler horizontalement, les fiches gardent leur hiérarchie, et la recherche reste accessible depuis l'en-tête sur toutes les pages.",
        ],
        phones: [
          { src: `${MDT}/mobile-accueil.webp`, label: 'Accueil · recherche + domaines', alt: "Accueil sur téléphone : champ de recherche puis cartes des domaines en deux colonnes." },
          { src: `${MDT}/mobile-rolodex.webp`, label: 'Domaine · rolodex A–Z', alt: "Page Orthodontie sur téléphone : index alphabétique défilant et liste des termes." },
          { src: `${MDT}/mobile-fiche.webp`, label: 'Fiche · boîtier', alt: "Fiche du terme boîtier sur téléphone." },
          { src: `${MDT}/mobile-recherche.webp`, label: 'Recherche · filtres', alt: "Résultats de recherche sur téléphone avec les filtres par domaine." },
        ],
      },
    ],
    credits: [
      { role: 'Réalisation', names: ['Cégep Édouard-Montpetit — projet « Le français, au cœur de nos ambitions »'] },
      { role: 'Contribution financière', names: ['Office québécois de la langue française'] },
      { role: 'Coordination du projet', names: ['Jean-Sébastien Ménard'] },
      { role: 'Révision terminologique', names: ['Antonie Pluk, terminologue et traductrice agréée'] },
      { role: 'Rédaction — Lunetterie et contactologie', names: ['Sophie Bellavance'] },
      { role: 'Rédaction — Orthodontie', names: ['Martine Castonguay', 'Chantal Guinta', 'Chantal Lacoursière'] },
      { role: 'Rédaction — Produits et instruments dentaires', names: ['Monique Delisle'] },
      { role: 'Rédaction — Prothèses dentaires', names: ['Émilie Brûlé', 'Guillaume Tanguay', 'Hélène Fillion'] },
      { role: 'Conception UI/UX', names: ['Christian Dugas'] },
      { role: 'Développement web', names: ['Jean-François Leblanc', 'Matthieu Parent'] },
      { role: 'Photographie et retouche', names: ['Franck-Richard Théronier'] },
      { role: 'Gestion administrative', names: ['Jacinthe Noreau'] },
      { role: 'Communications', names: ['Inès Sanchez'] },
    ],
  },
];

export const ETUDES: ReadonlyArray<{ projet: Projet; etude: Etude }> = ETUDES_DATA.flatMap((etude) => {
  const projet = PROJETS.find((p) => p.id === etude.slug);
  return projet ? [{ projet, etude }] : [];
});
