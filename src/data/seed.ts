import type {
  Bed,
  CompanionRule,
  Garden,
  InventoryItem,
  JournalEntry,
  Placement,
  PlantInstance,
  PlantSpecies,
  Task,
} from '../lib/types'
import { addDays, today } from '../lib/plant'

export const seedGarden: Garden = {
  name: 'Maple Street Garden',
  zipCode: '19335',
  usdaZone: '7a',
  lastFrostDoy: 105, // ~Apr 15
  firstFrostDoy: 294, // ~Oct 21
  widthUnits: 40,
  heightUnits: 30,
  units: 'imperial',
}

export const seedBeds: Bed[] = [
  { id: 'bed-front', name: 'Front Border', x: 2, y: 2, w: 15, h: 6, soilType: 'loam', sunlight: 'full', drainage: 'well' },
  { id: 'bed-veggie', name: 'Veggie Patch', x: 20, y: 3, w: 13, h: 10, soilType: 'loam', sunlight: 'full', drainage: 'well' },
  { id: 'bed-herb', name: 'Herb Corner', x: 2, y: 11, w: 9, h: 6, soilType: 'sandy', sunlight: 'full', drainage: 'dry' },
  { id: 'bed-east', name: 'East Bed', x: 26, y: 17, w: 12, h: 9, soilType: 'clay', sunlight: 'partial', drainage: 'boggy' },
  { id: 'bed-shade', name: 'Shade Nook', x: 3, y: 21, w: 11, h: 7, soilType: 'loam', sunlight: 'shade', drainage: 'well' },
]

