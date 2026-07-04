import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  Bed,
  CompanionRule,
  Garden,
  InventoryItem,
  JournalEntry,
  JournalTag,
  Overrides,
  Placement,
  PlantInstance,
  PlantSpecies,
  Task,
  TaskStatus,
} from './lib/types'
import { today } from './lib/plant'
import { generateTasks, mergeGeneratedTasks } from './lib/taskEngine'
import {
  seedBeds,
  seedCompanionRules,
  seedCustomTasks,
  seedGarden,
  seedInstances,
  seedInventory,
  seedJournal,
  seedPlacements,
  seedSpecies,
} from './data/seed'

let idCounter = 0
export function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${(idCounter++).toString(36)}`
}

interface GardenState {
  garden: Garden
  beds: Bed[]
  species: PlantSpecies[]
  instances: PlantInstance[]
  placements: Placement[]
  tasks: Task[]
  journal: JournalEntry[]
  inventory: InventoryItem[]
  companionRules: CompanionRule[]

  updateGarden: (patch: Partial<Garden>) => void

  addPlant: (instance: Omit<PlantInstance, 'id' | 'status' | 'overrides'> & { overrides?: Overrides }) => string
  addSpecies: (species: Omit<PlantSpecies, 'id' | 'source'>) => string
  updateInstance: (id: string, patch: Partial<PlantInstance>) => void
  setOverride: (id: string, key: keyof Overrides, value: Overrides[keyof Overrides]) => void
  clearOverride: (id: string, key: keyof Overrides) => void
  archivePlant: (id: string, reason: string) => void
  deletePlant: (id: string) => void

  placePlant: (instanceId: string, x: number, y: number, bedId?: string) => void
  removePlacement: (instanceId: string) => void

  setTaskStatus: (id: string, status: TaskStatus, snoozedTo?: string) => void
  addCustomTask: (title: string, dueOn: string, instanceId?: string, notes?: string) => void

  addJournalEntry: (instanceId: string, body: string, tag?: JournalTag, entryDate?: string) => void

  addInventoryItem: (item: Omit<InventoryItem, 'id'>) => void
  setInventoryQuantity: (id: string, quantity: number) => void
  deleteInventoryItem: (id: string) => void
}

function initialTasks(): Task[] {
  return mergeGeneratedTasks(
    seedCustomTasks,
    generateTasks(seedInstances, seedSpecies, seedGarden, today()),
  )
}

/** Re-derive generated tasks after plant data changes (US-204: dates recalculate immediately). */
function regenerate(state: Pick<GardenState, 'instances' | 'species' | 'garden' | 'tasks'>): Task[] {
  return mergeGeneratedTasks(state.tasks, generateTasks(state.instances, state.species, state.garden, today()))
}

export const useGarden = create<GardenState>()(
  persist(
    (set) => ({
      garden: seedGarden,
      beds: seedBeds,
      species: seedSpecies,
      instances: seedInstances,
      placements: seedPlacements,
      tasks: initialTasks(),
      journal: seedJournal,
      inventory: seedInventory,
      companionRules: seedCompanionRules,

      updateGarden: (patch) => set((s) => ({ garden: { ...s.garden, ...patch } })),

      addPlant: (data) => {
        const id = uid('pi')
        set((s) => {
          const instances = [...s.instances, { status: 'active' as const, overrides: {}, ...data, id }]
          return { instances, tasks: regenerate({ ...s, instances }) }
        })
        return id
      },

      addSpecies: (data) => {
        const id = uid('sp')
        set((s) => ({ species: [...s.species, { ...data, id, source: 'user' }] }))
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

      placePlant: (instanceId, x, y, bedId) =>
        set((s) => ({
          placements: [
            ...s.placements.filter((p) => p.instanceId !== instanceId),
            { instanceId, x, y, bedId },
          ],
        })),

      removePlacement: (instanceId) =>
        set((s) => ({ placements: s.placements.filter((p) => p.instanceId !== instanceId) })),

      setTaskStatus: (id, status, snoozedTo) =>
        set((s) => ({
          tasks: s.tasks.map((task) =>
            task.id === id
              ? {
                  ...task,
                  status,
                  snoozedTo: status === 'snoozed' ? snoozedTo : undefined,
                  completedAt: status === 'done' ? today() : undefined,
                }
              : task,
          ),
        })),

      addCustomTask: (title, dueOn, instanceId, notes) =>
        set((s) => ({
          tasks: [
            ...s.tasks,
            { id: uid('task'), kind: 'custom', title, dueOn, instanceId, notes, status: 'open', origin: 'user' },
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
    }),
    { name: 'gardenos-v1' },
  ),
)
