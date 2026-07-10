export type Season = 'spring' | 'summer' | 'fall' | 'winter'

export type PlantType =
  | 'perennial'
  | 'annual'
  | 'shrub'
  | 'tree'
  | 'vine'
  | 'bulb'
  | 'ground_cover'
  | 'herb'
  | 'grass'
  | 'fern'

export type SunNeeds = 'full' | 'partial' | 'shade'
export type WaterNeeds = 'low' | 'medium' | 'high'
export type Drainage = 'well' | 'boggy' | 'dry'

export type SeasonalColors = Record<Season, string>

/** Reference ("textbook") attributes — layer 1 of the two-layer model. */
export interface SpeciesFields {
  commonName: string
  scientificName?: string
  plantType: PlantType
  matureHeightIn?: number
  matureSpreadIn?: number
  spacingIn?: number
  bloomStartMonth?: number // 1–12
  bloomEndMonth?: number
  pruneMonths?: number[]
  fertilizeIntervalWeeks?: number
  waterNeeds?: WaterNeeds
  sunNeeds?: SunNeeds
  frostTender?: boolean
  hardinessMinZone?: string
  defaultColors?: SeasonalColors
}

/** A care action tied to a calendar point, stored on a species and instantiated per plant instance. */
export interface TaskTemplate {
  title: string
  kind: TaskKind
  month: number // 1–12
  day?: number
  repeat: 'yearly' | 'once'
  notes?: string
}

export interface PlantSpecies extends SpeciesFields {
  id: string
  source: 'seed' | 'user' | 'ai'
  /** AI/user-recommended care tasks, copied to new instances of this species. */
  taskTemplates?: TaskTemplate[]
}

/** Keys a gardener can override with observed values (US-204). */
export type OverridableKey =
  | 'matureHeightIn'
  | 'matureSpreadIn'
  | 'spacingIn'
  | 'bloomStartMonth'
  | 'bloomEndMonth'
  | 'pruneMonths'
  | 'fertilizeIntervalWeeks'
  | 'waterNeeds'
  | 'sunNeeds'
  | 'frostTender'

export type Overrides = Partial<Pick<SpeciesFields, OverridableKey>>

/** Your plant — layer 2. Sparse `overrides` win over species reference data. */
export interface PlantInstance {
  id: string
  speciesId?: string // nullable: fully custom plant
  nickname?: string
  status: 'active' | 'archived'
  archiveReason?: string
  archivedAt?: string
  overrides: Overrides
  seasonalColors?: SeasonalColors
  sourceName?: string
  sourceUrl?: string
  pricePaidCents?: number
  plantedOn?: string // ISO date
  notes?: string
}

export interface Bed {
  id: string
  name: string
  x: number
  y: number
  w: number
  h: number
  soilType?: string
  sunlight?: SunNeeds
  drainage?: Drainage
}

export interface Placement {
  instanceId: string
  bedId?: string
  x: number // grid units (ft) from garden origin
  y: number
}

export type TaskKind = 'prune' | 'fertilize' | 'water' | 'frost_protect' | 'custom'
export type TaskStatus = 'open' | 'done' | 'dismissed' | 'snoozed'

/** How a task repeats: completing it spawns the next occurrence. */
export type TaskRecurrence = { type: 'yearly' } | { type: 'weeks'; interval: number }

export interface Task {
  id: string
  instanceId?: string
  kind: TaskKind
  title: string
  dueOn: string // ISO date
  status: TaskStatus
  snoozedTo?: string
  completedAt?: string
  notes?: string
  origin: 'generated' | 'user'
  genKey?: string // '{instanceId}:{kind}:{year}[:n]' — idempotent regeneration
  recurrence?: TaskRecurrence
}

export type JournalTag = 'concern' | 'milestone' | 'treatment'

export interface JournalEntry {
  id: string
  instanceId: string
  entryDate: string
  body: string
  tag?: JournalTag
}

export type InventoryType = 'seed' | 'bulb' | 'tool' | 'amendment' | 'other'

export interface InventoryItem {
  id: string
  name: string
  itemType: InventoryType
  quantity: number
  lowThreshold: number
  sourceName?: string
  sourceUrl?: string
}

export interface CompanionRule {
  speciesA: string // species id, canonical: speciesA < speciesB
  speciesB: string
  relation: 'good' | 'bad'
  reason: string
}

export interface Garden {
  name: string
  zipCode: string
  usdaZone: string
  lastFrostDoy: number // day of year
  firstFrostDoy: number
  widthUnits: number // ft
  heightUnits: number
  units: 'imperial' | 'metric'
}

/** The complete persisted state of one garden — what the server (or local storage) stores per garden. */
export interface GardenData {
  garden: Garden
  beds: Bed[]
  species: PlantSpecies[]
  instances: PlantInstance[]
  placements: Placement[]
  tasks: Task[]
  journal: JournalEntry[]
  inventory: InventoryItem[]
  companionRules: CompanionRule[]
}

export interface GardenMeta {
  id: string
  name: string
  updatedAt: string
}

export interface User {
  id: string
  username: string
}
