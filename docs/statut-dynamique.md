# Statut dynamique « En train de… »

L'étiquette de la forme intro (à côté du halo du cerveau) affiche ce que je fais en ce moment,
et un second texte, plus vague, au survol, au focus clavier ou au toucher.

- **Config** (textes, variantes de survol, mots-clés, fuseau, priorité, calendriers) :
  [`src/config/status.ts`](../src/config/status.ts)
- **Serveur** : [`src/server/status/`](../src/server/status/) — un module par source dans `sources/`
- **API** : `GET /api/status` → `{ status, visibleText, hoverText, updatedAt }` (cache serveur 5 min)
- **Front** : [`StatusLabel.astro`](../src/components/StatusLabel.astro) + [`StatusLabel.ts`](../src/scripts/site/StatusLabel.ts)
- **Tests** : `npm test`

## Ordre de priorité (le premier qui correspond l'emporte)

1. **Override manuel** actif (avec expiration).
2. **Enseignement** : un événement est en cours dans le calendrier de travail.
3. **Projets** : un push dans la dernière heure sur un de mes dépôts GitHub.
4. **Jeu** : en ligne sur PlayStation Network. Pas de détection Nintendo : utiliser l'override.
5. **Famille** : un événement « soccer » en cours dans le calendrier familial **ou** samedi/dimanche.
6. **Défaut**.

Une source absente, en panne ou trop lente (5 s) compte comme « non » : on passe au critère
suivant. Seul le statut sort du serveur : jamais le titre, le lieu ni les détails d'un événement.

## Obtenir les secrets

Copier `.env.example` en `.env` et remplir.

### Calendriers Outlook (ICS)

**Familial (Outlook.com)** — `CAL_FAMILY_ICS_URL`

1. outlook.live.com → ⚙ Paramètres → Calendrier → **Calendriers partagés**.
2. Section « Publier un calendrier » : choisir le calendrier familial et
   **« Peut afficher tous les détails »** (le titre est nécessaire pour repérer « soccer » ;
   il reste sur le serveur).
3. **Publier**, puis copier le lien **ICS** (pas le lien HTML).

**Travail (Microsoft 365 du cégep)** — `CAL_WORK_ICS_URL`

1. outlook.office.com → ⚙ Paramètres → Calendrier → **Calendriers partagés** → « Publier un calendrier ».
2. Choisir **« Peut afficher quand je suis occupé »** : le titre n'est pas nécessaire, tout
   événement « Occupé » en cours déclenche Enseignement (les « Disponible » sont ignorés).
3. **Publier**, copier le lien **ICS**.

Si la section « Publier un calendrier » est absente ou grisée, l'organisation a bloqué la
publication. Il faudra alors le module Microsoft Graph (inscription d'une application Entra ID,
permission `Calendars.Read`), à ajouter dans `sources/`.

Ces URL sont secrètes : quiconque les a peut lire le calendrier. Pour en révoquer une :
« Annuler la publication », puis republier.

À noter : Outlook ne régénère pas le flux publié en temps réel. Un événement ajouté à la
dernière minute peut prendre un certain temps à apparaître.

### GitHub — `GITHUB_TOKEN`

github.com → Settings → Developer settings → **Personal access tokens → Fine-grained tokens** → Generate :

- Resource owner : mon compte ; Repository access : **All repositories** ;
- Permissions → Repository → **Metadata : Read-only** (rien d'autre) ;
- une expiration (p. ex. 1 an), à noter dans un agenda.

Pour inclure les dépôts d'une organisation, il faut un jeton dont l'organisation est le
« Resource owner » (ou un jeton classique, à éviter : portée trop large).

### PlayStation Network — `PSN_NPSSO`

1. Se connecter sur https://www.playstation.com dans un navigateur.
2. Dans le même navigateur, ouvrir https://ca.account.sony.com/api/v1/ssocookie
3. Copier la valeur `npsso` (64 caractères).

Le NPSSO expire après environ 2 mois (ou à la déconnexion) : refaire la procédure. Les jetons
d'accès sont renouvelés automatiquement entre-temps. Dans les paramètres de confidentialité
PSN, mon statut en ligne doit être visible au moins par moi-même. `psn-api` n'est pas
officielle : Sony peut la casser sans préavis. Si ça arrive, le statut retombe simplement sur
le critère suivant.

### Override — `STATUS_OVERRIDE_SECRET`

```bash
openssl rand -base64 32
```

## Override depuis le téléphone (Raccourcis iOS)

Action **« Obtenir le contenu de l'URL »** :

- URL : `https://matthieuparent.com/api/status/override`
- Méthode : **POST**
- En-têtes : `Authorization` = `Bearer <STATUS_OVERRIDE_SECRET>`
- Corps de la requête : **JSON**, `status` = `jeu`, `minutes` = `120`

Valeurs de `status` : `enseignement`, `projets`, `jeu`, `famille`, `defaut`, ou `auto` pour
revenir au calcul automatique (équivalent à `DELETE /api/status/override`). `minutes` vaut
60 par défaut et 7 jours au maximum.

Astuce : un raccourci « Je joue à la Switch » avec `jeu` / `180`, et un raccourci « Statut auto ».

```bash
curl -X POST https://matthieuparent.com/api/status/override \
  -H "Authorization: Bearer $STATUS_OVERRIDE_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"status":"jeu","minutes":120}'
```

## Déploiement (DigitalOcean)

Le site reste statique, sauf `/api/status*`, servi par Node (`@astrojs/node`, mode standalone) :

```bash
npm ci && npm run build
npm start            # = node --env-file-if-exists=.env ./dist/server/entry.mjs
```

Le serveur Node sert aussi les pages statiques de `dist/client`. Le placer derrière nginx
(proxy vers `127.0.0.1:4321`) et le garder en vie avec systemd ou pm2. `STATUS_DATA_DIR`
doit être inscriptible. Le cache est en mémoire : prévoir un seul processus.
