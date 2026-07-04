import type {
  PlantInstance,
  PlantSpecies,
  PlantType,
  Season,
  SeasonalColors,
  SpeciesFields,
} from './types'

export type EffectivePlant = SpeciesFields & {
  instanceId: string
  displayName: string
  overriddenKeys: string[]
  colors: SeasonalColors
}

const EMPTY_SPECIES_DEFAULTS: SpeciesFields = {
  commonName: 'Unknown plant',
  plantType: 'perennial',
}

const TYPE_DEFAULT_COLORS: Record<PlantType, SeasonalColors> = {
  perennial: { spring: '#9cbf8e', summer: '#6f9e5c', fall: '#b98d4f', winter: '#a09781' },
  annual: { spring: '#a7c98a', summer: '#d98a4f', fall: '#b0793f', winter: '#c9c0ac' },
  shrub: { spring: '#8fb07c', summer: '#5c7f4e', fall: '#a8683c', winter: '#8a8570' },
  tree: { spring: '#7fa86b', summer: '#4c7040', fall: '#b05f33', winter: '#7c7361' },
  vine: { spring: '#95b884', summer: '#5f8a4f', fall: '#a67340', winter: '#948b76' },
  bulb: { spring: '#d8b94f', summer: '#8fae7c', fall: '#b3a583', winter: '#c9c0ac' },
  ground_cover: { spring: '#a2c48e', summer: '#77a061', fall: '#a5854f', winter: '#9d947e' },
  herb: { spring: '#a4c491', summer: '#7ba36a', fall: '#94804e', winter: '#b0a790' },
  grass: { spring: '#b1c98a', summer: '#93ad63', fall: '#c2a45c', winter: '#c1b89e' },
  fern: { spring: '#8db67f', summer: '#5e8a53', fall: '#8b7a48', winter: '#8f8672' },
}

/**
 * The single shared two-layer resolver (US-204, NFR-8). Every consumer —
 * task generation, calendar, map layers, spacing/companion checks — reads
 * plant data through this function, never raw species fields.
 */
export function resolvePlant(instance: PlantInstance, species?: PlantSpecies): EffectivePlant {
  const base = species ?? EMPTY_SPECIES_DEFAULTS
  const merged: SpeciesFields = { ...base, ...instance.overrides }
  return {
    ...merged,
    instanceId: instance.id,
    displayName: instance.nickname || base.commonName,
    overriddenKeys: Object.keys(instance.overrides),
    colors: instance.seasonalColors ?? base.defaultColors ?? TYPE_DEFAULT_COLORS[merged.plantType],
  }
}

// ---------- seasons & dates ----------

export const SEASONS: Season[] = ['spring', 'summer', 'fall', 'winter']

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function seasonForMonth(month: number): Season {
  if (month >= 3 && month <= 5) return 'spring'
  if (month >= 6 && month <= 8) return 'summer'
  if (month >= 9 && month <= 11) return 'fall'
  return 'winter'
}

export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function today(): string {
  return isoDate(new Date())
}

export function addDays(iso: string, days: number): string {
  const d = parseIso(iso)
  d.setDate(d.getDate() + days)
  return isoDate(d)
}

export function parseIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((parseIso(toIso).getTime() - parseIso(fromIso).getTime()) / 86_400_000)
}

export function dateFromDoy(year: number, doy: number): string {
  const d = new Date(year, 0, 1)
  d.setDate(doy)
  return isoDate(d)
}

export function formatDate(iso: string): string {
  const d = parseIso(iso)
  return `${MONTH_NAMES[d.getMonth()].slice(0, 3)} ${d.getDate()}`
}

export function bloomsInMonth(p: EffectivePlant, month: number): boolean {
  const { bloomStartMonth: s, bloomEndMonth: e } = p
  if (!s || !e) return false
  return s <= e ? month >= s && month <= e : month >= s || month <= e
}

export function bloomWindowLabel(p: SpeciesFields): string {
  if (!p.bloomStartMonth || !p.bloomEndMonth) return '—'
  return `${MONTH_NAMES[p.bloomStartMonth - 1].slice(0, 3)}–${MONTH_NAMES[p.bloomEndMonth - 1].slice(0, 3)}`
}

// ---------- sizing ----------

export type HeightCategory = 'low' | 'medium' | 'tall'

export function heightCategory(heightIn?: number): HeightCategory {
  if (!heightIn || heightIn < 18) return 'low'
  if (heightIn < 48) return 'medium'
  return 'tall'
}

export const MARKER_RADIUS_FT: Record<HeightCategory, number> = {
  low: 0.55,
  medium: 0.85,
  tall: 1.25,
}

export function formatHeight(heightIn?: number, units: 'imperial' | 'metric' = 'imperial'): string {
  if (heightIn == null) return '—'
  if (units === 'metric') return `${Math.round(heightIn * 2.54)} cm`
  if (heightIn >= 24) {
    const ft = Math.round((heightIn / 12) * 10) / 10
    return `${ft} ft`
  }
  return `${heightIn} in`
}

// ---------- spatial checks ----------

export interface PlacedPlant {
  instanceId: string
  x: number
  y: number
  plant: EffectivePlant
  speciesId?: string
}

/** Spacing conflict: dist < (spacingA + spacingB)/2, using effective spacing (US-101). */
export function spacingConflicts(placed: PlacedPlant[]): Set<string> {
  const conflicted = new Set<string>()
  for (let i = 0; i < placed.length; i++) {
    for (let j = i + 1; j < placed.length; j++) {
      const a = placed[i]
      const b = placed[j]
      const sa = (a.plant.spacingIn ?? 12) / 12
      const sb = (b.plant.spacingIn ?? 12) / 12
      const dist = Math.hypot(a.x - b.x, a.y - b.y)
      if (dist < (sa + sb) / 2) {
        conflicted.add(a.instanceId)
        conflicted.add(b.instanceId)
      }
    }
  }
  return conflicted
}

export interface CompanionEdge {
  a: PlacedPlant
  b: PlacedPlant
  relation: 'good' | 'bad'
  reason: string
}

/** Neighbors within (effective spacing × 2) joined against the companion rule table (US-702). */
export function companionEdges(
  placed: PlacedPlant[],
  rules: { speciesA: string; speciesB: string; relation: 'good' | 'bad'; reason: string }[],
): CompanionEdge[] {
  const edges: CompanionEdge[] = []
  for (let i = 0; i < placed.length; i++) {
    for (let j = i + 1; j < placed.length; j++) {
      const a = placed[i]
      const b = placed[j]
      if (!a.speciesId || !b.speciesId) continue
      const radius = (Math.max(a.plant.spacingIn ?? 12, b.plant.spacingIn ?? 12) / 12) * 2
      if (Math.hypot(a.x - b.x, a.y - b.y) > radius) continue
      const [sA, sB] = [a.speciesId, b.speciesId].sort()
      const rule = rules.find((r) => r.speciesA === sA && r.speciesB === sB)
      if (rule) edges.push({ a, b, relation: rule.relation, reason: rule.reason })
    }
  }
  return edges
}