export const seedSpecies: PlantSpecies[] = [
  {
    id: 'sp-hydrangea', source: 'seed',
    commonName: 'Bigleaf Hydrangea', scientificName: 'Hydrangea macrophylla', plantType: 'shrub',
    matureHeightIn: 48, matureSpreadIn: 60, spacingIn: 60,
    bloomStartMonth: 6, bloomEndMonth: 9, pruneMonths: [3], fertilizeIntervalWeeks: 8,
    waterNeeds: 'high', sunNeeds: 'partial', frostTender: false, hardinessMinZone: '6a',
    defaultColors: { spring: '#9cbf8e', summer: '#7fa8d9', fall: '#c08e9c', winter: '#8a8570' },
  },
  {
    id: 'sp-tomato', source: 'seed',
    commonName: 'Tomato ‘Brandywine’', scientificName: 'Solanum lycopersicum', plantType: 'annual',
    matureHeightIn: 60, matureSpreadIn: 24, spacingIn: 24,
    bloomStartMonth: 6, bloomEndMonth: 8, fertilizeIntervalWeeks: 3,
    waterNeeds: 'high', sunNeeds: 'full', frostTender: true, hardinessMinZone: '10a',
    defaultColors: { spring: '#a7c98a', summer: '#c9534f', fall: '#b0793f', winter: '#c9c0ac' },
  },
  {
    id: 'sp-fennel', source: 'seed',
    commonName: 'Fennel', scientificName: 'Foeniculum vulgare', plantType: 'herb',
    matureHeightIn: 48, matureSpreadIn: 18, spacingIn: 12,
    bloomStartMonth: 7, bloomEndMonth: 8,
    waterNeeds: 'medium', sunNeeds: 'full', frostTender: false, hardinessMinZone: '4a',
    defaultColors: { spring: '#a4c491', summer: '#d8c95f', fall: '#94804e', winter: '#b0a790' },
  },
  {
    id: 'sp-basil', source: 'seed',
    commonName: 'Sweet Basil', scientificName: 'Ocimum basilicum', plantType: 'herb',
    matureHeightIn: 18, matureSpreadIn: 12, spacingIn: 10, fertilizeIntervalWeeks: 4,
    waterNeeds: 'medium', sunNeeds: 'full', frostTender: true, hardinessMinZone: '10a',
    defaultColors: { spring: '#8fce77', summer: '#5f9e4a', fall: '#94804e', winter: '#b0a790' },
  },
  {
    id: 'sp-carrot', source: 'seed',
    commonName: 'Carrot ‘Nantes’', scientificName: 'Daucus carota', plantType: 'annual',
    matureHeightIn: 12, matureSpreadIn: 3, spacingIn: 3,
    waterNeeds: 'medium', sunNeeds: 'full', frostTender: false, hardinessMinZone: '3a',
    defaultColors: { spring: '#a2c48e', summer: '#8fae5c', fall: '#d89a4f', winter: '#c9c0ac' },
  },
  {
    id: 'sp-onion', source: 'seed',
    commonName: 'Yellow Onion', scientificName: 'Allium cepa', plantType: 'bulb',
    matureHeightIn: 18, matureSpreadIn: 4, spacingIn: 4,
    waterNeeds: 'medium', sunNeeds: 'full', frostTender: false, hardinessMinZone: '3a',
    defaultColors: { spring: '#b1c98a', summer: '#a3ad63', fall: '#c2a45c', winter: '#c1b89e' },
  },
  {
    id: 'sp-lavender', source: 'seed',
    commonName: 'English Lavender', scientificName: 'Lavandula angustifolia', plantType: 'perennial',
    matureHeightIn: 24, matureSpreadIn: 24, spacingIn: 18,
    bloomStartMonth: 6, bloomEndMonth: 8, pruneMonths: [4, 9],
    waterNeeds: 'low', sunNeeds: 'full', frostTender: false, hardinessMinZone: '5a',
    defaultColors: { spring: '#9cb89e', summer: '#8f7fc9', fall: '#a09a85', winter: '#9d947e' },
  },
  {
    id: 'sp-hosta', source: 'seed',
    commonName: 'Hosta ‘Frances Williams’', scientificName: 'Hosta sieboldiana', plantType: 'perennial',
    matureHeightIn: 24, matureSpreadIn: 48, spacingIn: 36,
    bloomStartMonth: 7, bloomEndMonth: 8,
    waterNeeds: 'medium', sunNeeds: 'shade', frostTender: false, hardinessMinZone: '3a',
    defaultColors: { spring: '#9cbf8e', summer: '#6f9e5c', fall: '#c2a45c', winter: '#9d947e' },
  },
  {
    id: 'sp-rudbeckia', source: 'seed',
    commonName: 'Black-eyed Susan', scientificName: 'Rudbeckia hirta', plantType: 'perennial',
    matureHeightIn: 30, matureSpreadIn: 18, spacingIn: 18,
    bloomStartMonth: 6, bloomEndMonth: 9,
    waterNeeds: 'low', sunNeeds: 'full', frostTender: false, hardinessMinZone: '4a',
    defaultColors: { spring: '#a2c48e', summer: '#d8b93f', fall: '#c99a3f', winter: '#a09781' },
  },
  {
    id: 'sp-coneflower', source: 'seed',
    commonName: 'Purple Coneflower', scientificName: 'Echinacea purpurea', plantType: 'perennial',
    matureHeightIn: 36, matureSpreadIn: 18, spacingIn: 18,
    bloomStartMonth: 6, bloomEndMonth: 9,
    waterNeeds: 'low', sunNeeds: 'full', frostTender: false, hardinessMinZone: '4a',
    defaultColors: { spring: '#9cbf8e', summer: '#b87fc9', fall: '#a5854f', winter: '#a09781' },
  },
  {
    id: 'sp-peony', source: 'seed',
    commonName: 'Peony ‘Sarah Bernhardt’', scientificName: 'Paeonia lactiflora', plantType: 'perennial',
    matureHeightIn: 36, matureSpreadIn: 36, spacingIn: 36,
    bloomStartMonth: 5, bloomEndMonth: 6, pruneMonths: [10], fertilizeIntervalWeeks: 26,
    waterNeeds: 'medium', sunNeeds: 'full', frostTender: false, hardinessMinZone: '3a',
    defaultColors: { spring: '#c98fae', summer: '#7ba36a', fall: '#a5854f', winter: '#9d947e' },
  },
  {
    id: 'sp-jmaple', source: 'seed',
    commonName: 'Japanese Maple', scientificName: 'Acer palmatum', plantType: 'tree',
    matureHeightIn: 180, matureSpreadIn: 180, spacingIn: 120, pruneMonths: [2, 3],
    waterNeeds: 'medium', sunNeeds: 'partial', frostTender: false, hardinessMinZone: '5b',
    defaultColors: { spring: '#b0685c', summer: '#7c4f45', fall: '#c9432f', winter: '#7c7361' },
  },
  {
    id: 'sp-fern', source: 'seed',
    commonName: 'Ostrich Fern', scientificName: 'Matteuccia struthiopteris', plantType: 'fern',
    matureHeightIn: 48, matureSpreadIn: 36, spacingIn: 30,
    waterNeeds: 'high', sunNeeds: 'shade', frostTender: false, hardinessMinZone: '3a',
    defaultColors: { spring: '#8db67f', summer: '#5e8a53', fall: '#8b7a48', winter: '#8f8672' },
  },
  {
    id: 'sp-astilbe', source: 'seed',
    commonName: 'Astilbe ‘Fanal’', scientificName: 'Astilbe × arendsii', plantType: 'perennial',
    matureHeightIn: 24, matureSpreadIn: 18, spacingIn: 18,
    bloomStartMonth: 6, bloomEndMonth: 7,
    waterNeeds: 'high', sunNeeds: 'partial', frostTender: false, hardinessMinZone: '4a',
    defaultColors: { spring: '#9cbf8e', summer: '#c05c6e', fall: '#a5854f', winter: '#9d947e' },
  },
  {
    id: 'sp-daffodil', source: 'seed',
    commonName: 'Daffodil ‘King Alfred’', scientificName: 'Narcissus', plantType: 'bulb',
    matureHeightIn: 16, matureSpreadIn: 6, spacingIn: 6,
    bloomStartMonth: 3, bloomEndMonth: 4,
    waterNeeds: 'low', sunNeeds: 'full', frostTender: false, hardinessMinZone: '3b',
    defaultColors: { spring: '#e0c94f', summer: '#9aad7c', fall: '#b3a583', winter: '#c9c0ac' },
  },
  {
    id: 'sp-rose', source: 'seed',
    commonName: 'Climbing Rose ‘New Dawn’', scientificName: 'Rosa', plantType: 'vine',
    matureHeightIn: 144, matureSpreadIn: 72, spacingIn: 60,
    bloomStartMonth: 5, bloomEndMonth: 9, pruneMonths: [2, 3], fertilizeIntervalWeeks: 6,
    waterNeeds: 'medium', sunNeeds: 'full', frostTender: false, hardinessMinZone: '5a',
    defaultColors: { spring: '#c9a3ae', summer: '#dfa8b8', fall: '#a5854f', winter: '#948b76' },
  },
]

