'use client'

// ══════════════════════════════════════════════════════════════
// components/settings/AITab.tsx
// ══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react'
import { useTranslations }    from 'next-intl'
import { useActiveTenant }    from '@/lib/tenant-context'
import { useCompanySettings, updateAISettings } from '@/lib/data'
import {
  SectionLabel, SettingsField, SettingsInput, SaveBar, Skeleton, ErrorBanner,
} from './shared'

const OLLAMA_MODELS = [
  'kimi-k2.5:cloud',
  'llama3.2:latest',
  'llama3.1:8b',
  'mistral:latest',
  'gemma2:9b',
  'qwen2.5:14b',
  'deepseek-r1:8b',
  'phi4:latest',
]

const MCP_TOOL_KEYS = [
  { key: 'supabase',    icon: '🗄', status: 'active',  color: 'var(--green)' },
  { key: 'calendar',    icon: '📅', status: 'planned', color: 'var(--text2)' },
  { key: 'slack',       icon: '💬', status: 'planned', color: 'var(--text2)' },
  { key: 'spreadsheet', icon: '📊', status: 'planned', color: 'var(--text2)' },
  { key: 'custom',      icon: '⚙',  status: 'soon',    color: 'var(--cyan)'  },
]

export function AITab() {
  const t = useTranslations('settings.ai')
  const { activeTenantId } = useActiveTenant()
  const [refresh, setRefresh] = useState(0)
  const { data: companyData, loading } = useCompanySettings(refresh)

  const [ollamaEndpoint, setOllamaEndpoint] = useState('')
  const [ollamaModel,    setOllamaModel]    = useState('kimi-k2.5:cloud')
  const [agentsEnabled,  setAgentsEnabled]  = useState(false)
  const [saving,         setSaving]         = useState(false)
  const [error,          setError]          = useState<string | null>(null)

  useEffect(() => {
    if (!companyData) return
    const ai = companyData.ai_settings ?? {}
    setOllamaEndpoint(ai.ollama_endpoint ?? '')
    setOllamaModel(ai.ollama_model ?? 'kimi-k2.5:cloud')
    setAgentsEnabled(ai.agents_enabled ?? false)
  }, [companyData])

  const ai = companyData?.ai_settings ?? {}
  const dirty = (
    ollamaEndpoint !== (ai.ollama_endpoint ?? '') ||
    ollamaModel    !== (ai.ollama_model    ?? 'kimi-k2.5:cloud') ||
    agentsEnabled  !== (ai.agents_enabled  ?? false)
  )

  const handleSave = async () => {
    setSaving(true); setError(null)
    try {
      await updateAISettings({
        ai_settings: {
          ollama_endpoint: ollamaEndpoint,
          ollama_model:    ollamaModel,
          agents_enabled:  agentsEnabled,
        },
        companyId: activeTenantId ?? undefined,
      })
      setRefresh(r => r + 1)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    if (!companyData) return
    const a = companyData.ai_settings ?? {}
    setOllamaEndpoint(a.ollama_endpoint ?? '')
    setOllamaModel(a.ollama_model ?? 'kimi-k2.5:cloud')
    setAgentsEnabled(a.agents_enabled ?? false)
  }

  const usageStats = [
    { labelKey: 'usageCallsToday', color: 'var(--cyan)'  },
    { labelKey: 'usageTokens',     color: 'var(--green)' },
    { labelKey: 'usageLastCall',   color: 'var(--text2)' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <ErrorBanner message={error} />

      {/* ── Modèle Ollama ── */}
      <section>
        <SectionLabel label={t('modelSection')} />
        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 4, padding: '20px 24px',
          display: 'flex', flexDirection: 'column', gap: 16,
        }}>
          {loading ? <Skeleton h={100} /> : (
            <>
              <SettingsField label={t('endpointLabel')} hint={t('endpointHint')}>
                <SettingsInput
                  value={ollamaEndpoint} onChange={setOllamaEndpoint}
                  placeholder="https://ollama.yourdomain.com"
                />
              </SettingsField>

              <SettingsField label={t('modelLabel')} hint={t('modelHint')}>
                <select
                  value={ollamaModel}
                  onChange={e => setOllamaModel(e.target.value)}
                  style={{
                    width: '100%', background: 'var(--bg3)',
                    border: '1px solid var(--border2)',
                    color: 'var(--text)', padding: '8px 12px', borderRadius: 2,
                    fontSize: 12, fontFamily: 'inherit',
                  }}
                >
                  {OLLAMA_MODELS.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </SettingsField>

              {/* Toggle agents */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px', borderRadius: 3,
                background: agentsEnabled ? 'rgba(0,255,136,0.04)' : 'var(--bg3)',
                border: `1px solid ${agentsEnabled ? 'rgba(0,255,136,0.2)' : 'var(--border)'}`,
              }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text)', fontWeight: 600 }}>
                    {t('agentsLabel')}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text2)', marginTop: 2 }}>
                    {t('agentsHint')}
                  </div>
                </div>
                <button
                  onClick={() => setAgentsEnabled(v => !v)}
                  style={{
                    width: 44, height: 24, borderRadius: 12, border: 'none',
                    background: agentsEnabled ? 'var(--green)' : 'var(--border2)',
                    cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
                    flexShrink: 0,
                  }}
                >
                  <div style={{
                    position: 'absolute', top: 3,
                    left: agentsEnabled ? 23 : 3,
                    width: 18, height: 18, borderRadius: '50%',
                    background: '#000', transition: 'left 0.2s',
                  }} />
                </button>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ── MCP Tools ── */}
      <section>
        <SectionLabel label={t('mcpSection')} />
        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 4, overflow: 'hidden',
        }}>
          <div style={{
            padding: '12px 20px', borderBottom: '1px solid var(--border)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div style={{ fontSize: 10, color: 'var(--text2)' }}>
              {t('mcpSubtitle')}
            </div>
            <span style={{
              fontSize: 8, padding: '2px 8px', borderRadius: 2, letterSpacing: 1,
              background: 'rgba(255,209,102,0.1)', color: 'var(--gold)',
              border: '1px solid rgba(255,209,102,0.2)',
            }}>
              {t('mcpPlanned')}
            </span>
          </div>

          {MCP_TOOL_KEYS.map((tool, i) => (
            <div key={tool.key} style={{
              padding: '14px 20px',
              borderBottom: i < MCP_TOOL_KEYS.length - 1 ? '1px solid var(--border)' : undefined,
              display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <div style={{ fontSize: 18, width: 28, textAlign: 'center', flexShrink: 0 }}>
                {tool.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: 'var(--text)', fontWeight: 600 }}>
                  {t(`mcp.${tool.key}.name`)}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text2)', marginTop: 2 }}>
                  {t(`mcp.${tool.key}.desc`)}
                </div>
              </div>
              <span style={{
                fontSize: 8, padding: '2px 8px', borderRadius: 2, letterSpacing: 1,
                fontWeight: 700, textTransform: 'uppercase',
                color: tool.color,
                border: `1px solid ${tool.color}40`,
                background: `${tool.color}10`,
              }}>
                {t(`status${tool.status.charAt(0).toUpperCase()}${tool.status.slice(1)}` as any)}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Usage ── */}
      <section>
        <SectionLabel label={t('usageSection')} />
        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 4, padding: '20px 24px',
          display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          <div style={{ fontSize: 10, color: 'var(--text2)', letterSpacing: 1 }}>
            {t('usageComingSoon')}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {usageStats.map(stat => (
              <div key={stat.labelKey} style={{
                padding: '14px 16px', borderRadius: 3,
                background: 'var(--bg3)', border: '1px solid var(--border)',
              }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: stat.color, fontFamily: 'var(--font-mono)' }}>
                  —
                </div>
                <div style={{ fontSize: 9, color: 'var(--text2)', letterSpacing: 2, textTransform: 'uppercase', marginTop: 4 }}>
                  {t(stat.labelKey as any)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <SaveBar dirty={dirty} saving={saving} onSave={handleSave} onReset={handleReset} />
    </div>
  )
}