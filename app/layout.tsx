import type { Metadata } from 'next'
import '@/styles/globals.css' 
import { Toaster } from '@/components/ui/toaster'

export const metadata: Metadata = {
  title: 'staff7',
  description: 'Talk to your staffing data. AI-native platform for agencies and consulting firms — resource management, margins, and MCP-powered automation.',
  keywords: [
    'agentic staffing platform',
    'resource management AI',
    'PSA software',
    'Professional Services SaaS',
    'Digital Services SaaS',
    'Design Agency SaaS',
    'Marketing Agency SaaS',    
    'MCP staffing',
    'consultant management',
  ],
  openGraph: {
    title: 'staff7 — Agentic Resource Intelligence',
    description: 'Talk to your staffing data.',
    siteName: 'staffd',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
      <Toaster />
    </html>
  )
}