const t = today()

export const seedInstances: PlantInstance[] = [
  {
    id: 'pi-hydrangea', speciesId: 'sp-hydrangea', nickname: 'Front-door hydrangea', status: 'active',
    // Observed in this garden: blooms a month later, stays smaller (US-204 demo)
    overrides: { bloomStartMonth: 7, matureHeightIn: 36 },
    sourceName: 'Meadowbrook Nursery', sourceUrl: 'https://example.com/meadowbrook',
    pricePaidCents: 3499, plantedOn: '2024-04-20',
    notes: 'North side of the porch; morning sun only.',
  },
  { id: 'pi-rose', speciesId: 'sp-rose', nickname: 'Arbor rose', status: 'active', overrides: {}, sourceName: 'Heirloom Roses', sourceUrl: 'https://example.com/heirloom', pricePaidCents: 2895, plantedOn: '2023-05-02' },
  { id: 'pi-peony', speciesId: 'sp-peony', status: 'active', overrides: { matureHeightIn: 42 }, plantedOn: '2022-10-12' },
  { id: 'pi-lavender-1', speciesId: 'sp-lavender', nickname: 'Walkway lavender', status: 'active', overrides: {}, plantedOn: '2024-05-01' },
  { id: 'pi-daffodil', speciesId: 'sp-daffodil', nickname: 'Daffodil drift', status: 'active', overrides: {}, plantedOn: '2023-10-28' },
  {
    id: 'pi-tomato-1', speciesId: 'sp-tomato', nickname: 'Brandywine #1', status: 'active',
    overrides: {}, sourceName: 'Seed Savers Exchange', pricePaidCents: 450, plantedOn: `${t.slice(0, 4)}-05-16`,
  },
  { id: 'pi-tomato-2', speciesId: 'sp-tomato', nickname: 'Brandywine #2', status: 'active', overrides: {}, plantedOn: `${t.slice(0, 4)}-05-16` },
  { id: 'pi-basil', speciesId: 'sp-basil', status: 'active', overrides: {}, plantedOn: `${t.slice(0, 4)}-05-20` },
  { id: 'pi-fennel', speciesId: 'sp-fennel', status: 'active', overrides: {}, plantedOn: `${t.slice(0, 4)}-04-30` },
  { id: 'pi-carrot', speciesId: 'sp-carrot', nickname: 'Carrot row', status: 'active', overrides: {}, plantedOn: `${t.slice(0, 4)}-04-12` },
  { id: 'pi-onion', speciesId: 'sp-onion', nickname: 'Onion row', status: 'active', overrides: {}, plantedOn: `${t.slice(0, 4)}-04-12` },
  { id: 'pi-lavender-2', speciesId: 'sp-lavender', nickname: 'Herb-corner lavender', status: 'active', overrides: {}, plantedOn: '2023-04-22' },
  { id: 'pi-rudbeckia', speciesId: 'sp-rudbeckia', status: 'active', overrides: {}, plantedOn: '2023-06-04' },
  { id: 'pi-coneflower', speciesId: 'sp-coneflower', status: 'active', overrides: {}, plantedOn: '2023-06-04' },
  { id: 'pi-astilbe', speciesId: 'sp-astilbe', status: 'active', overrides: {}, plantedOn: '2024-05-11' },
  { id: 'pi-hosta-1', speciesId: 'sp-hosta', nickname: 'East-bed hosta', status: 'active', overrides: {}, plantedOn: '2022-05-08' },
  { id: 'pi-hosta-2', speciesId: 'sp-hosta', nickname: 'Nook hosta', status: 'active', overrides: {}, plantedOn: '2022-05-08' },
  { id: 'pi-fern', speciesId: 'sp-fern', status: 'active', overrides: {}, plantedOn: '2023-04-30' },
  { id: 'pi-jmaple', speciesId: 'sp-jmaple', nickname: 'Anniversary maple', status: 'active', overrides: {}, sourceName: 'Rare Finds Nursery', pricePaidCents: 18900, plantedOn: '2021-04-10' },
  {
    id: 'pi-basil-old', speciesId: 'sp-basil', nickname: 'Window-box basil', status: 'archived',
    overrides: {}, archiveReason: 'Didn’t survive the June heat wave', archivedAt: addDays(t, -14), plantedOn: `${t.slice(0, 4)}-05-01`,
  },
]

