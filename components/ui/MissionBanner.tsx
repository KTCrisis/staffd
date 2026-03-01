// components/ui/MissionBanner.tsx
export function MissionBanner() {
  return (
    <div style={{
      borderLeft: '3px solid var(--green)',
      paddingLeft: 16,
      marginBottom: 24,
      opacity: 0.85,
    }}>
      <p style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 4, letterSpacing: '0.08em' }}>
        // WHAT WE DO
      </p>
      <p style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500, lineHeight: 1.6 }}>
        staff7 is an <strong>AI-native staffing OS</strong> for agencies and ESNs.
        Manage consultants, track margins, and talk to your data — via natural language or MCP.
      </p>
      <p style={{ fontSize: 10, color: 'var(--text2)', marginTop: 8 }}>
        Agentic Resource Management · PSA · MCP-ready
      </p>
    </div>
  )
}