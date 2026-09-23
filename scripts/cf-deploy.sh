#!/usr/bin/env bash
# scripts/cf-deploy.sh <staging|cabinet>
#
# EXCEPTIONNEL : le déploiement normal est le push git (Workers Builds :
# main → staffd-staging, release/cabinet → staffd-cabinet, variables de build
# du tableau de bord). Ce script ne sert qu'à déployer depuis un poste.
#
# Build + déploiement d'un Worker avec la BONNE base Supabase.
# NEXT_PUBLIC_* est figé dans le bundle au build : un `next build` lit
# .env.local (préprod) par défaut, donc un cabinet construit sans précaution
# parle à la base de préprod. Ce script charge le fichier d'environnement du
# Worker visé, exporte les NEXT_PUBLIC_* (l'environnement du processus prime
# sur les fichiers .env), puis REFUSE de déployer si le bundle ne contient
# pas la base attendue ou contient l'autre. CF_DRY_RUN=1 : build + contrôle seuls.
set -euo pipefail
cd "$(dirname "$0")/.."

target="${1:-}"
case "$target" in
  staging) envfile=.env.local;         other=.env.cabinet.local ;;
  cabinet) envfile=.env.cabinet.local; other=.env.local ;;
  *) echo "usage: $0 <staging|cabinet>" >&2; exit 2 ;;
esac

url_of() {  # URL Supabase d'un fichier d'environnement (NEXT_PUBLIC_ ou non)
  ( set -a; . "./$1"; set +a; echo "${NEXT_PUBLIC_SUPABASE_URL:-${SUPABASE_URL:-}}" ) | tr -d '[:space:]'
}
anon_of() {
  ( set -a; . "./$1"; set +a; echo "${NEXT_PUBLIC_SUPABASE_ANON_KEY:-${SUPABASE_ANON_KEY:-}}" ) | tr -d '[:space:]'
}

url="$(url_of "$envfile")"; anon="$(anon_of "$envfile")"
other_url="$(url_of "$other")"
[ -n "$url" ] && [ -n "$anon" ] || { echo "✘ $envfile : URL ou clé anon Supabase manquante" >&2; exit 1; }
ref="$(echo "$url" | sed -E 's#https://([a-z0-9]+)\..*#\1#')"
other_ref="$(echo "$other_url" | sed -E 's#https://([a-z0-9]+)\..*#\1#')"

echo "→ $target : Supabase $ref"
export NEXT_PUBLIC_SUPABASE_URL="$url" NEXT_PUBLIC_SUPABASE_ANON_KEY="$anon"
npx opennextjs-cloudflare build

hits="$( (grep -rl "$ref" .open-next || true) | wc -l)"
wrong=0; [ -n "$other_ref" ] && wrong="$( (grep -rl "$other_ref" .open-next || true) | wc -l)"
if [ "$hits" -eq 0 ] || [ "$wrong" -ne 0 ]; then
  echo "✘ bundle incohérent : $ref dans $hits fichier(s), $other_ref dans $wrong. Déploiement annulé." >&2
  exit 1
fi
echo "✓ bundle : $ref dans $hits fichier(s), aucune trace de $other_ref"
if [ "${CF_DRY_RUN:-}" = 1 ]; then echo "(CF_DRY_RUN=1 : pas de déploiement)"; exit 0; fi
npx opennextjs-cloudflare deploy --env "$target"