export const seedPlacements: Placement[] = [
  { instanceId: 'pi-hydrangea', bedId: 'bed-front', x: 4.5, y: 4.5 },
  { instanceId: 'pi-rose', bedId: 'bed-front', x: 15.5, y: 3.5 },
  { instanceId: 'pi-peony', bedId: 'bed-front', x: 8.5, y: 4.5 },
  { instanceId: 'pi-lavender-1', bedId: 'bed-front', x: 12, y: 6 },
  { instanceId: 'pi-daffodil', bedId: 'bed-front', x: 6.5, y: 4.2 },
  { instanceId: 'pi-tomato-1', bedId: 'bed-veggie', x: 22, y: 5.5 },
  { instanceId: 'pi-tomato-2', bedId: 'bed-veggie', x: 25, y: 5.5 },
  // deliberately inside the tomato's spacing radius AND a bad companion (demo)
  { instanceId: 'pi-fennel', bedId: 'bed-veggie', x: 23.2, y: 6.4 },
  { instanceId: 'pi-basil', bedId: 'bed-veggie', x: 24, y: 8.5 },
  { instanceId: 'pi-carrot', bedId: 'bed-veggie', x: 29.5, y: 7 },
  { instanceId: 'pi-onion', bedId: 'bed-veggie', x: 30.2, y: 7.4 },
  { instanceId: 'pi-lavender-2', bedId: 'bed-herb', x: 4.5, y: 13.5 },
  { instanceId: 'pi-rudbeckia', bedId: 'bed-herb', x: 8, y: 14.5 },
  { instanceId: 'pi-coneflower', x: 14, y: 15 },
  { instanceId: 'pi-astilbe', bedId: 'bed-east', x: 28.5, y: 20 },
  { instanceId: 'pi-hosta-1', bedId: 'bed-east', x: 32.5, y: 22 },
  { instanceId: 'pi-hosta-2', bedId: 'bed-shade', x: 10, y: 24.5 },
  { instanceId: 'pi-fern', bedId: 'bed-shade', x: 6, y: 24 },
  { instanceId: 'pi-jmaple', x: 19, y: 21 },
]

