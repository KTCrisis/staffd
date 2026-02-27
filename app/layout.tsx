import type { Metadata } from 'next'
import { ThemeProvider } from '@/components/layout/ThemeProvider'
import { Sidebar } from '@/components/layout/Sidebar'
import '@/styles/globals.css'

export const metadata: Metadata = {
  title: 'Staffd — consultant manager',
  description: 'Gestion de consultants by flux7.art',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" data-theme="dark">
      <body>
        <ThemeProvider>
          <div className="app-shell">
            <Sidebar />
            <main className="app-main">
              {children}
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
