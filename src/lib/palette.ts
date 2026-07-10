/**
 * Curated garden color palette (US "enter plant colors manually more easily").
 * A finite, named set covering typical foliage and bloom colors — used by the
 * seasonal color pickers instead of a free-form color wheel.
 */
export interface PaletteColor {
  name: string
  hex: string
}

export const GARDEN_PALETTE: PaletteColor[] = [
  // whites & yellows
  { name: 'Snow White', hex: '#f7f4ec' },
  { name: 'Cream', hex: '#efe6c8' },
  { name: 'Pale Yellow', hex: '#ead98a' },
  { name: 'Golden Yellow', hex: '#d8b93f' },
  { name: 'Chartreuse', hex: '#b8c94f' },
  // oranges & reds
  { name: 'Orange', hex: '#d98a4f' },
  { name: 'Terracotta', hex: '#b05f33' },
  { name: 'Rust', hex: '#a4552f' },
  { name: 'Scarlet', hex: '#c9432f' },
  { name: 'Crimson', hex: '#a63d2f' },
  { name: 'Burgundy', hex: '#7c3545' },
  // pinks & purples
  { name: 'Rose Pink', hex: '#dfa8b8' },
  { name: 'Hot Pink', hex: '#c9538f' },
  { name: 'Magenta', hex: '#b13d8a' },
  { name: 'Lavender', hex: '#b3a8d9' },
  { name: 'Violet', hex: '#8f7fc9' },
  { name: 'Deep Purple', hex: '#6b4f9e' },
  // blues
  { name: 'Periwinkle', hex: '#8fa8d9' },
  { name: 'Sky Blue', hex: '#7fa8d9' },
  { name: 'Deep Blue', hex: '#4c6b9e' },
  { name: 'Teal', hex: '#4f8a8a' },
  // greens
  { name: 'Spring Green', hex: '#a2c48e' },
  { name: 'Leaf Green', hex: '#6f9e5c' },
  { name: 'Deep Green', hex: '#4c7040' },
  { name: 'Olive', hex: '#94804e' },
  // browns & winter neutrals
  { name: 'Tan', hex: '#c2a45c' },
  { name: 'Brown', hex: '#7c6248' },
  { name: 'Bare Brown', hex: '#8a7f6a' },
  { name: 'Winter Grey', hex: '#9d947e' },
  { name: 'Silver Grey', hex: '#a8a89a' },
]

export function paletteName(hex: string): string | undefined {
  return GARDEN_PALETTE.find((c) => c.hex.toLowerCase() === hex.toLowerCase())?.name
}

/** Snap an arbitrary hex color (e.g. from AI lookup) to the nearest palette color. */
export function snapToPalette(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return GARDEN_PALETTE[21].hex // Spring Green fallback
  const v = parseInt(m[1], 16)
  const r = (v >> 16) & 255
  const g = (v >> 8) & 255
  const b = v & 255
  let best = GARDEN_PALETTE[0]
  let bestDist = Infinity
  for (const c of GARDEN_PALETTE) {
    const cv = parseInt(c.hex.slice(1), 16)
    const dr = r - ((cv >> 16) & 255)
    const dg = g - ((cv >> 8) & 255)
    const db = b - (cv & 255)
    const dist = dr * dr + dg * dg + db * db
    if (dist < bestDist) {
      bestDist = dist
      best = c
    }
  }
  return best.hex
}