export const seedCompanionRules: CompanionRule[] = [
  { speciesA: 'sp-fennel', speciesB: 'sp-tomato', relation: 'bad', reason: 'Fennel secretes compounds that inhibit tomato growth.' },
  { speciesA: 'sp-basil', speciesB: 'sp-tomato', relation: 'good', reason: 'Basil repels hornworms and is said to improve tomato flavor.' },
  { speciesA: 'sp-carrot', speciesB: 'sp-onion', relation: 'good', reason: 'Onion scent masks carrots from carrot fly.' },
  { speciesA: 'sp-basil', speciesB: 'sp-fennel', relation: 'bad', reason: 'Fennel suppresses most garden herbs, including basil.' },
  { speciesA: 'sp-lavender', speciesB: 'sp-rose', relation: 'good', reason: 'Lavender deters aphids that target roses.' },
]

export const seedJournal: JournalEntry[] = [
  { id: 'je-1', instanceId: 'pi-hydrangea', entryDate: addDays(t, -9), tag: 'milestone', body: 'First blooms opened — almost a month later than the tag promised. Updated the observed bloom window to match.' },
  { id: 'je-2', instanceId: 'pi-tomato-1', entryDate: addDays(t, -4), tag: 'concern', body: 'Lower leaves yellowing. Watered deep and pulled mulch back from the stem.' },
  { id: 'je-3', instanceId: 'pi-rose', entryDate: addDays(t, -12), tag: 'treatment', body: 'Black spot on lower canes. Removed affected leaves, sprayed neem, will re-check in two weeks.' },
  { id: 'je-4', instanceId: 'pi-peony', entryDate: addDays(t, -30), tag: 'milestone', body: 'Best bloom year yet — easily 40+ flowers. Taller than listed, staking next spring.' },
  { id: 'je-5', instanceId: 'pi-fern', entryDate: addDays(t, -21), body: 'Fiddleheads fully unfurled; already crowding the hosta. May divide in fall.' },
]

export const seedCustomTasks: Task[] = [
  { id: 'task-custom-1', kind: 'custom', title: 'Build trellis for the arbor rose', dueOn: addDays(t, -3), status: 'open', origin: 'user', instanceId: 'pi-rose', notes: 'Cedar 1x2s are in the garage.' },
  { id: 'task-custom-2', kind: 'custom', title: 'Order fall bulbs', dueOn: addDays(t, 10), status: 'open', origin: 'user', notes: 'Tulips + more daffodils for the drift.' },
  { id: 'task-custom-3', kind: 'custom', title: 'Refill rain barrel from the downspout diverter', dueOn: addDays(t, -6), status: 'done', completedAt: addDays(t, -6), origin: 'user' },
  { id: 'task-custom-4', kind: 'water', title: 'Deep-water the East Bed', dueOn: addDays(t, 2), status: 'open', origin: 'user', notes: 'Astilbe wilts fast in July.' },
]

export const seedInventory: InventoryItem[] = [
  { id: 'inv-1', name: 'Zinnia ‘State Fair’ seeds', itemType: 'seed', quantity: 3, lowThreshold: 1, sourceName: 'Botanical Interests', sourceUrl: 'https://example.com/zinnia' },
  { id: 'inv-2', name: 'Tulip ‘Queen of Night’ bulbs', itemType: 'bulb', quantity: 0, lowThreshold: 5, sourceName: 'Brent & Becky’s', sourceUrl: 'https://example.com/tulips' },
  { id: 'inv-3', name: 'Tomato feed (5-lb box)', itemType: 'amendment', quantity: 1, lowThreshold: 1, sourceName: 'Local co-op' },
  { id: 'inv-4', name: 'Neem oil concentrate', itemType: 'amendment', quantity: 2, lowThreshold: 1 },
  { id: 'inv-5', name: 'Bypass pruners', itemType: 'tool', quantity: 1, lowThreshold: 0 },
  { id: 'inv-6', name: 'Carrot ‘Nantes’ seeds', itemType: 'seed', quantity: 1, lowThreshold: 2, sourceName: 'Seed Savers Exchange', sourceUrl: 'https://example.com/carrots' },
  { id: 'inv-7', name: 'Jute twine', itemType: 'other', quantity: 4, lowThreshold: 1 },
]
