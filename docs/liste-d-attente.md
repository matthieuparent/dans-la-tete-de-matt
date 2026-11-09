# Liste d'attente

Fonctionnalités et améliorations repérées, mises de côté pour plus tard.

## Serveur : accélérer le chargement

Repéré le 2026-11-09 en analysant l'attente lors des changements de page. Le préchargement des pages et l'attente animée des points sont déjà faits ; ceci est la suite côté serveur.

- **HTTP/2** : Apache répond en HTTP/1.1. Activer `mod_http2` (exige `mpm_event`, donc PHP-FPM plutôt que `mod_php` si d'autres sites du droplet en dépendent) et ajouter `Protocols h2 http/1.1` dans le VirtualHost SSL. Gain : un seul échange pour tous les fichiers d'une page.
- **Cache des images** : `/projets/*` et `/carnet/*` (webp, jpg, png, mp4) n'ont pas d'en-tête `Cache-Control`. Ajouter un cache d'une semaine, par exemple `Header set Cache-Control "public, max-age=604800"` sur ces chemins, dans `deploy/apache-matthieuparent.com-le-ssl.conf`.

Attention : le droplet est partagé avec d'autres sites ; vérifier l'effet du changement de MPM sur eux avant d'activer HTTP/2.
