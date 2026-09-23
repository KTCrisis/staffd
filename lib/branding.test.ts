import { describe, it, expect } from 'vitest'
import { resolveBranding, isSafeColor, headingFontHref, DEFAULT_BRANDING, resolveInvoiceStyle } from './branding'

describe('isSafeColor', () => {
  it('accepts hex and rgb(a) literals', () => {
    for (const c of ['#fff', '#0A0A0A', '#B8F54280', 'rgb(1,2,3)', 'rgba(0, 0, 0, .4)']) expect(isSafeColor(c)).toBe(true)
  })
  it('rejects anything that could escape a declaration', () => {
    for (const c of ['red', 'var(--x)', '#fff;}body{display:none', 'url(x)', 'rgba(0,0,0,.4));', '', 12, null])
      expect(isSafeColor(c)).toBe(false)
  })
})

describe('resolveBranding', () => {
  it('returns defaults for empty or malformed input', () => {
    for (const raw of [null, undefined, {}, [], 'x', 3]) expect(resolveBranding(raw)).toEqual(DEFAULT_BRANDING)
  })

  it('keeps only known tokens with safe values', () => {
    const b = resolveBranding({
      dark: { bg: '#0A0A0A', green: '#B8F542', text: 'red', evil: '#000', border: '#1F1F1F;}*{' },
    })
    expect(b.css).toBe("html[data-theme='dark']{--bg:#0A0A0A;--green:#B8F542}")
  })

  it('handles both themes and the heading font', () => {
    const b = resolveBranding({ light: { bg: '#F2F5EF' }, dark: { bg: '#000' }, heading_font: 'Space Grotesk' })
    expect(b.css).toContain("html[data-theme='dark']{--bg:#000}")
    expect(b.css).toContain("html[data-theme='light']{--bg:#F2F5EF}")
    expect(b.css).toContain(":root{--font-heading:'Space Grotesk','JetBrains Mono',monospace}")
    expect(b.headingFont).toBe('Space Grotesk')
  })

  it('rejects fonts outside the closed list', () => {
    expect(resolveBranding({ heading_font: "x';}*{" }).headingFont).toBeNull()
  })

  it('trims name and tagline and strips control characters', () => {
    const b = resolveBranding({ name: '  OFF\n//RO4D  ', tagline: 'x'.repeat(100) })
    expect(b.name).toBe('OFF //RO4D')
    expect(b.tagline).toHaveLength(40)
  })
})

describe('headingFontHref', () => {
  it('only loads fonts that are not built in', () => {
    expect(headingFontHref(null)).toBeNull()
    expect(headingFontHref('JetBrains Mono')).toBeNull()
    expect(headingFontHref('Space Grotesk')).toContain('family=Space+Grotesk')
  })
})

describe('resolveInvoiceStyle', () => {
  it('prend l\'accent du thème clair et la police des titres', () => {
    expect(resolveInvoiceStyle({ heading_font: 'Space Grotesk', light: { green: '#436C0C' }, dark: { green: '#B8F542' } }))
      .toEqual({ accent: '#436C0C', headingFont: 'Space Grotesk' })
  })
  it('écarte une couleur ou une police non sûres', () => {
    expect(resolveInvoiceStyle({ heading_font: 'Comic Sans', light: { green: 'red;}body{x' } }))
      .toEqual({ accent: null, headingFont: null })
    expect(resolveInvoiceStyle(null)).toEqual({ accent: null, headingFont: null })
  })
})
