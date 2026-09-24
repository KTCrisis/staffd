# The Ollama API key only goes to ollama.com

- **Problem**: the AI console ignored Settings > AI (model, endpoint, Agents). Reading the endpoint from tenant settings would have sent `OLLAMA_API_KEY` to any URL an admin types in.
- **Decision**: `/api/ai` resolves model and endpoint from `companies.ai_settings`, falling back to the environment; the key is attached only when the host is `https://ollama.com` (or a subdomain). "Agents" is off by default: without it the console answers but neither proposes nor runs actions (POST and PUT).
- **Why**: a configurable endpoint is useful (local Ollama), a configurable key recipient is a leak.
- **Where**: `lib/ai-settings.ts` (+ tests), `app/api/ai/route.ts`, `query-agent.ts`, `action-agent.ts`.
