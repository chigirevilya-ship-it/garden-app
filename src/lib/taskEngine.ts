import type { Garden, PlantInstance, PlantSpecies, Task } from './types'
import { addDays, dateFromDoy, daysBetween, isoDate, parseIso, resolvePlant } from './plant'

/**
 * Idempotent task projection (§6.2 of the system design): tasks derive from
 * effective plant data × calendar × garden frost dates. Each generated task
 * carries a deterministic genKey; re-running merges by key and never touches
 * rows the user has completed, dismissed, or snoozed.
 */
export function generateTasks(
  instances: PlantInstance[],
  species: PlantSpecies[],
  garden: Garden,
  todayIso: string,
  horizonDays = 90,
): Omit<Task, 'id'>[] {
  const year = parseIso(todayIso).getFullYear()
  const out: Omit<Task, 'id'>[] = []
  const speciesById = new Map(species.map((s) => [s.id, s]))

  const inHorizon = (due: string) =>
    daysBetween(todayIso, due) >= -60 && daysBetween(todayIso, due) <= horizonDays

  for (const instance of instances) {
    if (instance.status !== 'active') continue
    const plant = resolvePlant(instance, instance.speciesId ? speciesById.get(instance.speciesId) : undefined)

    for (const month of plant.pruneMonths ?? []) {
      for (const y of [year, year + 1]) {
        const due = isoDate(new Date(y, month - 1, 1))
        if (!inHorizon(due)) continue
        out.push({
          instanceId: instance.id,
          kind: 'prune',
          title: `Prune ${plant.displayName}`,
          dueOn: due,
          status: 'open',
          origin: 'generated',
          genKey: `${instance.id}:prune:${y}-${month}`,
        })
      }
    }

    if (plant.fertilizeIntervalWeeks && instance.plantedOn) {
      // next occurrence on the planted-on cadence, growing season only (Mar–Oct)
      let due = instance.plantedOn
      const step = plant.fertilizeIntervalWeeks * 7
      let n = 0
      while (daysBetween(todayIso, due) < 0 && n < 200) {
        due = addDays(due, step)
        n++
      }
      const m = parseIso(due).getMonth() + 1
      if (inHorizon(due) && m >= 3 && m <= 10) {
        out.push({
          instanceId: instance.id,
          kind: 'fertilize',
          title: `Fertilize ${plant.displayName}`,
          dueOn: due,
          status: 'open',
          origin: 'generated',
          genKey: `${instance.id}:fertilize:${due}`,
        })
      }
    }

    if (plant.frostTender) {
      const due = addDays(dateFromDoy(year, garden.firstFrostDoy), -7)
      if (inHorizon(due)) {
        out.push({
          instanceId: instance.id,
          kind: 'frost_protect',
          title: `Protect ${plant.displayName} before first frost`,
          dueOn: due,
          status: 'open',
          origin: 'generated',
          genKey: `${instance.id}:frost_protect:${year}`,
        })
      }
    }
  }
  return out
}

/**
 * Merge freshly generated tasks into the existing list. Existing rows keep
 * their status; open rows get date updates; user tasks are untouched.
 */
export function mergeGeneratedTasks(existing: Task[], generated: Omit<Task, 'id'>[]): Task[] {
  const byKey = new Map(existing.filter((task) => task.genKey).map((task) => [task.genKey!, task]))
  const merged: Task[] = existing.filter((task) => task.origin === 'user')

  for (const gen of generated) {
    const prior = byKey.get(gen.genKey!)
    if (prior) {
      merged.push(prior.status === 'open' ? { ...prior, dueOn: gen.dueOn, title: gen.title } : prior)
    } else {
      merged.push({ ...gen, id: `task-${gen.genKey}` })
    }
  }
  return merged
}

export type Urgency = 'overdue' | 'soon' | 'upcoming'

export function taskUrgency(task: Task, todayIso: string): Urgency {
  const effectiveDue = task.status === 'snoozed' && task.snoozedTo ? task.snoozedTo : task.dueOn
  const d = daysBetween(todayIso, effectiveDue)
  if (d < 0) return 'overdue'
  if (d <= 14) return 'soon'
  return 'upcoming'
}
