#!/usr/bin/env bash
# Exécuté SUR LE SERVEUR (utilisateur `portfolio`) par le workflow GitHub Actions.
# Installe une version déjà envoyée dans releases/<id>, bascule le lien `app`,
# redémarre le service et revient à la version précédente si le site ne répond pas.
# Usage : deploy-remote.sh <id-de-version>
set -euo pipefail

BASE=/srv/portfolio
RELEASE="$BASE/releases/$1"
KEEP=3

cd "$RELEASE"
npm ci --omit=dev --no-audit --no-fund --loglevel=error

PREVIOUS="$(readlink -f "$BASE/app" 2>/dev/null || true)"
ln -sfn "$RELEASE" "$BASE/app.next" && mv -T "$BASE/app.next" "$BASE/app"
sudo -n /usr/bin/systemctl restart portfolio

for _ in $(seq 1 20); do
  if curl -fsS -o /dev/null http://127.0.0.1:4321/; then
    echo "Version $1 en ligne."
    # Garder les $KEEP versions les plus récentes.
    ls -1dt "$BASE"/releases/*/ | tail -n +$((KEEP + 1)) | xargs -r rm -rf
    exit 0
  fi
  sleep 1
done

echo "Le site ne répond pas : retour à la version précédente." >&2
if [ -n "$PREVIOUS" ] && [ -d "$PREVIOUS" ]; then
  ln -sfn "$PREVIOUS" "$BASE/app.next" && mv -T "$BASE/app.next" "$BASE/app"
  sudo -n /usr/bin/systemctl restart portfolio
fi
exit 1
