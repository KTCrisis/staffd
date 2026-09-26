// components/guide/GuideView.tsx
// In-app guide: static content from lib/guide.ts, the tenant's name injected.

import { GUIDE_BASICS, GUIDE_FLOW, GUIDE_GROUPS, GUIDE_OUTSIDE } from '@/lib/guide'

interface Props {
  companyName: string | null
  roleLabel:   string
  commit:      string
}

export function GuideView({ companyName, roleLabel, commit }: Props) {
  const sections = [
    { id: 'bases', title: 'Accès et rôles' },
    { id: 'mois',  title: 'Un mois type' },
    ...GUIDE_GROUPS.map(g => ({ id: g.id, title: g.title })),
    { id: 'hors',  title: "Hors de l'outil" },
  ]

  return (
    <div className="app-content guide">
      <header className="guide-head">
        <p className="guide-lede">
          À quoi sert chaque page{companyName ? <> de staffd pour <b>{companyName}</b></> : null}, ce
          qu&apos;elle fait aujourd&apos;hui, ce qu&apos;elle ne fait pas encore, et comment
          s&apos;enchaîne un mois de travail, de l&apos;affaire à la facture.
        </p>
        <div className="guide-meta">
          <span>Votre rôle : <b>{roleLabel}</b></span>
          <span>Version : <b>{commit}</b></span>
        </div>
        <nav className="guide-toc" aria-label="Sections du guide">
          {sections.map(s => <a key={s.id} href={`#${s.id}`}>{s.title}</a>)}
        </nav>
      </header>

      <section id="bases" className="guide-section">
        <h2>Accès et rôles</h2>
        <div className="guide-basics">
          {GUIDE_BASICS.map(b => (
            <div key={b.title}>
              <h3>{b.title}</h3>
              <p>{b.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="mois" className="guide-section">
        <h2>Un mois type, de l&apos;affaire à la facture</h2>
        <p className="guide-why">
          L&apos;ordre dans lequel les pages servent. Chaque étape nourrit la suivante : c&apos;est ce
          qui rend la facture juste sans ressaisie.
        </p>
        <ol className="guide-flow">
          {GUIDE_FLOW.map(f => (
            <li key={f.step}><b>{f.step}</b><span>{f.detail}</span></li>
          ))}
        </ol>
      </section>

      {GUIDE_GROUPS.map(group => (
        <section key={group.id} id={group.id} className="guide-section">
          <h2>{group.title}</h2>
          {group.pages.map(page => (
            <div key={page.route} className="guide-page">
              <div className="guide-page-head">
                <h3>{page.title}</h3>
                <code>{page.route}</code>
                <span className="guide-who">{page.who}</span>
              </div>
              <div className="guide-cols">
                <div>
                  <h4 className="guide-yes">Ce qu&apos;elle fait</h4>
                  <ul>{page.does.map(d => <li key={d}>{d}</li>)}</ul>
                </div>
                <div>
                  <h4 className="guide-no">Pas encore</h4>
                  <ul>{page.notYet.map(d => <li key={d}>{d}</li>)}</ul>
                </div>
              </div>
            </div>
          ))}
        </section>
      ))}

      <section id="hors" className="guide-section">
        <h2>Ce qui reste hors de l&apos;outil</h2>
        <ul className="guide-out">
          {GUIDE_OUTSIDE.map(o => <li key={o.title}><b>{o.title}</b> : {o.text}</li>)}
        </ul>
      </section>

      <footer className="guide-foot">
        Un problème ou une demande : notez la page, ce que vous faisiez et le commit affiché en bas du menu.
      </footer>
    </div>
  )
}
