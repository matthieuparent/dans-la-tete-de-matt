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
  /** Vidéo YouTube, chargée seulement au clic (affiche locale, youtube-nocookie). */
  readonly video?: { readonly youtubeId: string; readonly title: string; readonly poster: string; readonly caption?: string };
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
const TP = '/projets/hub-tim-plus';
const BCF = '/projets/bcf';
const EST = '/projets/esterel';

const ETUDES_DATA: readonly Etude[] = [
  {
    slug: 'bcf',
    client: 'BCF Avocats d’affaires, avec lg2',
    lede: "La refonte du site d'un cabinet de plus de 500 personnes, réalisée chez lg2 : une mise en page en deux panneaux dont l'image change au fil de la lecture, et un front-end TypeScript en modules, pensé pour vivre dans Sitecore.",
    role: 'Développement front-end',
    cover: { src: `${BCF}/01-accueil.webp`, alt: "Accueil de bcf.ca : à gauche, le titre « Saisir l'instant. Définir le futur. » et les dernières publications ; à droite, une photo d'architecture aux lignes courbes.", width: 1440, height: 900 },
    og: `${BCF}/og.jpg`,
    moments: [
      {
        id: 'mandat',
        title: 'Le mandat',
        text: [
          "BCF est un cabinet d'avocats d'affaires de Montréal et de Québec. En 2019, lg2 a signé sa nouvelle campagne et son nouveau site, avec une signature qui donne le ton : « Saisir l'instant. Définir le futur. » Le site devait présenter des centaines de professionnels, six grandes expertises, des industries, des produits signatures et une veille juridique, l'intelligence d'affaires.",
          "Le contenu est géré dans Sitecore, développé côté serveur par Nexio. Chez lg2, l'équipe front-end livrait les gabarits, les styles et tout le JavaScript. J'y ai travaillé comme développeur front-end. L'expérience utilisateur, elle, est signée par un autre Mathieu Parent (avec un seul t).",
          "Le site a depuis été remplacé : les captures de cette page viennent de la Wayback Machine, en janvier 2024.",
        ],
      },
      {
        id: 'panneaux',
        title: 'Deux panneaux, une image qui suit la lecture',
        text: [
          "La mise en page repose sur une idée simple : à gauche, le contenu défile ; à droite, un grand panneau d'image reste en place. Quand on change de section, l'image change aussi, en fondu. Le site garde ainsi une présence visuelle forte sans jamais couper le texte.",
          "Chaque section déclare son image dans un attribut (data-image-slide-notifier). Un IntersectionObserver repère la section qui arrive en haut de l'écran ; la nouvelle image est préchargée, puis posée par-dessus l'ancienne avec un fondu GSAP. Sur mobile, le module se désactive et les images reprennent leur place dans le flux.",
        ],
        image: { src: `${BCF}/02-chiffres.webp`, alt: "Section bleue de l'accueil : 06 expertises majeures et 75 spécialités à gauche, 25 ans d'expérience à droite, sur une photo de tours de verre teintée en bleu.", width: 1440, height: 900 },
        code: {
          lang: 'ts',
          caption: "ImageSlide (simplifié) : l'image de droite suit la section lue.",
          source: `export class ImageSlide extends Module {
  private _observer = new IntersectionObserver(this._onReached, {
    rootMargin: '-120px 0px 60% 0px',
  });
  private _current = '';

  public onGroupDesktop(): void {
    document.querySelectorAll('[data-image-slide-notifier]')
      .forEach((el) => this._observer.observe(el));
  }

  public onGroupMobile(): void {
    this._observer.disconnect();
  }

  @autobind
  private _onReached(entries: IntersectionObserverEntry[]): void {
    entries.filter((e) => e.isIntersecting).forEach((e) =>
      this._changeBackground(e.target.getAttribute('data-image-slide-notifier')));
  }

  private _changeBackground(src: string): void {
    if (src === this._current) return;
    this._current = src;
    const img = new Image();
    img.onload = () => { /* fondu GSAP de la nouvelle image */ };
    img.src = src; // préchargée avant l'affichage
  }
}`,
        },
      },
      {
        id: 'modules',
        title: 'Un front-end en modules TypeScript',
        text: [
          "Tout le JavaScript est écrit en TypeScript orienté objet. Une ModuleFactory parcourt la page et instancie la bonne classe pour chaque élément portant un attribut data-module ; un même élément peut en déclarer plusieurs, séparés par une barre verticale. Dix-sept modules couvrent le site : navigation, carrousels, recherche, formulaires, superpositions, vidéos, infobulles, consentement…",
          "Chaque module hérite d'une classe Module commune, qui lui fournit son IntersectionObserver et des méthodes appelées aux changements de point de rupture (onGroupDesktop, onGroupMobile). Les méthodes liées aux événements utilisent un décorateur @autobind plutôt que des bind() éparpillés.",
          "Ce découpage comptait beaucoup dans un CMS comme Sitecore : les rédacteurs composent les pages, et chaque bloc arrive avec son comportement, peu importe où il est placé.",
        ],
      },
      {
        id: 'sitecore',
        title: 'Penser aux rédacteurs',
        text: [
          "Un site Sitecore se modifie dans un éditeur visuel, directement sur la page. Les animations qui cachent un élément avant de le révéler y deviennent vite un problème : on ne peut pas modifier un texte invisible. Les modules vérifient donc le contexte et, en mode édition, affichent tout de suite leur contenu final.",
          "Même logique pour la recherche, propulsée par Coveo : quand de nouveaux résultats s'affichent, la fabrique relance la création des modules dans la zone mise à jour, pour que les cartes chargées dynamiquement se comportent comme les autres.",
        ],
        image: { src: `${BCF}/03-services.webp`, alt: "Page Services : la liste des expertises (droit des affaires, financement corporatif, fiscalité, propriété intellectuelle…) à côté de celle des industries, avec l'en-tête réduit qui affiche le fil d'Ariane et les liens de partage.", width: 1440, height: 900 },
      },
      {
        id: 'cta',
        title: 'Des appels à l’action dessinés',
        text: [
          "La nouvelle identité de BCF utilise des motifs de points et de cercles concentriques. On les retrouve dans les appels à l'action : chaque lien principal porte un petit motif SVG, en points ou en cercles, qui se dessine quand il entre à l'écran.",
          "Les tuiles des produits signatures reprennent les mêmes motifs, à plus grande échelle. Le module Cta, lui, signale aussi chaque clic au module de suivi : recherche, équipe, veille juridique et demandes de contact remontent comme des événements distincts dans l'analytique.",
        ],
        image: { src: `${BCF}/04-produits.webp`, alt: "Tuiles bleues des produits signatures : BCF Imagine avec un motif de points, BCF Avantage avec des cercles concentriques, puis Immigration et mobilité d'affaires et BCF Global.", width: 1440, height: 900 },
      },
      {
        id: 'contenus',
        title: 'Des pages d’expertise et des contacts clés',
        text: [
          "Chaque expertise a sa page : un texte d'introduction, ses spécialités et un carrousel des contacts clés, avec le titre de chaque professionnel au-dessus de sa photo. Les listes plus longues (publications, membres de l'équipe) se complètent avec un bouton « Voir plus ».",
          "Ce bouton est d'abord un vrai lien vers la page suivante. Avec JavaScript, le module récupère cette page, en extrait seulement les nouvelles cartes, les ajoute à la liste et les fait apparaître en cascade. Sans JavaScript, le lien fonctionne quand même.",
        ],
        image: { src: `${BCF}/06-contacts.webp`, alt: "Page Propriété intellectuelle : carrousel « Contacts clés » avec trois professionnels en photo, leur titre au-dessus et leur nom en dessous.", width: 1440, height: 900 },
      },
      {
        id: 'logo',
        title: 'Une signature animée, une fois par jour',
        text: [
          "À la première visite, le logo de BCF s'anime : ses formes apparaissent une à une, puis la signature se dessine et s'efface. Un témoin retient que l'animation a été vue pendant une journée, pour ne pas la rejouer à chaque page. Et elle ne s'affiche que si le visiteur a accepté les témoins fonctionnels.",
        ],
      },
      {
        id: 'mobile',
        title: 'Sur téléphone',
        text: [
          "Sur téléphone, le panneau d'image disparaît : les sections s'empilent, les chiffres clés passent en carrousel et la navigation se replie derrière trois boutons (appel, recherche, menu).",
        ],
        phones: [
          { src: `${BCF}/mobile-accueil.webp`, label: 'Accueil', alt: "Accueil sur téléphone : titre « Saisir l'instant. Définir le futur. » et première publication." },
          { src: `${BCF}/mobile-chiffres.webp`, label: 'Chiffres clés', alt: "Section bleue sur téléphone : 06 expertises majeures, 75 spécialités et lien Voir les expertises." },
          { src: `${BCF}/mobile-services.webp`, label: 'Services', alt: "Liste des expertises sur téléphone." },
          { src: `${BCF}/mobile-expertise.webp`, label: 'Expertise', alt: "Page Propriété intellectuelle sur téléphone : titre et texte d'introduction." },
        ],
      },
    ],
    credits: [
      { role: 'Client', names: ['BCF Avocats d’affaires'] },
      { role: 'Agence', names: ['lg2'] },
      { role: 'Direction de création numérique', names: ['Nicolas Baldovini'] },
      { role: 'Expérience utilisateur', names: ['Mathieu Parent'] },
      { role: 'Chargé de projet, site web', names: ['Nicolas Francoeur'] },
      { role: 'Production graphique numérique', names: ['Michel Bélisle', 'Mathieu Schetagne'] },
      { role: 'Développement front-end', names: ['François Perreault (lead)', 'Mathieu Lavoie', 'Jean-François Leblanc', 'Matthieu Parent'] },
      { role: 'Développement Sitecore et back-end', names: ['Nexio'] },
    ],
  },
  {
    slug: 'inspirer-respirer',
    client: "MRC d'Argenteuil",
    lede: "Le site d'attractivité d'une région de neuf municipalités : un page builder WordPress où chaque bloc choisit ses couleurs et se raccorde au précédent par un biseau, sur un front-end webpack en JavaScript orienté objet.",
    role: 'Gestion, structure et programmation',
    cover: { src: `${IR}/01-accueil.webp`, alt: "Accueil d'inspirer-respirer.com : paysage de collines, titre « L'aventure d'une vie », puis une section bleu marine coupée en biseau avec une vidéo et le texte « Ah! Te voilà! ».", width: 1440, height: 1000 },
    og: `${IR}/og.jpg`,
    moments: [
      {
        id: 'mandat',
        title: 'Le mandat',
        text: [
          "Inspirer. Respirer. est la campagne d'attractivité de la MRC d'Argenteuil : convaincre des familles, des travailleurs et des entrepreneurs de s'installer dans l'une de ses neuf municipalités. Le site devait porter quatre grandes rubriques (habiter, vivre, travailler, entreprendre), une page par municipalité, un blogue, des vidéos, un babillard d'emplois et une charte d'inclusion à signer.",
          "Beaucoup de pages, beaucoup de contenus différents, et une équipe qui allait les faire vivre pendant des années. Mon travail : la gestion et la structure du projet avec Bernard Imbert, puis toute la programmation, pour que le client puisse composer et enrichir ces pages lui-même. Le design est de Christine Martel.",
        ],
      },
      {
        id: 'page-builder',
        title: 'Quinze blocs pour tout le site',
        text: [
          "Comme sur mes autres projets WordPress, aucune page n'est codée en dur : le thème expose une bibliothèque de blocs que le client empile dans l'administration. Ici, elle en compte une quinzaine : hero, texte, texte-image, carrousel, citation, liste, vignette, FAQ, formulaire, grille, galerie, blogue, vidéos, article et emplois.",
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
          "L'identité joue sur une palette vive : marine, vert, cyan, bleu pâle, rose, jaune, orange. Chaque rubrique a sa couleur, et chaque bloc expose trois réglages indépendants dans l'administration : le fond de la section, la couleur du contenu et celle des accents.",
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
      { role: 'Gestion et structure', names: ['Matthieu Parent', 'Bernard Imbert'] },
      { role: 'Programmation', names: ['Matthieu Parent'] },
      { role: 'Design', names: ['Christine Martel'] },
    ],
  },
  {
    slug: 'esterel',
    client: 'Ville d’Estérel',
    lede: "Le site d'une petite ville des Laurentides, où les citoyens viennent surtout chercher une information précise : un avis public, une séance du conseil, un service en ligne. Un thème WordPress sur mesure, bâti sur le même socle de blocs que mes autres projets.",
    role: 'Gestion, structure et programmation',
    cover: { src: `${EST}/01-accueil.webp`, alt: "Accueil de villedesterel.com : en-tête avec les armoiries et six rubriques, grand carrousel annonçant l'enregistrement de la dernière séance du conseil, puis une barre d'accès rapides en icônes.", width: 1440, height: 900 },
    og: `${EST}/og.jpg`,
    moments: [
      {
        id: 'mandat',
        title: 'Le mandat',
        text: [
          "Un site municipal n'est pas un site qu'on visite pour le plaisir. On y vient pour une raison : trouver le prochain avis public, revoir la dernière séance du conseil, payer ses taxes, réserver un terrain de tennis. Le site de la Ville d'Estérel devait donc d'abord être clair, avec des dizaines de pages réparties en cinq grandes rubriques.",
          "Il devait aussi rester simple à alimenter pour l'équipe de la Ville, qui publie régulièrement des actualités, des avis et des documents. Comme pour Inspirer. Respirer. et Synerlab, j'ai assuré la gestion et la structure du projet avec Bernard Imbert, puis toute la programmation, sur un design de Christine Martel.",
        ],
      },
      {
        id: 'menu',
        title: 'Cinq rubriques, un mégamenu',
        text: [
          "En plus de l'accueil, tout le contenu se range sous cinq rubriques : la ville, les services aux citoyens, découvrir Estérel, documents et publications, et nous joindre. Au survol d'une rubrique, ses sous-pages se déploient dans un bandeau sous l'en-tête ; on voit d'un coup d'œil tout ce qu'elle contient.",
          "Sur téléphone, le même menu devient une liste qu'on ouvre au toucher : le composant SubNav gère les deux comportements selon que le menu mobile est ouvert ou non. Et l'en-tête se cache quand on descend dans une page, puis revient dès qu'on remonte.",
        ],
        image: { src: `${EST}/02-menu.webp`, alt: "Mégamenu ouvert sur la rubrique Les Services aux citoyens : un bandeau gris-bleu liste Administration et finances, Sécurité publique, Urbanisme, Environnement, Travaux publics et Loisirs et culture.", width: 1440, height: 900 },
      },
      {
        id: 'acces',
        title: 'Les services en un clic',
        text: [
          "Juste sous le carrousel d'accueil, une barre d'icônes mène directement aux services les plus demandés : le portail de nouvelles et de taxes, les demandes en ligne, la cartographie et le rôle d'évaluation, le calendrier des activités, les séances du conseil et la collecte des matières résiduelles.",
          "Plus bas, deux carrousels présentent les actualités et les nouvelles en environnement, trois cartes à la fois. Le carrousel d'accueil, lui, défile tout seul toutes les sept secondes et s'arrête quand la souris passe dessus. Le même composant Carousel couvre tous ces cas : un attribut data-carousel-type choisit la configuration Swiper.",
        ],
        image: { src: `${EST}/03-liens.webp`, alt: "Barre d'accès rapides en icônes (Voilà!, Demandes en ligne, Cartographie, Calendrier des activités, Séances du Conseil, Collecte des matières résiduelles), puis le carrousel Actualités en trois cartes.", width: 1440, height: 900 },
      },
      {
        id: 'blocs',
        title: 'Le même socle de blocs',
        text: [
          "Le thème reprend l'architecture de mes autres sites WordPress : des pages composées de blocs (hero, texte, liste de sous-pages, FAQ, liens, blogue), un front-end regroupé par webpack, et une fabrique qui instancie la bonne classe JavaScript pour chaque élément portant un attribut data-component.",
          "Sept composants suffisent ici : Header, SubNav, Search, Carousel, Accordion, Video et Scrolly. Les pages de rubrique, par exemple, se résument souvent à un hero et à un bloc qui présente leurs sous-pages en tuiles photo.",
        ],
        blueprint: {
          caption: 'Composition réelle de quelques pages en ligne, relevée dans le HTML.',
          pages: [
            { name: 'Accueil', blocks: ['s-hero --carousel', 's-links', 's-blog --carousel', 's-blog --carousel'] },
            { name: 'Découvrir Estérel', blocks: ['s-hero', 's-title', 's-child-list'] },
            { name: 'Avis publics', blocks: ['s-hero', 's-text', 's-faq'] },
            { name: 'Notre équipe', blocks: ['s-hero', 's-text', 's-faq', 's-text', 's-hero'] },
          ],
        },
        image: { src: `${EST}/04-sous-pages.webp`, alt: "Bloc de sous-pages de la rubrique Découvrir Estérel : tuiles photo Histoire d'Estérel, Bienvenue à Estérel, Citoyens d'honneur et Galerie photos.", width: 1440, height: 900 },
      },
      {
        id: 'avis',
        title: 'Des avis publics faciles à retrouver',
        text: [
          "Depuis un règlement adopté par la Ville, les avis publics sont publiés sur le site plutôt que dans un journal local. Ils devaient donc être faciles à trouver, même après plusieurs années.",
          "Ils sont classés par année dans un accordéon : on ouvre seulement l'année qui nous intéresse. Le composant Accordion anime la hauteur avec GSAP, et un clic sur un lien à l'intérieur ne referme pas le panneau par accident. Les procès-verbaux, les règlements et les rapports financiers suivent le même modèle.",
        ],
        image: { src: `${EST}/05-avis.webp`, alt: "Page Avis publics : accordéon ouvert sur l'année 2026, avec une longue liste de liens vers des avis de dérogation mineure, de règlements et de promulgation.", width: 1440, height: 900 },
      },
      {
        id: 'mobile',
        title: 'Sur téléphone',
        text: [
          "Sur téléphone, le menu passe derrière un bouton, les sous-menus s'ouvrent au toucher, les carrousels affichent une carte à la fois et les accordéons gardent toute la largeur pour les longs titres d'avis.",
        ],
        phones: [
          { src: `${EST}/mobile-accueil.webp`, label: 'Accueil', alt: "Accueil sur téléphone : armoiries, menu et carrousel annonçant la dernière séance du conseil." },
          { src: `${EST}/mobile-menu.webp`, label: 'Menu', alt: "Menu ouvert sur téléphone, avec la rubrique Les Services aux citoyens dépliée." },
          { src: `${EST}/mobile-avis.webp`, label: 'Avis publics', alt: "En-tête de la page Avis publics sur téléphone, sur une photo de lac au lever du jour." },
          { src: `${EST}/mobile-accordeon.webp`, label: 'Accordéon', alt: "Accordéon des avis publics de 2026 ouvert sur téléphone." },
        ],
      },
    ],
    credits: [
      { role: 'Client', names: ['Ville d’Estérel'] },
      { role: 'Gestion et structure', names: ['Matthieu Parent', 'Bernard Imbert'] },
      { role: 'Programmation', names: ['Matthieu Parent'] },
      { role: 'Design', names: ['Christine Martel'] },
    ],
  },
  {
    slug: 'synerlab',
    client: "MRC d'Argenteuil · Synerlab",
    lede: "Un site WordPress bâti comme un jeu de blocs : un page builder maison qui laisse le client composer chaque page, sur un front-end webpack en JavaScript orienté objet.",
    role: 'Gestion, structure et programmation',
    cover: { src: `${IMG}/01-accueil.webp`, alt: "Accueil de synerlab.ca : photo noir et blanc traversée d'un biseau vert-turquoise, titre « Envie de transformer l'économie? » et bouton « Déposer un projet ».", width: 1440, height: 900 },
    og: `${IMG}/og-bureau.jpg`,
    moments: [
      {
        id: 'mandat',
        title: 'Le mandat',
        text: [
          "Synerlab, le centre d'innovation en économie circulaire de la MRC d'Argenteuil, devait présenter trois offres très différentes (facilitation, incubation, laboratoire industriel), plus un parc industriel et un appel à projets en continu. Et l'équipe devait pouvoir faire évoluer ces pages sans repasser par un développeur.",
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
          "Résultat : peu de code, beaucoup de combinaisons. Les trois pages de services utilisent exactement la même recette (texte, blocs de couleur, bandeau) et restent pourtant distinctes.",
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
      { role: 'Client', names: ["MRC d'Argenteuil · Synerlab"] },
      { role: 'Gestion et structure', names: ['Matthieu Parent', 'Bernard Imbert'] },
      { role: 'Programmation', names: ['Matthieu Parent'] },
      { role: 'Design', names: ['Christine Martel'] },
    ],
  },
  {
    slug: 'mots-de-tete',
    client: "Cégep Édouard-Montpetit, avec l'Office québécois de la langue française",
    lede: "Donner un équivalent français aux mots anglais qu'on utilise faute de mieux en clinique : un lexique WordPress de quelque 600 termes, pensé pour être enrichi facilement et pour retrouver un mot en une frappe, en français comme en anglais.",
    role: 'Développement web',
    cover: { src: `${MDT}/01-accueil.webp`, alt: "Accueil de motsdetete.ca : champ « Quel terme cherchez-vous? » et quatre cartes de domaines colorées.", width: 1440, height: 1100 },
    og: `${MDT}/og.jpg`,
    moments: [
      {
        id: 'mandat',
        title: 'Le mandat',
        text: [
          "En lunetterie, en orthodontie, en hygiène dentaire et en prothèses dentaires, beaucoup de mots du métier circulent d'abord en anglais (bracket, retainer, tie-wing), souvent sans traduction connue. Le projet Le français, au cœur de nos ambitions, financé par l'Office québécois de la langue française, voulait leur donner un équivalent français fiable.",
          "C'est un gros projet multidisciplinaire : des professeures et professeurs de quatre départements ont rédigé les fiches, une terminologue et traductrice agréée les a révisées, et l'équipe de Techniques d'intégration multimédia a conçu et programmé le site. Résultat : quelque 600 concepts, chacun validé.",
        ],
      },
      {
        id: 'fiches',
        title: 'Un terme = une fiche structurée',
        text: [
          "Chaque terme est un contenu WordPress à part entière, avec des champs plutôt qu'un texte libre : catégorie grammaticale, équivalent anglais, domaine, définition, notes, sources, image, date de révision et réviseures.",
          "Les variantes sont séparées en trois listes (termes à privilégier, termes utilisés dans certains contextes, termes à éviter) que le gabarit affiche avec un code de couleur et d'icônes. Les rédactrices remplissent un formulaire ; la mise en page ne dépend jamais d'elles, et toutes les fiches restent cohérentes.",
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
          "Un seul champ, en français ou en anglais. La recherche ignore les accents (« boitier » trouve « boîtier ») et parcourt les quatre domaines en même temps.",
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
      { role: 'Réalisation', names: ['Cégep Édouard-Montpetit, projet « Le français, au cœur de nos ambitions »'] },
      { role: 'Contribution financière', names: ['Office québécois de la langue française'] },
      { role: 'Coordination du projet', names: ['Jean-Sébastien Ménard'] },
      { role: 'Révision terminologique', names: ['Antonie Pluk, terminologue et traductrice agréée'] },
      { role: 'Rédaction · Lunetterie et contactologie', names: ['Sophie Bellavance'] },
      { role: 'Rédaction · Orthodontie', names: ['Martine Castonguay', 'Chantal Guinta', 'Chantal Lacoursière'] },
      { role: 'Rédaction · Produits et instruments dentaires', names: ['Monique Delisle'] },
      { role: 'Rédaction · Prothèses dentaires', names: ['Émilie Brûlé', 'Guillaume Tanguay', 'Hélène Fillion'] },
      { role: 'Conception UI/UX', names: ['Christian Dugas'] },
      { role: 'Développement web', names: ['Jean-François Leblanc', 'Matthieu Parent'] },
      { role: 'Photographie et retouche', names: ['Franck-Richard Théronier'] },
      { role: 'Gestion administrative', names: ['Jacinthe Noreau'] },
      { role: 'Communications', names: ['Inès Sanchez'] },
    ],
  },
  {
    slug: 'hub-tim-plus',
    client: 'Département TIM, Cégep Édouard-Montpetit',
    lede: "Une page unique pour expliquer TIM+, la nouvelle certification du département : six blocs d'activités, trois badges et un classement des étudiants, le tout animé au défilement pour donner envie de s'inscrire.",
    role: 'Programmation',
    cover: { src: `${TP}/01-accueil.webp`, alt: "Haut de la page TIM+ : fond noir avec un halo coloré, pastille « Nouvelle » et titre « La certification TIM+ donne un plus à ton parcours collégial. »", width: 1440, height: 900 },
    og: `${TP}/og.jpg`,
    moments: [
      {
        id: 'mandat',
        title: 'Le mandat',
        text: [
          "TIM+ est un nouveau programme de notre département : en participant à des activités en dehors des cours, les étudiants accumulent des points et peuvent obtenir la certification PLUS+, une mention officielle ajoutée à leur DEC. Encore fallait-il qu'ils comprennent comment ça fonctionne, et qu'ils aient envie d'embarquer.",
          "La page vit dans le TIM HUB, le site du département. Elle devait tout expliquer en un seul défilement (le principe, les étapes, les activités, les paliers, la cérémonie) et rester assez vivante pour qu'un étudiant de 18 ans se rende jusqu'en bas.",
        ],
        image: { src: `${TP}/02-reconnaissance.webp`, alt: "Section violette « Une reconnaissance officielle qui te démarque », avec un bouton « Je participe » et une étudiante souriante devant un éclat jaune.", width: 1440, height: 800 },
      },
      {
        id: 'video',
        title: 'Une vidéo pour le lancement',
        text: [
          "Pour le lancement du programme, à l'automne 2025, on a aussi monté une courte vidéo de présentation, diffusée sur la chaîne YouTube du département. Elle reprend l'identité de la page : le violet, la croix jaune et verte, et le slogan « Engage-toi dans la réussite ».",
        ],
        video: { youtubeId: 'yEZZJGedPhI', title: 'TIM+', poster: `${TP}/video-affiche.webp`, caption: 'Vidéo de lancement de TIM+. Montage : Caroline Duplantis.' },
      },
      {
        id: 'structure',
        title: 'Une page, sept sections',
        text: [
          "Plutôt qu'un règlement à lire, la page raconte le programme dans l'ordre où un étudiant se pose les questions : c'est quoi, comment ça marche, qu'est-ce que je peux faire, qu'est-ce que ça me donne, où j'en suis, et à quoi ça sert après.",
          "Le fonctionnement, lui, tient en cinq étapes numérotées : s'inscrire, participer, gagner des points, les cumuler tout au long des études, puis obtenir la certification à 500 points.",
          "Chaque section a sa couleur (noir, violet, vert, jaune) pour que le passage de l'une à l'autre se sente au défilement, même sur téléphone.",
        ],
        blueprint: {
          caption: "L'ordre des sections de la page en ligne.",
          pages: [
            { name: 'TIM+', blocks: ['hero', 'intro', 'how · 5 étapes', 'blocs · 6 cartes', 'badges · 3 paliers', 'leaderboard', 'ceremony'] },
          ],
        },
      },
      {
        id: 'blocs',
        title: "Six types d'activités",
        text: [
          "Pour accumuler des points, les étudiants choisissent parmi six blocs d'activités : la réussite académique, l'enrichissement disciplinaire, les activités socioculturelles, l'engagement étudiant, les saines habitudes de vie, et l'engagement social et environnemental. Chaque bloc a un nom accrocheur (Objectif Réussite, Boost créatif, Vie TIM à fond…), quelques exemples concrets et un maximum de points.",
          "Ce plafond oblige à varier : on ne devient pas certifié en ne faisant qu'une seule sorte d'activité. Les cartes présentent donc les six blocs côte à côte, pour qu'un étudiant voie d'un coup d'œil où il peut encore aller chercher des points.",
          "Les cartes réagissent à la souris : elles s'inclinent légèrement vers le curseur et reviennent en place avec un petit rebond. Un détail, mais il donne envie de les survoler une à une, donc de les lire.",
        ],
        image: { src: `${TP}/04-blocs.webp`, alt: "Section verte « 6 blocs d'activités qui pourraient t'intéresser » : cartes blanches Objectif Réussite, Boost créatif et Culture et passion, avec leurs activités et leur maximum de points.", width: 1440, height: 900 },
      },
      {
        id: 'animations',
        title: 'Des animations déclarées dans le HTML',
        text: [
          "Le thème réutilise l'architecture de mes projets WordPress : des classes regroupées par webpack, et une fabrique qui instancie la bonne classe pour chaque élément portant un attribut data-component. Ici, quatre composants suffisent : Scroller, Animator, CardThreeD et ListExpend.",
          "Animator lit le type d'animation dans un attribut data-anim (letterReveal, rotate, scale, flipChilds, scaleChilds) et prépare deux tweens GSAP, une entrée et une sortie. Un IntersectionObserver les déclenche quand l'élément entre ou sort de l'écran. Pour animer un nouvel élément, on ajoute deux attributs dans le gabarit, sans toucher au JavaScript.",
          "Scroller, lui, installe ScrollSmoother pour un défilement adouci et pilote les effets liés à la position : les lignes du titre d'accueil, découpées par SplitText, glissent en sens opposés à mesure qu'on descend.",
        ],
        code: {
          lang: 'js',
          caption: 'Animator (simplifié) : une entrée, une sortie, un observateur.',
          source: `export default class Animator {
  constructor(element) {
    this.element = element;
    this.anim = {};
    document.fonts.ready.then(() => this.init());
  }

  init() {
    // data-anim="flipChilds" → this.initFlipChilds()
    this[\`init\${capitalize(this.element.dataset.anim)}\`]();
    new IntersectionObserver(([entry]) => {
      entry.isIntersecting ? this.anim.in.restart() : this.anim.out.restart();
    }).observe(this.element);
  }

  initFlipChilds() {
    const items = this.element.children;
    gsap.set(items, { transformOrigin: 'top', rotationX: 90, autoAlpha: 0, y: 200 });
    this.anim.in = gsap.to(items, {
      rotationX: 0, autoAlpha: 1, y: 0,
      duration: 1.5, stagger: 0.2, ease: 'expo.out', paused: true,
    });
    this.anim.out = gsap.to(items, { rotationX: 90, autoAlpha: 0, duration: 0, paused: true });
  }
}`,
        },
      },
      {
        id: 'badges',
        title: 'Trois paliers, trois badges',
        text: [
          "Pour rendre la progression concrète, chaque palier a son badge : Initié.e à 200 points, Ambassadeur.drice à 350, Certifié.e TIM+ à 500. Les pastilles, avec leurs autocollants, s'inclinent vers la souris comme les cartes des blocs.",
        ],
        image: { src: `${TP}/05-badges.webp`, alt: "Section « Ok, mais ça donne quoi au juste la certification ? » : trois pastilles de 200, 350 et 500 points, avec les autocollants Initié.e, Ambassadeur.drice et TIM+.", width: 1440, height: 900 },
      },
      {
        id: 'classement',
        title: 'Un classement pour jouer le jeu',
        text: [
          "Le cœur ludique de la page, c'est le classement. Les points des étudiants sont récupérés de la plateforme du cégep, puis affichés sous forme de palmarès : le rang, les points et le statut atteint, avec une date de dernière mise à jour. Le premier porte l'autocollant du chat ULTIM.",
          "Seuls les cinq premiers sont visibles au départ ; le bouton « Voir le top 30 » déplie le reste de la liste. À l'entrée à l'écran, les rangées basculent une à une comme des cartes qu'on retourne.",
          "Sur cette page, les noms des étudiants sont floutés.",
        ],
        image: { src: `${TP}/06-classement.webp`, alt: "Classement « Tu pourrais même devenir l'étudiant ULTIM de notre DEC » : cinq rangées avec rang, nom flouté, points et statut ; la première, en jaune, porte un autocollant de chat à lunettes.", width: 1440, height: 840 },
      },
      {
        id: 'mobile',
        title: 'Sur téléphone',
        text: [
          "Sur téléphone, les sections s'empilent, les étapes et les cartes passent en une colonne, et le classement garde l'essentiel : le rang, le nom et les points.",
        ],
        phones: [
          { src: `${TP}/mobile-accueil.webp`, label: 'Accueil', alt: "Accueil sur téléphone : titre « La certification TIM+ donne un plus à ton parcours collégial. »" },
          { src: `${TP}/mobile-reconnaissance.webp`, label: 'Reconnaissance', alt: "Section violette sur téléphone : texte sur la certification PLUS+ et bouton « Je participe »." },
          { src: `${TP}/mobile-fonctionnement.webp`, label: 'Comment ça fonctionne', alt: "Les cinq étapes empilées sur téléphone, chacune dans une couleur différente." },
          { src: `${TP}/mobile-classement.webp`, label: 'Classement', alt: "Classement sur téléphone : rangs, noms floutés et points." },
        ],
      },
    ],
    credits: [
      { role: 'Client', names: ['Département TIM, Cégep Édouard-Montpetit'] },
      { role: 'Design', names: ['Caroline Duplantis'] },
      { role: 'Programmation', names: ['Matthieu Parent'] },
      { role: 'Montage vidéo', names: ['Caroline Duplantis'] },
    ],
  },
];

export const ETUDES: ReadonlyArray<{ projet: Projet; etude: Etude }> = ETUDES_DATA.flatMap((etude) => {
  const projet = PROJETS.find((p) => p.id === etude.slug);
  return projet ? [{ projet, etude }] : [];
});
