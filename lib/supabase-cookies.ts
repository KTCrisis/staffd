// lib/supabase-cookies.ts
// Server-side only — adaptateur de cookies pour createServerClient.
//
// Le middleware rafraîchit la session et transmet les jetons à jour aux
// composants serveur ; ceux-ci ne devraient donc jamais avoir à la
// rafraîchir. Si cela arrive quand même, setAll enregistre la session
// quand c'est permis (route handler, server action) et l'ignore dans un
// composant serveur, où Next interdit d'écrire un cookie. Sans setAll,
// @supabase/ssr consommait le jeton de rafraîchissement sans pouvoir
// garder le suivant : le navigateur restait avec un jeton déjà utilisé,
// et la navigation suivante renvoyait au login (« Already Used »).

import type { cookies } from 'next/headers'

type CookieStore = Awaited<ReturnType<typeof cookies>>

export function serverCookies(cookieStore: CookieStore) {
  return {
    getAll: () => cookieStore.getAll(),
    setAll: (toSet: { name: string; value: string; options?: Record<string, unknown> }[]) => {
      try {
        toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
      } catch {
        // Composant serveur : écriture interdite, le middleware s'en charge.
      }
    },
  }
}
