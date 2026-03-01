'use client'

import { useTranslations } from 'next-intl'
import { Topbar } from '@/components/layout/Topbar'
import { useAuthContext } from '@/components/layout/AuthProvider'

export default function SettingsPage() {
  const t = useTranslations('settings')
  const { user } = useAuthContext()
  
  // Sécurité : Seul le super_admin accède à ces réglages globaux
  const isSuperAdmin = (user as any)?.app_metadata?.user_role === 'super_admin';

  return (
    <>
      <Topbar title="System Settings" breadcrumb="Admin / Settings" />
      
      <div className="app-content" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        
        {/* --- SECTION 01: PLATFORM PULSE (SUPERADMIN ONLY) --- */}
        {isSuperAdmin && (
          <section>
            <div style={{ fontSize: 10, color: 'var(--pink)', letterSpacing: 2, marginBottom: 16 }}>// PLATFORM_OVERVIEW</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <StatCard label="Total Tenants" value="12" sub="+2 this week" color="var(--green)" />
              <StatCard label="Active Agents" value="3" sub="FastAPI / Railway" color="var(--pink)" />
              <StatCard label="Infra Cost (Est.)" value="65.00€" sub="Cloudflare + Supabase" color="var(--cyan)" />
              <StatCard label="AI Tokens Used" value="1.2M" sub="Claude 3.5 Sonnet" color="var(--pink)" />
            </div>
          </section>
        )}

        {/* --- SECTION 02: TENANT MANAGEMENT --- */}
        <section>
          <div style={{ fontSize: 10, color: 'var(--text2)', letterSpacing: 2, marginBottom: 16 }}>// ORGANIZATION_MANAGEMENT</div>
          <div className="role-card" style={{ background: 'var(--bg2)', border: '1px solid var(--border)', padding: '24px' }}>
            <h3 style={{ fontSize: 14, color: '#fff', marginBottom: 8 }}>Tenant Configuration</h3>
            <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 20 }}>
              Manage your company profile, slug, and multi-tenant isolation rules.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn-primary" style={{ background: 'var(--green)', color: '#000', border: 'none', padding: '8px 16px', borderRadius: '2px', fontSize: 11, fontWeight: 'bold' }}>
                EDIT ORG PROFILE
              </button>
              {isSuperAdmin && (
                <button style={{ background: 'none', border: '1px solid var(--pink)', color: 'var(--pink)', padding: '8px 16px', borderRadius: '2px', fontSize: 11 }}>
                  MANAGE ALL TENANTS
                </button>
              )}
            </div>
          </div>
        </section>

        {/* --- SECTION 03: AGENTIC AI & MCP CONFIG --- */}
        <section>
          <div style={{ fontSize: 10, color: 'var(--pink)', letterSpacing: 2, marginBottom: 16 }}>// AI_CORE_CONFIGURATION</div>
          <div className="role-card pink" style={{ border: '1px solid rgba(255, 45, 107, 0.2)', padding: '24px', background: 'rgba(255, 45, 107, 0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h3 style={{ fontSize: 14, color: '#fff', marginBottom: 4 }}>FastAPI MCP Gateway</h3>
                <code style={{ fontSize: 10, color: 'var(--pink)' }}>https://api.staff7.railway.app</code>
              </div>
              <div style={{ fontSize: 9, background: 'var(--pink)', color: '#fff', padding: '2px 8px', borderRadius: '10px' }}>CONNECTED</div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <ToggleSetting label="Enable Timesheet Guardian" active={true} />
              <ToggleSetting label="Auto-Staffing Optimization" active={false} />
              <ToggleSetting label="Financial Intelligence (RLS Protected)" active={true} />
            </div>
          </div>
        </section>

      </div>
    </>
  )
}

// --- SUB-COMPONENTS ---

function StatCard({ label, value, sub, color }: { label: string, value: string, sub: string, color: string }) {
  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', padding: '20px', borderRadius: '4px' }}>
      <div style={{ fontSize: 10, color: 'var(--text2)', textTransform: 'uppercase', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 'bold', color }}>{value}</div>
      <div style={{ fontSize: 10, color: 'var(--text2)', marginTop: 4 }}>{sub}</div>
    </div>
  )
}

function ToggleSetting({ label, active }: { label: string, active: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: 12, color: 'var(--text)' }}>{label}</span>
      <div style={{ 
        width: '32px', height: '16px', borderRadius: '10px', 
        background: active ? 'var(--pink)' : 'var(--dim)',
        position: 'relative', cursor: 'pointer'
      }}>
        <div style={{ 
          width: '12px', height: '12px', borderRadius: '50%', background: '#fff',
          position: 'absolute', top: '2px', left: active ? '18px' : '2px',
          transition: 'all 0.2s'
        }} />
      </div>
    </div>
  )
}