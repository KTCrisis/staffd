import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'staff7',
  description: 'Gestion de consultants by flux7.art',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}