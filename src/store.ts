import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  Bed,
  GardenData,
  Garden,
  GardenMeta,
  InventoryItem,
  JournalTag,
  Overrides,
  Placement,
  PlantInstance,
  PlantSpecies,
  SeasonalColors,
  TaskRecurrence,
  TaskStatus,
  User,
} from './lib/types'
import { today } from './lib/plant'
import { generateTasks, mergeGeneratedTasks, nextDue, tasksFromTemplates } from './lib/taskEngine'
import { buildEmptyState, buildSeedState } from './data/seed'
import {
  ApiError,
  authApi,
  detectServer,
  localDriver,
  markLegacyMigrated,
  readLegacyState,
  serverDriver,
  type StorageDriver,
  type StorageMode,
} from './lib/api'

let idCounter = 0
export function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${(idCounter++).toString(36)}`
}

// ==========================================================================
// Browser-level preferences (per device, not per garden)
// ==========================================================================

interface PrefsState {
  aiApiKey: string
  setAiApiKey: (key: string) => void
}

export const usePrefs = create<PrefsState>()(
  persist(
    (set) => ({
      aiApiKey: '',
      setAiApiKey: (key) => set({ aiApiKey: key.trim() }),
    }),
    { name: 'gardenos-prefs' },
  ),
)

// ==========================================================================
// The active garden's data + actions
// ==========================================================================

interface GardenState extends GardenData {
  updateGarden: (patch: Partial<Garden>) => void

  addBed: (bed: Omit<Bed, 'id'>) => string
  updateBed: (id: string, patch: Partial<Omit<Bed, 'id'>>) => void
  deleteBed: (id: string) => void

  addPlant: (instance: Omit<PlantInstance, 'id' | 'status' | 'overrides'> & { overrides?: Overrides }) => string
  addSpecies: (species: Omit<PlantSpecies, 'id' | 'source'>, source?: PlantSpecies['source']) => string
  updateInstance: (id: string, patch: Partial<PlantInstance>) => void
  setOverride: (id: string, key: keyof Overrides, value: Overrides[keyof Overrides]) => void
  clearOverride: (id: string, key: keyof Overrides) => void
  setSeasonalColors: (id: string, colors?: SeasonalColors) => void
  archivePlant: (id: string, reason: string) => void
  deletePlant: (id: string) => void

  placePlant: (instanceId: string, x: number, y: number) => void
  removePlacement: (instanceId: string) => void

  setTaskStatus: (id: string, status: TaskStatus, snoozedTo?: string) => void
  addCustomTask: (title: string, dueOn: string, instanceId?: string, notes?: string, recurrence?: TaskRecurrence) => void

  addJournalEntry: (instanceId: string, body: string, tag?: JournalTag, entryDate?: string) => void

  addInventoryItem: (item: Omit<InventoryItem, 'id'>) => void
  setInventoryQuantity: (id: string, quantity: number) => void
  deleteInventoryItem: (id: string) => void
}

/** Re-derive generated tasks after plant data changes (US-204: dates recalculate immediately). */
function regenerate(state: Pick<GardenState, 'instances' | 'species' | 'garden' | 'tasks'>) {
  return mergeGeneratedTasks(state.tasks, generateTasks(state.instances, state.species, state.garden, today()))
}

function bedAt(beds: Bed[], x: number, y: number): Bed | undefined {
  return beds.find((b) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h)
}

/** Re-derive each placement's bed from geometry after beds change. */
function reassignBeds(placements: Placement[], beds: Bed[]): Placement[] {
  return placements.map((p) => ({ ...p, bedId: bedAt(beds, p.x, p.y)?.id }))
}

export const useGarden = create<GardenState>()((set) => ({
  ...buildEmptyState('My Garden'), // placeholder until a garden is hydrated

  updateGarden: (patch) => set((s) => ({ garden: { ...s.garden, ...patch } })),

  addBed: (bed) => {
    const id = uid('bed')
    set((s) => {
      const beds = [...s.beds, { ...bed, id }]
      return { beds, placements: reassignBeds(s.placements, beds) }
    })
    return id
  },

  updateBed: (id, patch) =>
    set((s) => {
      const beds = s.beds.map((b) => (b.id === id ? { ...b, ...patch } : b))
      return { beds, placements: reassignBeds(s.placements, beds) }
    }),

  deleteBed: (id) =>
    set((s) => {
      const beds = s.beds.filter((b) => b.id !== id)
      return { beds, placements: reassignBeds(s.placements, beds) }
    }),

  addPlant: (data) => {
    const id = uid('pi')
    set((s) => {
      const species = data.speciesId ? s.species.find((sp) => sp.id === data.speciesId) : undefined
      // Auto-disambiguate repeat plantings of the same species: "Hosta #2"
      let nickname = data.nickname
      if (!nickname && species) {
        const siblings = s.instances.filter((p) => p.speciesId === species.id && p.status === 'active').length
        if (siblings >= 1) nickname = `${species.commonName} #${siblings + 1}`
      }
      const instances = [...s.instances, { status: 'active' as const, overrides: {}, ...data, nickname, id }]
      let tasks = regenerate({ ...s, instances })
      // Recommended care tasks stored on the species become real tasks for this instance
      if (species?.taskTemplates?.length) {
        tasks = [
          ...tasks,
          ...tasksFromTemplates(id, species.taskTemplates, today()).map((t) => ({ ...t, id: uid('task') })),
        ]
      }
      return { instances, tasks }
    })
    return id
  },

  addSpecies: (data, source = 'user') => {
    const id = uid('sp')
    set((s) => ({ species: [...s.species, { ...data, id, source }] }))
    return id
  },

  updateInstance: (id, patch) =>
    set((s) => {
      const instances = s.instances.map((p) => (p.id === id ? { ...p, ...patch } : p))
      return { instances, tasks: regenerate({ ...s, instances }) }
    }),

  setOverride: (id, key, value) =>
    set((s) => {
      const instances = s.instances.map((p) =>
        p.id === id ? { ...p, overrides: { ...p.overrides, [key]: value } } : p,
      )
      return { instances, tasks: regenerate({ ...s, instances }) }
    }),

  clearOverride: (id, key) =>
    set((s) => {
      const instances = s.instances.map((p) => {
        if (p.id !== id) return p
        const overrides = { ...p.overrides }
        delete overrides[key]
        return { ...p, overrides }
      })
      return { instances, tasks: regenerate({ ...s, instances }) }
    }),

  setSeasonalColors: (id, colors) =>
    set((s) => ({
      instances: s.instances.map((p) => (p.id === id ? { ...p, seasonalColors: colors } : p)),
    })),

  archivePlant: (id, reason) =>
    set((s) => {
      const instances = s.instances.map((p) =>
        p.id === id
          ? { ...p, status: 'archived' as const, archiveReason: reason, archivedAt: today() }
          : p,
      )
      return {
        instances,
        placements: s.placements.filter((pl) => pl.instanceId !== id),
        tasks: regenerate({ ...s, instances }).filter(
          (task) => task.instanceId !== id || task.status !== 'open',
        ),
      }
    }),

  deletePlant: (id) =>
    set((s) => ({
      instances: s.instances.filter((p) => p.id !== id),
      placements: s.placements.filter((pl) => pl.instanceId !== id),
      tasks: s.tasks.filter((task) => task.instanceId !== id),
      journal: s.journal.filter((e) => e.instanceId !== id),
    })),

  placePlant: (instanceId, x, y) =>
    set((s) => ({
      placements: [
        ...s.placements.filter((p) => p.instanceId !== instanceId),
        { instanceId, x, y, bedId: bedAt(s.beds, x, y)?.id },
      ],
    })),

  removePlacement: (instanceId) =>
    set((s) => ({ placements: s.placements.filter((p) => p.instanceId !== instanceId) })),

  setTaskStatus: (id, status, snoozedTo) =>
    set((s) => {
      const current = s.tasks.find((t) => t.id === id)
      let tasks = s.tasks.map((task) =>
        task.id === id
          ? {
              ...task,
              status,
              snoozedTo: status === 'snoozed' ? snoozedTo : undefined,
              completedAt: status === 'done' ? today() : undefined,
            }
          : task,
      )
      // Completing a recurring task spawns its next occurrence (dismissing ends the series)
      if (status === 'done' && current && current.status !== 'done' && current.recurrence) {
        tasks = [
          ...tasks,
          {
            ...current,
            id: uid('task'),
            dueOn: nextDue(current.dueOn, current.recurrence),
            status: 'open',
            snoozedTo: undefined,
            completedAt: undefined,
          },
        ]
      }
      return { tasks }
    }),

  addCustomTask: (title, dueOn, instanceId, notes, recurrence) =>
    set((s) => ({
      tasks: [
        ...s.tasks,
        { id: uid('task'), kind: 'custom' as const, title, dueOn, instanceId, notes, status: 'open' as const, origin: 'user' as const, recurrence },
      ],
    })),

  addJournalEntry: (instanceId, body, tag, entryDate) =>
    set((s) => ({
      journal: [{ id: uid('je'), instanceId, body, tag, entryDate: entryDate ?? today() }, ...s.journal],
    })),

  addInventoryItem: (item) =>
    set((s) => ({ inventory: [...s.inventory, { ...item, id: uid('inv') }] })),

  setInventoryQuantity: (id, quantity) =>
    set((s) => ({
      inventory: s.inventory.map((it) => (it.id === id ? { ...it, quantity: Math.max(0, quantity) } : it)),
    })),

  deleteInventoryItem: (id) =>
    set((s) => ({ inventory: s.inventory.filter((it) => it.id !== id) })),
}))

