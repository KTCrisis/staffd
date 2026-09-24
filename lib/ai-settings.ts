// lib/ai-settings.ts
// Réglages de la console IA d'un tenant (Paramètres > IA), résolus côté serveur.
//
// La route /api/ai ne lisait que les variables d'environnement : ce que l'admin
// enregistrait dans companies.ai_settings n'avait aucun effet. Règles :
//   · modèle et endpoint du tenant, sinon ceux de l'environnement ;
//   · la clé OLLAMA_API_KEY n'est envoyée qu'à ollama.com, jamais à un endpoint
//     saisi par un utilisateur (elle partirait chez un tiers) ;
//   · agents_enabled (faux par défaut) autorise la console à proposer et
//     exécuter des actions ; sans lui, elle ne fait que répondre.

export interface StoredAiSettings {
  ollama_endpoint?: string | null
  ollama_model?:    string | null
  agents_enabled?:  boolean | null
}

export interface ResolvedAiSettings {
  host:          string
  model:         string
  /** Clé à envoyer, ou chaîne vide si l'hôte n'est pas ollama.com */
  apiKey:        string
  agentsEnabled: boolean
}

export interface AiEnv {
  OLLAMA_HOST?:    string
  OLLAMA_MODEL?:   string
  OLLAMA_API_KEY?: string
}

const DEFAULT_HOST  = 'https://ollama.com'
const DEFAULT_MODEL = 'gpt-oss:120b'

/** Vrai si l'URL désigne ollama.com (ou un sous-domaine), en https. */
export function isOllamaCloud(url: string): boolean {
  try {
    const u = new URL(url)
    return u.protocol === 'https:' && (u.hostname === 'ollama.com' || u.hostname.endsWith('.ollama.com'))
  } catch {
    return false
  }
}

/** Endpoint utilisable : http(s) uniquement, sans barre finale ; sinon null. */
export function normalizeEndpoint(raw?: string | null): string | null {
  const v = (raw ?? '').trim()
  if (!v) return null
  try {
    const u = new URL(v)
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null
    return v.replace(/\/+$/, '')
  } catch {
    return null
  }
}

export function resolveAiSettings(stored: StoredAiSettings | null | undefined, env: AiEnv): ResolvedAiSettings {
  const host  = normalizeEndpoint(stored?.ollama_endpoint)
    ?? normalizeEndpoint(env.OLLAMA_HOST)
    ?? DEFAULT_HOST
  const model = (stored?.ollama_model ?? '').trim() || env.OLLAMA_MODEL || DEFAULT_MODEL
  const apiKey = isOllamaCloud(host) ? (env.OLLAMA_API_KEY ?? '') : ''
  return { host, model, apiKey, agentsEnabled: stored?.agents_enabled === true }
}
