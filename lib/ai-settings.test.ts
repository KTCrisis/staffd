import { describe, it, expect } from 'vitest'
import { resolveAiSettings, isOllamaCloud, normalizeEndpoint } from './ai-settings'

const env = { OLLAMA_API_KEY: 'secret', OLLAMA_MODEL: 'env-model' }

describe('resolveAiSettings', () => {
  it('falls back to the environment, then to ollama.com', () => {
    const r = resolveAiSettings(null, env)
    expect(r.host).toBe('https://ollama.com')
    expect(r.model).toBe('env-model')
    expect(r.apiKey).toBe('secret')
    expect(r.agentsEnabled).toBe(false)
  })

  it('uses the tenant model and endpoint', () => {
    const r = resolveAiSettings({ ollama_endpoint: 'https://ollama.com/', ollama_model: 'qwen3', agents_enabled: true }, env)
    expect(r.host).toBe('https://ollama.com')
    expect(r.model).toBe('qwen3')
    expect(r.agentsEnabled).toBe(true)
  })

  it('never sends the key to an endpoint other than ollama.com', () => {
    for (const ep of ['https://evil.example.com', 'https://ollama.com.evil.io', 'http://ollama.com', 'http://100.109.119.89:11434']) {
      expect(resolveAiSettings({ ollama_endpoint: ep }, env).apiKey).toBe('')
    }
  })

  it('ignores an invalid endpoint', () => {
    expect(resolveAiSettings({ ollama_endpoint: 'javascript:alert(1)' }, env).host).toBe('https://ollama.com')
    expect(resolveAiSettings({ ollama_endpoint: 'not a url' }, env).host).toBe('https://ollama.com')
  })

  it('agents stay disabled unless explicitly true', () => {
    expect(resolveAiSettings({ agents_enabled: null }, env).agentsEnabled).toBe(false)
  })
})

describe('helpers', () => {
  it('isOllamaCloud', () => {
    expect(isOllamaCloud('https://ollama.com')).toBe(true)
    expect(isOllamaCloud('https://api.ollama.com')).toBe(true)
    expect(isOllamaCloud('https://notollama.com')).toBe(false)
  })
  it('normalizeEndpoint', () => {
    expect(normalizeEndpoint(' https://x.io/// ')).toBe('https://x.io')
    expect(normalizeEndpoint('')).toBeNull()
    expect(normalizeEndpoint('ftp://x.io')).toBeNull()
  })
})