// ==========================================================================
// Garden hydration & persistence (server or local driver)
// ==========================================================================

let driver: StorageDriver = localDriver
let syncGardenId: string | null = null
let hydrating = false
let saveTimer: ReturnType<typeof setTimeout> | undefined
let pendingSave = false

function pickData(s: GardenState): GardenData {
  const { garden, beds, species, instances, placements, tasks, journal, inventory, companionRules } = s
  return { garden, beds, species, instances, placements, tasks, journal, inventory, companionRules }
}

async function flushSave(keepalive = false) {
  if (!syncGardenId) return
  const id = syncGardenId
  pendingSave = false
  clearTimeout(saveTimer)
  const data = pickData(useGarden.getState())
  try {
    await driver.saveGarden(id, data, keepalive)
    useAuth.setState((s) => ({
      gardens: s.gardens.map((g) =>
        g.id === id ? { ...g, name: data.garden.name, updatedAt: new Date().toISOString() } : g,
      ),
    }))
  } catch (err) {
    console.error('GardenOS: saving garden failed', err)
  }
}

function hydrateGarden(id: string, data: GardenData) {
  hydrating = true
  syncGardenId = null
  clearTimeout(saveTimer)
  pendingSave = false
  // Refresh generated tasks for the current date on open
  const tasks = mergeGeneratedTasks(data.tasks, generateTasks(data.instances, data.species, data.garden, today()))
  useGarden.setState({ ...data, tasks })
  syncGardenId = id
  hydrating = false
}

