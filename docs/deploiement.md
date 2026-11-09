# Déploiement — matthieuparent.com

Chaque push sur `main` déploie le site automatiquement
([`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml)) : `npm ci`, `npm test`,
`npm run build`, envoi sur le droplet, redémarrage, vérification. On peut aussi relancer un
déploiement à la main : onglet **Actions** du repo → *Déploiement* → **Run workflow**.

Si les tests ou le build échouent, rien n'est envoyé. Si le site ne répond pas après le
redémarrage, le serveur revient tout seul à la version précédente.

## Sur le serveur (droplet DigitalOcean, Ubuntu 24.04)

```
Internet ─▶ Apache (80/443, HTTPS Let's Encrypt) ─▶ Node 24 sur 127.0.0.1:4321 (service `portfolio`)
```

| Quoi | Où |
| --- | --- |
| Utilisateur dédié (sans droits root) | `portfolio` |
| Version en ligne (lien symbolique) | `/srv/portfolio/app` → `/srv/portfolio/releases/<date>-<commit>` |
| Les 3 dernières versions | `/srv/portfolio/releases/` |
| Secrets de production | `/srv/portfolio/shared/.env` (lisible par `portfolio` seulement) |
| Override du statut (persisté) | `/srv/portfolio/shared/data/` |
| Service systemd | `/etc/systemd/system/portfolio.service` |
| Hôte virtuel Apache | `/etc/apache2/sites-available/matthieuparent.com.conf` (+ `-le-ssl.conf`) |
| Journaux Apache | `/var/log/apache2/matthieuparent-{access,error}.log` |

Le certificat HTTPS se renouvelle tout seul (`certbot.timer`).

## Secrets GitHub (Settings → Secrets and variables → Actions)

- `DEPLOY_SSH_KEY` : clé privée qui ne donne accès qu'à l'utilisateur `portfolio`. Elle peut
  seulement envoyer des fichiers et redémarrer le service.
- `DEPLOY_KNOWN_HOSTS` : empreinte du serveur, pour éviter les usurpations.
- `DEPLOY_HOST` : adresse IP du droplet.

## Tâches courantes (en `root` sur le serveur)

Modifier un secret du statut (calendriers, GitHub, PSN) : voir
[statut-dynamique.md](statut-dynamique.md) pour les obtenir, puis :

```bash
nano /srv/portfolio/shared/.env
systemctl restart portfolio
```

Voir l'état et les journaux du site :

```bash
systemctl status portfolio
journalctl -u portfolio -n 100 -f
```

Revenir à la version précédente :

```bash
ls -1t /srv/portfolio/releases/
ln -sfn /srv/portfolio/releases/<version> /srv/portfolio/app && systemctl restart portfolio
```

Remplacer la clé de déploiement (si elle a fuité) : générer une nouvelle clé, remplacer
`/srv/portfolio/.ssh/authorized_keys` (préfixe `restrict `) et le secret `DEPLOY_SSH_KEY`.
