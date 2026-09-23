/**
 * lib/branding.ts
 * Per-tenant branding (companies.branding jsonb) turned into safe render data.
 *
 * The value comes from the database, so it is treated as untrusted input:
 * only a closed list of theme tokens is accepted, only plain color literals
 * are accepted as values, and the heading font must be on a closed list.
 * Anything else is dropped silently and the default theme shows through.
 *
 * Shape stored in companies.branding:
 * {
 *   "name": "ACME",                 // replaces "staff7" in the sidebar
 *   "tagline": "// consulting",     // replaces "// AI-native PSA"
 *   "heading_font": "Space Grotesk",
 *   "dark":  { "bg": "#0A0A0A", "green": "#B8F542", ... },
 *   "light": { ... }
 * }
 */

export const THEME_TOKENS = [
  'bg', 'bg2', 'bg3', 'bg4',
  'green', 'pink', 'cyan', 'gold', 'purple', 'dim',
  'text', 'text2', 'border', 'border2',
] as const
export type ThemeToken = (typeof THEME_TOKENS)[number]

export const HEADING_FONTS = ['JetBrains Mono', 'Space Grotesk', 'Inter Tight'] as const
export type HeadingFont = (typeof HEADING_FONTS)[number]

export interface Branding {
  name:        string | null
  tagline:     string | null
  headingFont: HeadingFont | null
  /** CSS to inject after the default theme; empty string when nothing applies. */
  css:         string
}

export const DEFAULT_BRANDING: Branding = { name: null, tagline: null, headingFont: null, css: '' }

const HEX  = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i
const RGB  = /^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(?:,\s*(?:0|1|0?\.\d+)\s*)?\)$/i

export function isSafeColor(v: unknown): v is string {
  return typeof v === 'string' && (HEX.test(v.trim()) || RGB.test(v.trim()))
}

function cleanText(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null
  // Rendered as React text (escaped), but keep it short and single-line.
  const s = v.replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max)
  return s.length ? s : null
}

function tokensToCss(selector: string, raw: unknown): string {
  if (!raw || typeof raw !== 'object') return ''
  const decls: string[] = []
  for (const token of THEME_TOKENS) {
    const v = (raw as Record<string, unknown>)[token]
    if (isSafeColor(v)) decls.push(`--${token}:${v.trim()}`)
  }
  return decls.length ? `${selector}{${decls.join(';')}}` : ''
}

export function resolveBranding(raw: unknown): Branding {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return DEFAULT_BRANDING
  const b = raw as Record<string, unknown>

  const headingFont = HEADING_FONTS.find(f => f === b.heading_font) ?? null

  // html[data-theme=…] outranks the [data-theme=…] defaults of globals.css,
  // so the override wins regardless of stylesheet order.
  const css = [
    tokensToCss("html[data-theme='dark']", b.dark),
    tokensToCss("html[data-theme='light']", b.light),
    headingFont ? `:root{--font-heading:'${headingFont}','JetBrains Mono',monospace}` : '',
  ].join('')

  return {
    name:    cleanText(b.name, 24),
    tagline: cleanText(b.tagline, 40),
    headingFont,
    css,
  }
}

/** Google Fonts stylesheet for the heading font, or null for the built-in one. */
export function headingFontHref(font: HeadingFont | null): string | null {
  if (!font || font === 'JetBrains Mono') return null
  return `https://fonts.googleapis.com/css2?family=${font.replace(/ /g, '+')}:wght@400;600;700&display=swap`
}

/**
 * Invoice styling derived from the tenant branding: the LIGHT theme accent
 * (an invoice is printed on white) and the heading font. Same validation as
 * resolveBranding: unknown font or unsafe color → null, default look.
 */
export interface InvoiceStyle {
  accent:      string | null
  headingFont: HeadingFont | null
}

export function resolveInvoiceStyle(raw: unknown): InvoiceStyle {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { accent: null, headingFont: null }
  const b     = raw as Record<string, unknown>
  const light = (b.light && typeof b.light === 'object') ? b.light as Record<string, unknown> : {}
  return {
    accent:      isSafeColor(light.green) ? (light.green as string).trim() : null,
    headingFont: HEADING_FONTS.find(f => f === b.heading_font) ?? null,
  }
}