useGarden.subscribe(() => {
  if (hydrating || !syncGardenId) return
  pendingSave = true
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => void flushSave(), 800)
})

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => {
    if (pendingSave) void flushSave(true)
  })
}

// ==========================================================================
// Auth + garden list
// ==========================================================================

interface AuthState {
  status: 'booting' | 'anon' | 'ready'
  mode: StorageMode
  user: User | null
  gardens: GardenMeta[]
  activeGardenId: string | null
  authError: string
  busy: boolean

  boot: () => Promise<void>
  login: (username: string, password: string) => Promise<void>
  register: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  selectGarden: (id: string) => Promise<void>
  closeGarden: () => void
  createGarden: (name: string, sample: boolean) => Promise<void>
  deleteGarden: (id: string) => Promise<void>
}

const activeKey = (mode: StorageMode) => `gardenos-active-${mode}`

export const useAuth = create<AuthState>()((set, get) => {
  async function enterAccount() {
    let gardens = await driver.listGardens()

    // One-time migration of the pre-multi-user single garden stored in this browser
    if (gardens.length === 0) {
      const legacy = readLegacyState()
      if (legacy) {
        const meta = await driver.createGarden(legacy.garden.name || 'My Garden', legacy)
        markLegacyMigrated()
        gardens = [meta]
      }
    }

    set({ gardens, status: 'ready', authError: '' })

    const storedActive = localStorage.getItem(activeKey(driver.mode))
    const target = gardens.find((g) => g.id === storedActive) ?? (gardens.length === 1 ? gardens[0] : null)
    if (target) await get().selectGarden(target.id)
  }

  return {
    status: 'booting',
    mode: 'local',
    user: null,
    gardens: [],
    activeGardenId: null,
    authError: '',
    busy: false,

    boot: async () => {
      const hasServer = await detectServer()
      driver = hasServer ? serverDriver : localDriver
      set({ mode: driver.mode })
      if (!hasServer) {
        await enterAccount()
        return
      }
      try {
        const { user } = await authApi.me()
        set({ user })
        await enterAccount()
      } catch {
        set({ status: 'anon' })
      }
    },

    login: async (username, password) => {
      set({ busy: true, authError: '' })
      try {
        const { user } = await authApi.login(username, password)
        set({ user, busy: false })
        await enterAccount()
      } catch (err) {
        set({ busy: false, authError: err instanceof ApiError ? err.message : 'Could not reach the server.' })
      }
    },

    register: async (username, password) => {
      set({ busy: true, authError: '' })
      try {
        const { user } = await authApi.register(username, password)
        set({ user, busy: false })
        await enterAccount()
      } catch (err) {
        set({ busy: false, authError: err instanceof ApiError ? err.message : 'Could not reach the server.' })
      }
    },

    logout: async () => {
      await flushSave()
      syncGardenId = null
      try {
        if (driver.mode === 'server') await authApi.logout()
      } catch {
        // logging out locally regardless
      }
      localStorage.removeItem(activeKey(driver.mode))
      set({ user: null, gardens: [], activeGardenId: null, status: driver.mode === 'server' ? 'anon' : 'ready' })
    },

    selectGarden: async (id) => {
      if (get().activeGardenId === id) return
      set({ busy: true })
      await flushSave() // don't lose edits to the garden we're leaving
      try {
        const { state } = await driver.getGarden(id)
        hydrateGarden(id, state)
        localStorage.setItem(activeKey(driver.mode), id)
        set({ activeGardenId: id, busy: false, authError: '' })
      } catch (err) {
        set({ busy: false, authError: err instanceof ApiError ? err.message : 'Could not load that garden.' })
      }
    },

    closeGarden: () => {
      void flushSave()
      syncGardenId = null
      localStorage.removeItem(activeKey(driver.mode))
      set({ activeGardenId: null })
    },

    createGarden: async (name, sample) => {
      set({ busy: true, authError: '' })
      try {
        const data = sample ? buildSeedState(name) : buildEmptyState(name)
        const meta = await driver.createGarden(data.garden.name, data)
        set((s) => ({ gardens: [...s.gardens, meta].sort((a, b) => a.name.localeCompare(b.name)), busy: false }))
        hydrateGarden(meta.id, data)
        localStorage.setItem(activeKey(driver.mode), meta.id)
        set({ activeGardenId: meta.id })
      } catch (err) {
        set({ busy: false, authError: err instanceof ApiError ? err.message : 'Could not create the garden.' })
      }
    },

    deleteGarden: async (id) => {
      if (get().activeGardenId === id) {
        syncGardenId = null
        localStorage.removeItem(activeKey(driver.mode))
        set({ activeGardenId: null })
      }
      await driver.deleteGarden(id)
      set((s) => ({ gardens: s.gardens.filter((g) => g.id !== id) }))
    },
  }
})
